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
    monkeypatch.setattr(logs_mod, "_upsert_one",
                        lambda row, create=False: rows.append({**row, "_create": create}))
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


class Test1日の上限:
    """**無制限にはしない**（`main.MAX_RECORDS_PER_DAY`）。

    数を絞らないと、記録アプリではなく作業ログに寄っていく。
    """

    def _day(self, n):
        return [
            {"id": f"r{i}", "date": "2026-09-02", "created": f"{i}件目", "ai_response": ""}
            for i in range(n)
        ]

    def _post(self, payload):
        with main.app.test_request_context("/save", method="POST", json=payload):
            g.user_id = "u1"
            return main.save.__wrapped__()

    def test_上限まではつくれる(self, written, monkeypatch):
        monkeypatch.setattr(main, "load_logs",
                            lambda uid: self._day(main.MAX_RECORDS_PER_DAY - 1))
        out = self._post({"date": "2026-09-02", "created": "もう一件", "new": True, "defer_ai": True})
        assert not isinstance(out, tuple), "上限内なのに断られた"

    def test_上限を超えたら断る(self, written, monkeypatch):
        monkeypatch.setattr(main, "load_logs",
                            lambda uid: self._day(main.MAX_RECORDS_PER_DAY))
        body, status = self._post({"date": "2026-09-02", "created": "4件目", "new": True, "defer_ai": True})
        assert status == 409
        assert body.json["error"] == "too_many"
        assert not written, "断ったのに書いている"

    def test_書き換えは数に入らない(self, written, monkeypatch):
        # 上限に達していても、**既にある記録は直せる**
        logs = self._day(main.MAX_RECORDS_PER_DAY)
        monkeypatch.setattr(main, "load_logs", lambda uid: logs)
        out = self._post({"id": "r0", "date": "2026-09-02", "created": "直した", "defer_ai": True})
        assert not isinstance(out, tuple), "書き換えを断っている"
        assert written[0]["id"] == "r0"

    def test_別の日は数えない(self, written, monkeypatch):
        logs = self._day(main.MAX_RECORDS_PER_DAY)
        monkeypatch.setattr(main, "load_logs", lambda uid: logs)
        out = self._post({"date": "2026-09-03", "created": "翌日", "new": True, "defer_ai": True})
        assert not isinstance(out, tuple), "別の日まで止めている"


class Test新規かどうかの見分け:
    def test_newを送らなければ日付で上書きする(self, written, monkeypatch):
        """**古いビルドを落とさない。** id も new も知らずに送ってくる。"""
        logs = [{"id": "r0", "date": "2026-09-02", "created": "朝", "ai_response": ""}]
        monkeypatch.setattr(main, "load_logs", lambda uid: logs)

        with main.app.test_request_context(
            "/save", method="POST",
            json={"date": "2026-09-02", "created": "書き直した", "defer_ai": True},
        ):
            g.user_id = "u1"
            main.save.__wrapped__()

        assert written[0].get("id") == "r0", "2件目を作ってしまっている"

    def test_newを送れば2件目になる(self, written, monkeypatch):
        logs = [{"id": "r0", "date": "2026-09-02", "created": "朝", "ai_response": ""}]
        monkeypatch.setattr(main, "load_logs", lambda uid: logs)

        with main.app.test_request_context(
            "/save", method="POST",
            json={"date": "2026-09-02", "created": "夜", "new": True, "defer_ai": True},
        ):
            g.user_id = "u1"
            main.save.__wrapped__()

        # id を載せない＝挿入。**朝の記録を巻き込まない**
        assert "id" not in written[0]


class Test書き手そのものの分岐:
    """**`_upsert_one` を差し替えずに通す**（2026-09-03）。

    それまでの検査は `_upsert_one` を stub していたため、
    **本物の分岐を一度も通していなかった。**
    `/save` が「新規だ」と決めていても、`_upsert_one` は独自に
    日付で探し直して既存を上書きしていた。実機で朝の記録が消えた。

    判断が2か所にあると、片方だけ直したときにこうなる。
    """

    class _Fake:
        """Supabase の呼び出しの形だけ真似る。**繋がない。**

        `select().eq().execute()` も `update().eq().eq().execute()` も
        鎖で続くので、どの段でも自分を返す。
        """

        def __init__(self, store):
            self.store = store

        def table(self, name):
            return self

        def select(self, *a, **k):
            self.store["selected"] = True
            self.store["mode"] = "select"
            return self

        def insert(self, row):
            self.store["op"] = "insert"
            self.store["mode"] = "insert"
            return self

        def update(self, fields):
            self.store["op"] = "update"
            self.store["mode"] = "update"
            return self

        def eq(self, *a, **k):
            return self

        def execute(self):
            if self.store.get("mode") == "select":
                # 「同じ日に既にある」を返す
                return _Result([{"id": "existing"}])
            return _Result([{"id": "new-id"}])

    def _run(self, monkeypatch, row, create):
        store = {}
        monkeypatch.setattr(logs_mod, "supabase", self._Fake(store))
        logs_mod._upsert_one(row, create=create)
        return store

    def test_createなら日付を探さずに挿入する(self, monkeypatch):
        store = self._run(
            monkeypatch,
            {"date": "2026-09-03", "user_id": "u1", "content": "夜のこと"},
            create=True,
        )
        assert store.get("op") == "insert", "同じ日の既存を上書きしている"
        assert not store.get("selected"), "create なのに日付で探している"

    def test_createでなければ日付で探して上書きする(self, monkeypatch):
        # 古いビルドの経路。**1日1件のまま動くこと**
        store = self._run(
            monkeypatch,
            {"date": "2026-09-03", "user_id": "u1", "content": "書き直した"},
            create=False,
        )
        assert store.get("op") == "update"

    def test_idがあればcreateでも更新する(self, monkeypatch):
        # 既にある記録を直しているのに挿入すると、同じ内容が増える
        store = self._run(
            monkeypatch,
            {"id": "r1", "date": "2026-09-03", "user_id": "u1", "content": "直した"},
            create=True,
        )
        assert store.get("op") == "update"


class _Result:
    def __init__(self, data):
        self.data = data
