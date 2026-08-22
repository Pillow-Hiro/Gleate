"""無料と有料の線（`modules/plan.py`）。

**ここを間違えると2方向に壊れる。**

- 緩すぎると、お金を払っていない人に有料の機能が通る
- 厳しすぎると、払った人が締め出される

後者の方が悪い。だから「読めないときは通す」を選んでいて、
その判断が事故ではなく意図であることを、ここで固定する。
"""

import os
import sys
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules import plan


def _db(rows):
    """`subscriptions` を1回読むぶんの偽物。"""
    db = MagicMock()
    chain = db.table.return_value.select.return_value.eq.return_value.limit.return_value
    chain.execute.return_value = MagicMock(data=rows)
    return db


def _raising_db():
    db = MagicMock()
    db.table.side_effect = Exception("relation does not exist")
    return db


class Test表が無いとき:
    def test_読めなければ有料として扱う(self):
        # **表の作成が遅れただけで、払った人を締め出さない。**
        # ただ乗りされるより悪い（modules/plan.py の冒頭）
        with patch.object(plan, "_db", return_value=_raising_db()):
            assert plan.is_paid("u1") is True

    def test_接続が無くても有料として扱う(self):
        with patch.object(plan, "_db", return_value=None):
            assert plan.is_paid("u1") is True

    def test_利用者が分からなければ有料として扱う(self):
        with patch.object(plan, "_db", return_value=_db([])):
            assert plan.is_paid("") is True
            assert plan.is_paid(None) is True


class Test行の読み取り:
    def test_行が無ければ無料(self):
        # 表はある。この人は買っていない
        with patch.object(plan, "_db", return_value=_db([])):
            assert plan.is_paid("u1") is False

    @pytest.mark.parametrize("status", ["active", "trialing", "in_grace_period"])
    def test_通す状態(self, status):
        with patch.object(plan, "_db", return_value=_db([{"status": status, "expires_at": None}])):
            assert plan.is_paid("u1") is True

    @pytest.mark.parametrize("status", ["expired", "canceled", "paused", "", None])
    def test_通さない状態(self, status):
        with patch.object(plan, "_db", return_value=_db([{"status": status, "expires_at": None}])):
            assert plan.is_paid("u1") is False

    def test_期限が切れていれば無料(self):
        rows = [{"status": "active", "expires_at": "2000-01-01T00:00:00+00:00"}]
        with patch.object(plan, "_db", return_value=_db(rows)):
            assert plan.is_paid("u1") is False

    def test_期限が先なら有料(self):
        rows = [{"status": "active", "expires_at": "2999-01-01T00:00:00+00:00"}]
        with patch.object(plan, "_db", return_value=_db(rows)):
            assert plan.is_paid("u1") is True

    def test_期限が空なら切れていない扱い(self):
        # 解約待ちの行に期限が入らない経路がある
        with patch.object(plan, "_db", return_value=_db([{"status": "active"}])):
            assert plan.is_paid("u1") is True


class Test上限:
    def test_無料の方が少ない(self):
        assert plan.FREE_DAILY_AI < plan.PAID_DAILY_AI

    def test_無料でもふつうの1日には届く(self):
        # 記録のAI・今日の灯り・節目・週次で4回。
        # **書き直すぶんの余裕**がなければ、書いている最中に灯りが消える
        assert plan.FREE_DAILY_AI >= 8

    def test_プランで上限が変わる(self):
        with patch.object(plan, "_db", return_value=_db([])):
            assert plan.daily_limit("u1") == plan.FREE_DAILY_AI
        rows = [{"status": "active", "expires_at": None}]
        with patch.object(plan, "_db", return_value=_db(rows)):
            assert plan.daily_limit("u1") == plan.PAID_DAILY_AI


class Test断り文はひとつ:
    def test_402の本文を手で組まない(self):
        """**断り文は `plan.PAID_REQUIRED_MESSAGE` だけ。**

        2026-08-19 まで `require_paid` と `main.py` の月次の振り返りに
        別々に書いてあった。2026-08-18 の言葉の精査で片方だけ直り、
        **もう片方が「プランに含まれています」のまま残っていた。**
        （無料の人が読むと「使える」に読める、意味の反転した文）

        同じ経路が無料と有料を兼ねているところ（週次／月次）は
        デコレータで分けられないので、手で組みたくなる。そこを塞ぐ。
        """
        import io as _io, os as _os

        root = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
        for name in ("main.py", _os.path.join("modules", "plan.py")):
            src = _io.open(_os.path.join(root, name), encoding="utf-8").read()
            # コメントの中の引用は許す。**コードとして組んでいる形だけ弾く**
            code = chr(10).join(l for l in src.splitlines()
                                if not l.strip().startswith("#"))
            assert '"error": "paid_required"' not in code or name.endswith("plan.py"), (
                f"{name} が 402 の本文を手で組んでいる。"
                "plan.paid_required_response() を使うこと"
            )
            assert "プランに含まれています" not in code, (
                f"{name} に古い断り文が残っている"
            )


class Test断り方:
    def test_煽らない(self):
        """**「今すぐ」「お得」「限定」の類を書かない。**

        断る画面は、いちばん煽りたくなる場所。
        機械に見張らせておく（`tests/test_ui_words.py` と同じ考え方）。
        """
        import inspect

        source = inspect.getsource(plan)
        for word in ("今すぐ", "お得", "限定", "見逃", "しましょう", "アップグレード"):
            assert word not in source, f"断り方に煽りが入っている: {word}"


class Test上限の置き場所:
    """**1日の上限は `plan.py` にしか無い。**

    2026-08-23 まで `ratelimit.py` が `DAILY_LIMIT = 60` を既定値として
    持っていた。呼ぶ側は必ず `plan.daily_limit()` を渡すので一度も
    使われていなかったが、数字だけが古いまま残り、`HANDOFF.md` にも
    「1日60回」と書き写されていた。**2か所に数字があると、
    片方だけ変えたときに気づけない。**
    """

    def test_ratelimit_は上限の既定値を持たない(self):
        import inspect
        from modules.ratelimit import check_and_count
        limit = inspect.signature(check_and_count).parameters["limit"]
        assert limit.default is inspect.Parameter.empty, (
            "ratelimit が上限の既定値を持っている。plan.py から渡すこと"
        )

    def test_ratelimit_に数字を書かない(self):
        import io
        import os
        src = io.open(
            os.path.join("modules", "ratelimit.py"), encoding="utf-8"
        ).read()
        # コメントを除いた本体に上限らしき定数が無いこと
        body = "\n".join(
            l for l in src.splitlines() if not l.lstrip().startswith("#")
        )
        assert "DAILY_LIMIT" not in body, "上限の定数が戻っている"
