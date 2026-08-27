"""記録の読み出しの区切り（2026-08-27）。

`load_logs` は全件を返し続けており、上限が無かった。
記録が数年ぶん溜まると、**起動のたびに全部を運ぶ。**
控え（`client/lib/logsCache.js`）が体感を隠すため、
遅くなっても気づけない種類の遅さになる。

ここで固定するのは3つ。

1. 引数を渡さなければ**今までどおり全件**（出回っているビルドが動く）
2. `limit` は**新しい方から**数える（古い方を切る）
3. 返す順番は引数によらず**日付の昇順**
"""

import pytest

import main
from modules import logs as logs_module


class _FakeQuery:
    def __init__(self, store):
        self.store = store
        self.note = {"eq": {}, "gt": None, "order": None, "desc": False, "limit": None}

    def eq(self, key, value):
        self.note["eq"][key] = value
        return self

    def gt(self, key, value):
        self.note["gt"] = (key, value)
        return self

    def order(self, key, desc=False):
        self.note["order"] = key
        self.note["desc"] = desc
        return self

    def limit(self, n):
        self.note["limit"] = n
        return self

    def execute(self):
        self.store["calls"].append(self.note)
        rows = list(self.store["rows"])
        if self.note["gt"]:
            _, value = self.note["gt"]
            rows = [r for r in rows if r.get("updated_at", "") > value]
        rows.sort(key=lambda r: r["date"], reverse=self.note["desc"])
        if self.note["limit"]:
            rows = rows[: self.note["limit"]]
        return type("R", (), {"data": rows})()


class _FakeTable:
    def __init__(self, store):
        self.store = store

    def select(self, *a, **k):
        return _FakeQuery(self.store)


class _FakeSupabase:
    def __init__(self, store):
        self.store = store

    def table(self, name):
        assert name == "logs"
        return _FakeTable(self.store)


def _row(date, updated_at):
    return {
        "date": date,
        "content": f"{date} のこと",
        "good_things": "",
        "struggles": "",
        "next_action": "",
        "lantern_message": "",
        "updated_at": updated_at,
        "favorite": False,
        "user_id": "u1",
    }


ROWS = [
    _row("2026-08-01", "2026-08-01T09:00:00Z"),
    _row("2026-08-02", "2026-08-02T09:00:00Z"),
    _row("2026-08-03", "2026-08-03T09:00:00Z"),
]


@pytest.fixture
def store(monkeypatch):
    s = {"rows": ROWS, "calls": []}
    monkeypatch.setattr(logs_module, "supabase", _FakeSupabase(s))
    return s


class Test区切り:
    def test_引数が無ければ全件(self, store):
        got = logs_module.load_logs("u1")
        assert [l["date"] for l in got] == ["2026-08-01", "2026-08-02", "2026-08-03"]
        # 出回っているビルドは素で呼ぶ。**絞りを付けない**
        assert store["calls"][0]["limit"] is None
        assert store["calls"][0]["gt"] is None

    def test_limitは新しい方から数える(self, store):
        got = logs_module.load_logs("u1", limit=2)
        # 古い 08-01 が落ちる。**今日が消える向きに切らない**
        assert [l["date"] for l in got] == ["2026-08-02", "2026-08-03"]

    def test_limitでも昇順で返す(self, store):
        got = logs_module.load_logs("u1", limit=3)
        dates = [l["date"] for l in got]
        assert dates == sorted(dates), "呼ぶ側が並べ直さずに済むこと"

    def test_sinceはそれより後だけ(self, store):
        got = logs_module.load_logs("u1", since="2026-08-01T09:00:00Z")
        # 同時刻は含めない。**もう手元にあるものを二度運ばない**
        assert [l["date"] for l in got] == ["2026-08-02", "2026-08-03"]

    def test_user_idは必ず絞る(self, store):
        logs_module.load_logs("u1", limit=1)
        assert store["calls"][0]["eq"]["user_id"] == "u1"


class Test経路の引数:
    """`/api/logs` の受け取り方。**黙って切り詰めない。**

    認証は `__wrapped__` で外す（`test_save_cost.py` と同じ手）。
    ここで見たいのは引数の解釈であって、認証ではない。
    """

    def _get(self, query=""):
        from flask import g

        with main.app.test_request_context(f"/api/logs{query}"):
            g.user_id = "u1"
            return main.get_logs_api.__wrapped__()

    @pytest.mark.parametrize("bad", ["0", "-1", "501", "abc", "1.5", "999999"])
    def test_おかしなlimitは断る(self, store, bad):
        # 黙って全件を返すと、受け取った側は要求が通ったと思う。
        # **足りないことに気づく場所が無くなる**
        _, status = self._get(f"?limit={bad}")
        assert status == 400, f"{bad} を通してしまった"
        assert not store["calls"], "断るなら DB を叩かない"

    @pytest.mark.parametrize("good", ["1", "2", "500"])
    def test_範囲内のlimitは通す(self, store, good):
        body = self._get(f"?limit={good}")
        # 400 なら (body, status) の組で返る
        assert not isinstance(body, tuple), f"{good} を断ってしまった"
        assert store["calls"][0]["limit"] == int(good)

    def test_引数が無ければ絞らない(self, store):
        self._get()
        assert store["calls"][0]["limit"] is None
        assert store["calls"][0]["gt"] is None

    def test_sinceはそのまま渡る(self, store):
        self._get("?since=2026-08-01T09%3A00%3A00Z")
        assert store["calls"][0]["gt"] == ("updated_at", "2026-08-01T09:00:00Z")

    def test_空のsinceは全件扱い(self, store):
        # `?since=` だけ付いた形。**空文字で絞ると何も返らない**
        self._get("?since=")
        assert store["calls"][0]["gt"] is None
