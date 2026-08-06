"""modules/ideas.py のテスト。

アイデアは「溜めて後で拾うもの」であって、達成すべきタスクではない。
そのため done ではなく picked_at を持つ。
未完了を負債に見せる作りにしない（CLAUDE.md「習慣化」の定義に従う）。
"""

import pytest

from modules import ideas


class _FakeQuery:
    def __init__(self, store, op, payload=None):
        self.store = store
        self.op = op
        self.payload = payload
        self.filters = {}

    def eq(self, key, value):
        self.filters[key] = value
        return self

    def order(self, *a, **k):
        return self

    def limit(self, *a, **k):
        return self

    def execute(self):
        self.store["calls"].append({"op": self.op, "payload": self.payload, "filters": self.filters})
        return type("R", (), {"data": self.store.get("rows", [])})()


class _FakeTable:
    def __init__(self, store):
        self.store = store

    def select(self, *a, **k):
        return _FakeQuery(self.store, "select")

    def insert(self, payload):
        return _FakeQuery(self.store, "insert", payload)

    def update(self, payload):
        return _FakeQuery(self.store, "update", payload)

    def delete(self):
        return _FakeQuery(self.store, "delete")


class _FakeDb:
    def __init__(self, store):
        self.store = store

    def table(self, name):
        self.store["table"] = name
        return _FakeTable(self.store)


@pytest.fixture
def store(monkeypatch):
    s = {"calls": [], "rows": []}
    monkeypatch.setattr(ideas, "_db", lambda: _FakeDb(s))
    return s


class TestAdd:
    def test_本文を保存する(self, store):
        ideas.add_idea("u1", "あの色を試したい")
        call = store["calls"][0]
        assert call["op"] == "insert"
        assert call["payload"]["text"] == "あの色を試したい"
        assert call["payload"]["user_id"] == "u1"

    def test_前後の空白を落とす(self, store):
        ideas.add_idea("u1", "  余白のある構成  ")
        assert store["calls"][0]["payload"]["text"] == "余白のある構成"

    @pytest.mark.parametrize("bad", ["", "   ", "\n", None])
    def test_空なら保存しない(self, store, bad):
        assert ideas.add_idea("u1", bad) is False
        assert store["calls"] == []

    def test_picked_atは入れない(self, store):
        # 追加した時点では拾われていない
        ideas.add_idea("u1", "x")
        assert "picked_at" not in store["calls"][0]["payload"]

    def test_長すぎる本文は切り詰める(self, store):
        ideas.add_idea("u1", "あ" * 500)
        assert len(store["calls"][0]["payload"]["text"]) == ideas.MAX_LENGTH


class TestPick:
    def test_拾うとpicked_atが入る(self, store):
        ideas.set_picked("u1", 42, True)
        call = store["calls"][0]
        assert call["op"] == "update"
        assert call["payload"]["picked_at"] is not None
        assert call["filters"]["id"] == 42
        assert call["filters"]["user_id"] == "u1"

    def test_戻すとpicked_atがnullになる(self, store):
        ideas.set_picked("u1", 42, False)
        assert store["calls"][0]["payload"]["picked_at"] is None

    def test_必ずuser_idで絞る(self, store):
        # 絞り漏れは他人のアイデアを書き換える経路になる
        ideas.set_picked("u1", 42, True)
        assert store["calls"][0]["filters"]["user_id"] == "u1"


class TestDelete:
    def test_user_idとidで絞って消す(self, store):
        ideas.delete_idea("u1", 7)
        call = store["calls"][0]
        assert call["op"] == "delete"
        assert call["filters"] == {"id": 7, "user_id": "u1"}


class TestLoad:
    def test_ideasテーブルを見る(self, store):
        ideas.load_ideas("u1")
        assert store["table"] == "ideas"

    def test_user_idで絞る(self, store):
        ideas.load_ideas("u1")
        assert store["calls"][0]["filters"]["user_id"] == "u1"

    def test_DBが無ければ空リスト(self, monkeypatch):
        monkeypatch.setattr(ideas, "_db", lambda: None)
        assert ideas.load_ideas("u1") == []
