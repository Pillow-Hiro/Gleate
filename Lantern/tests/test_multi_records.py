"""1日に複数件を置く — 段1（サーバー・2026-09-02）。

同一性を `date` から `id` へ移す。日付は「いつ書いたか」に戻る。

**この段では画面は変わらない。** 2件目を作る導線がまだ無く、
`id` を送ってくるクライアントもまだ無い。ここで固定するのは2つ。

1. **`id` を送れば、その行を書き換える**（複数件の土台）
2. **送らなければ今までどおり**（出回っているビルドが壊れない）

2 を落とすと、いま App Store にあるアプリが記録を保存できなくなる。
"""

import pytest
from flask import g

import main
from modules import logs as logs_mod


@pytest.fixture
def written(monkeypatch):
    """`_upsert_one` に渡った行を控える。DB には繋がない。"""
    rows = []
    monkeypatch.setattr(logs_mod, "supabase", object())
    monkeypatch.setattr(logs_mod, "_upsert_one", lambda row: rows.append(row))
    monkeypatch.setattr(main, "get_ai_response", lambda *a, **k: "灯り")
    monkeypatch.setattr(main, "load_goals", lambda: {})
    return rows


class Test書き先の決まり方:
    def test_idを送ればその記録を書き換える(self, written, monkeypatch):
        logs = [
            {"id": "a", "date": "2026-09-02", "created": "朝のこと", "ai_response": "朝の灯り"},
            {"id": "b", "date": "2026-09-02", "created": "夜のこと", "ai_response": "夜の灯り"},
        ]
        monkeypatch.setattr(main, "load_logs", lambda uid: list(logs))

        with main.app.test_request_context(
            "/save", method="POST",
            json={"id": "b", "date": "2026-09-02", "created": "夜のこと（直した）", "defer_ai": True},
        ):
            g.user_id = "u1"
            main.save.__wrapped__()

        # **同じ日の別の記録を巻き込まない**
        assert [r.get("id") for r in written] == ["b"]

    def test_idを送らなければ日付で探す(self, written, monkeypatch):
        # 出回っているビルドは id を知らない。**1日1件のまま動くこと**
        logs = [{"id": "a", "date": "2026-09-02", "created": "朝のこと", "ai_response": "朝の灯り"}]
        monkeypatch.setattr(main, "load_logs", lambda uid: list(logs))

        with main.app.test_request_context(
            "/save", method="POST",
            json={"date": "2026-09-02", "created": "書き直した", "defer_ai": True},
        ):
            g.user_id = "u1"
            main.save.__wrapped__()

        assert written[0].get("id") == "a", "日付で見つけた記録を書き換えていない"

    def test_新しい記録にはidを載せない(self, written, monkeypatch):
        # DB が採番する。**空文字を載せると挿入が落ちる**
        monkeypatch.setattr(main, "load_logs", lambda uid: [])

        with main.app.test_request_context(
            "/save", method="POST",
            json={"date": "2026-09-02", "created": "はじめて書いた", "defer_ai": True},
        ):
            g.user_id = "u1"
            main.save.__wrapped__()

        assert "id" not in written[0]


class Test灯りと手がかりの引き先:
    def _logs(self):
        return [
            {"id": "a", "date": "2026-09-02", "created": "朝", "struggled": "", "ai_response": ""},
            {"id": "b", "date": "2026-09-02", "created": "夜", "struggled": "詰まった", "ai_response": ""},
        ]

    def test_灯りはidで引く(self, monkeypatch):
        monkeypatch.setattr(main, "load_logs", lambda uid: self._logs())
        monkeypatch.setattr(main, "spend_ai_budget", lambda uid: False)  # AI を呼ばずに戻す

        with main.app.test_request_context("/api/light", method="POST",
                                           json={"id": "b", "date": "2026-09-02"}):
            g.user_id = "u1"
            body = main.make_light.__wrapped__()
        # 見つかっていれば 404 にならない
        assert not isinstance(body, tuple)

    def test_手がかりはidで引く(self, monkeypatch):
        monkeypatch.setattr(main, "load_logs", lambda uid: self._logs())
        monkeypatch.setattr(main, "has_free_left", lambda uid: True)
        monkeypatch.setattr(main, "spend_ai_budget", lambda uid: True)
        monkeypatch.setattr(main, "record_use", lambda uid: None)
        monkeypatch.setattr(main, "generate_hint", lambda *a: "手がかり")
        monkeypatch.setattr(main, "generate_hint_question", lambda *a: "問い")

        with main.app.test_request_context("/api/hint", method="POST",
                                           json={"id": "b", "date": "2026-09-02"}):
            g.user_id = "u1"
            body = main.make_hint.__wrapped__.__wrapped__()

        # b は「困ったこと」を持つので手がかり側。**a を見ていたら問いになる**
        assert body.json["kind"] == "hint"

    def test_idが無ければ日付で引く(self, monkeypatch):
        monkeypatch.setattr(main, "load_logs", lambda uid: self._logs())
        monkeypatch.setattr(main, "has_free_left", lambda uid: True)
        monkeypatch.setattr(main, "spend_ai_budget", lambda uid: True)
        monkeypatch.setattr(main, "record_use", lambda uid: None)
        monkeypatch.setattr(main, "generate_hint", lambda *a: "手がかり")
        monkeypatch.setattr(main, "generate_hint_question", lambda *a: "問い")

        with main.app.test_request_context("/api/hint", method="POST",
                                           json={"date": "2026-09-02"}):
            g.user_id = "u1"
            body = main.make_hint.__wrapped__.__wrapped__()

        # 日付で最初に見つかるのは a（困ったことが空）
        assert body.json["kind"] == "question"


class Test他人の行を触らない:
    def test_idで更新するときもuser_idで絞る(self, monkeypatch):
        """**id を知っていれば他人の記録を書き換えられる、を防ぐ。**

        id は uuid だが、推測できないことを安全の根拠にしない。
        """
        import inspect

        src = inspect.getsource(logs_mod._upsert_one)
        head = src.split('if row_id:', 1)[1].split('return', 1)[0]
        assert '.eq("user_id", user_id)' in head, "id での更新に user_id の絞りが無い"
