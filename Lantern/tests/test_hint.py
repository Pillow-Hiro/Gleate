"""手がかり（2026-09-02）。

ここで固定するのは4つ。

1. **分岐はコードで決める。**「困ったこと」が空なら問い、あれば手がかり
2. **表が無ければ通す**（`hint_usage` は人の手で流す）
3. **問いだけを返したときも数える。** 数えないと、材料の無い人が
   何度でも AI を呼べる
4. **枠を使い切ったら断る。** ただし有料なら通す
"""

import pytest
from flask import g

import main
from modules import hintusage
from modules.plan import FREE_HINTS


ENTRY_THIN = {"date": "2026-09-02", "created": "読書", "struggled": "", "next": ""}
ENTRY_RICH = {"date": "2026-09-02", "created": "要件定義", "struggled": "決めきれない", "next": ""}


@pytest.fixture
def stub(monkeypatch):
    """AI と DB を止める。**見たいのは分岐と数え方だけ。**"""
    seen = {"hint": 0, "question": 0, "recorded": 0}

    monkeypatch.setattr(main, "generate_hint",
                        lambda *a: seen.__setitem__("hint", seen["hint"] + 1) or "手がかり")
    monkeypatch.setattr(main, "generate_hint_question",
                        lambda *a: seen.__setitem__("question", seen["question"] + 1) or "問い")
    monkeypatch.setattr(main, "record_use",
                        lambda uid: seen.__setitem__("recorded", seen["recorded"] + 1))
    monkeypatch.setattr(main, "spend_ai_budget", lambda uid: True)
    monkeypatch.setattr(main, "has_free_left", lambda uid: True)
    monkeypatch.setattr(main, "is_paid", lambda uid: False)
    return seen


def _call(entry, extra=None):
    logs = [entry] + (extra or [])
    with main.app.test_request_context("/api/hint", method="POST", json={"date": entry["date"]}):
        g.user_id = "u1"
        return main.make_hint.__wrapped__.__wrapped__()


class Test分岐:
    def test_困ったことが空なら問い(self, stub, monkeypatch):
        monkeypatch.setattr(main, "load_logs", lambda uid: [ENTRY_THIN])
        body = _call(ENTRY_THIN)
        assert body.json["kind"] == "question"
        assert stub["hint"] == 0, "材料が無いのに手がかりを探している"

    def test_困ったことがあれば手がかり(self, stub, monkeypatch):
        monkeypatch.setattr(main, "load_logs", lambda uid: [ENTRY_RICH])
        body = _call(ENTRY_RICH)
        assert body.json["kind"] == "hint"
        assert stub["question"] == 0

    def test_空白だけなら空とみなす(self, stub, monkeypatch):
        entry = dict(ENTRY_RICH, struggled="   \n  ")
        monkeypatch.setattr(main, "load_logs", lambda uid: [entry])
        assert _call(entry).json["kind"] == "question"

    def test_記録が無ければ404(self, stub, monkeypatch):
        monkeypatch.setattr(main, "load_logs", lambda uid: [])
        body, status = _call(ENTRY_THIN)
        assert status == 404


class Test数える:
    def test_手がかりを数える(self, stub, monkeypatch):
        monkeypatch.setattr(main, "load_logs", lambda uid: [ENTRY_RICH])
        _call(ENTRY_RICH)
        assert stub["recorded"] == 1

    def test_問いだけでも数える(self, stub, monkeypatch):
        # **数えないと、材料の無い人が何度でも AI を呼べる**
        monkeypatch.setattr(main, "load_logs", lambda uid: [ENTRY_THIN])
        _call(ENTRY_THIN)
        assert stub["recorded"] == 1


class Test枠:
    def test_使い切ったら断る(self, stub, monkeypatch):
        monkeypatch.setattr(main, "load_logs", lambda uid: [ENTRY_THIN])
        monkeypatch.setattr(main, "has_free_left", lambda uid: False)
        body, status = _call(ENTRY_THIN)
        assert status == 402, "ペイウォールを出すための番号"
        assert stub["recorded"] == 0, "断ったのに数えている"

    def test_有料なら枠を使い切っても通る(self, stub, monkeypatch):
        monkeypatch.setattr(main, "load_logs", lambda uid: [ENTRY_THIN])
        monkeypatch.setattr(main, "has_free_left", lambda uid: False)
        monkeypatch.setattr(main, "is_paid", lambda uid: True)
        assert _call(ENTRY_THIN).json["kind"] == "question"

    def test_1日の上限にかかったら断る(self, stub, monkeypatch):
        # 通算の枠とは別。**役割が違うので混ぜない**
        monkeypatch.setattr(main, "load_logs", lambda uid: [ENTRY_THIN])
        monkeypatch.setattr(main, "spend_ai_budget", lambda uid: False)
        body, status = _call(ENTRY_THIN)
        assert status == 429


class Test数え方:
    def test_表が無ければ無料の範囲として扱う(self, monkeypatch):
        # 配備が先に済んでも、機能が丸ごと死なない
        class _Broken:
            def table(self, *a):
                raise RuntimeError("relation does not exist")

        monkeypatch.setattr("modules.logs.supabase", _Broken())
        assert hintusage.used_count("u1") == 0
        assert hintusage.has_free_left("u1") is True

    def test_残りは回数で決まる(self, monkeypatch):
        monkeypatch.setattr(hintusage, "used_count", lambda uid: FREE_HINTS - 1)
        assert hintusage.has_free_left("u1") is True
        monkeypatch.setattr(hintusage, "used_count", lambda uid: FREE_HINTS)
        assert hintusage.has_free_left("u1") is False

    def test_数え損ねても止めない(self, monkeypatch):
        # ここで投げると、手がかりが出た直後に画面が失敗する
        class _Broken:
            def table(self, *a):
                raise RuntimeError("insert failed")

        monkeypatch.setattr("modules.logs.supabase", _Broken())
        hintusage.record_use("u1")  # 例外が出ないこと
