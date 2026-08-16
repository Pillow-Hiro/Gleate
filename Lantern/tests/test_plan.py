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
