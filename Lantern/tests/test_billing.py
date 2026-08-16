"""RevenueCat からの知らせの受け口（`modules/billing.py`）。

**ここは「言うだけで有料になる」を防ぐ最後の壁。**
端末が何を言ってきても、有料になるのはこの経路を通ったときだけ。
"""

import os
import sys
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules import billing, plan
from main import app


def _event(type_, **extra):
    payload = {"event": {"type": type_, "app_user_id": "u1", **extra}}
    return payload


class Test認証:
    def test_秘密が未設定なら誰も通さない(self):
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("REVENUECAT_WEBHOOK_SECRET", None)
            assert billing.authorized("") is False
            assert billing.authorized("なんでも") is False

    def test_一致すれば通す(self):
        with patch.dict(os.environ, {"REVENUECAT_WEBHOOK_SECRET": "s3cret"}):
            assert billing.authorized("s3cret") is True
            assert billing.authorized("s3cre") is False
            assert billing.authorized("") is False

    def test_未設定なら受け口ごと閉じる(self):
        # 既定値を持たせない。**設定を忘れたまま誰でも書ける口を開けない**
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("REVENUECAT_WEBHOOK_SECRET", None)
            res = app.test_client().post("/api/billing/revenuecat", json={})
            assert res.status_code == 503

    def test_合わなければ401(self):
        with patch.dict(os.environ, {"REVENUECAT_WEBHOOK_SECRET": "s3cret"}):
            res = app.test_client().post(
                "/api/billing/revenuecat",
                json=_event("INITIAL_PURCHASE"),
                headers={"Authorization": "ちがう"},
            )
            assert res.status_code == 401


class Test種別の解釈:
    @pytest.mark.parametrize("type_", [
        "INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION",
        "NON_RENEWING_PURCHASE", "SUBSCRIPTION_EXTENDED", "TRIAL_CONVERTED",
    ])
    def test_有料になる(self, type_):
        row = billing.parse_event(_event(type_))
        assert row["status"] == "active"
        assert plan.ACTIVE_STATUSES.count(row["status"]) == 1

    def test_お試しは有料として扱う(self):
        assert billing.parse_event(_event("TRIAL_STARTED"))["status"] == "trialing"

    def test_解約を押しただけでは切らない(self):
        # 期限まではまだ使える。切るのは EXPIRATION が来たとき
        assert billing.parse_event(_event("CANCELLATION"))["status"] == "active"

    def test_決済の失敗は猶予にする(self):
        row = billing.parse_event(_event("BILLING_ISSUE"))
        assert row["status"] == "in_grace_period"
        assert billing.is_active_status(row["status"]) is True

    @pytest.mark.parametrize("type_", ["EXPIRATION", "TRIAL_CANCELLED", "REFUND"])
    def test_無料に戻す(self, type_):
        row = billing.parse_event(_event(type_))
        assert row["status"] == "expired"
        assert billing.is_active_status(row["status"]) is False

    def test_知らない種別は触らない(self):
        # 増えたときに勝手な解釈で権利を消さない
        assert billing.parse_event(_event("SOMETHING_NEW")) is None


class Test形の検査:
    @pytest.mark.parametrize("payload", [None, "", [], {}, {"event": "x"}, {"event": {}}])
    def test_分からない形は書かない(self, payload):
        assert billing.parse_event(payload) is None

    def test_利用者が分からなければ書かない(self):
        assert billing.parse_event({"event": {"type": "RENEWAL"}}) is None

    def test_期限を時刻に直す(self):
        row = billing.parse_event(_event("RENEWAL", expiration_at_ms=1800000000000))
        assert row["expires_at"].startswith("2027-01-15")

    @pytest.mark.parametrize("bad", [None, 0, -1, "いつか"])
    def test_期限が無くても落ちない(self, bad):
        row = billing.parse_event(_event("RENEWAL", expiration_at_ms=bad))
        assert row["expires_at"] is None


class Test書き込み:
    def test_知らない種別でも2xxを返す(self):
        # 再送されても同じなので、受け取ったことにする
        ok, detail = billing.apply_event(_event("SOMETHING_NEW"))
        assert ok is True
        assert detail == "ignored"

    def test_書けなければ失敗を返す(self):
        # 2xx 以外を返すと RevenueCat が再送する。**握りつぶさない**
        db = MagicMock()
        db.table.side_effect = Exception("boom")
        with patch.object(billing, "_db", return_value=db):
            ok, detail = billing.apply_event(_event("RENEWAL"))
        assert ok is False
        assert detail == "write_failed"

    def test_upsertで書く(self):
        # 同じ知らせが2回来ても構わない作りであること
        db = MagicMock()
        with patch.object(billing, "_db", return_value=db):
            ok, _ = billing.apply_event(_event("RENEWAL"))
        assert ok is True
        db.table.assert_called_once_with("subscriptions")
        args, kwargs = db.table.return_value.upsert.call_args
        assert kwargs.get("on_conflict") == "user_id"
        assert args[0]["user_id"] == "u1"


class Test判定の共有:
    def test_状態の定義が1か所にある(self):
        """`plan` と `billing` で別々に持たない。

        片方だけ足すと「買ったのに使えない」「解約したのに使える」が起きる。
        """
        import inspect

        source = inspect.getsource(billing)
        # billing の中でタプルを再定義していないこと
        assert '("active", "trialing"' not in source
        assert "ACTIVE_STATUSES" in source
