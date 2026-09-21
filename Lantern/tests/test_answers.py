# -*- coding: utf-8 -*-
"""`modules/answers.py` — 問いに答えた言葉。

**記録の項目（困ったこと）に混ぜない。**混ぜていた頃は、答えが
`modules/facts.py` につまずきとして数えられ、振り返りにも
「（困ったこと: …）」として渡っていた。
"""
import pytest

from modules import answers


class FakeQuery:
    def __init__(self, table, calls, rows, fail):
        self.table, self.calls, self.rows, self.fail = table, calls, rows, fail
        self.filters = {}

    def insert(self, row):
        self.calls.append(("insert", self.table, row))
        return self

    def select(self, *a, **kw):
        return self

    def eq(self, column, value):
        self.filters[column] = value
        return self

    def gte(self, column, value):
        self.filters[f"{column}>="] = value
        return self

    def order(self, *a, **kw):
        return self

    def limit(self, n):
        self.filters["limit"] = n
        return self

    def execute(self):
        if self.fail:
            raise RuntimeError("表が無い")
        self.calls.append(("execute", self.table, dict(self.filters)))
        return type("R", (), {"data": self.rows})()


class FakeDb:
    def __init__(self, rows=(), fail=False):
        self.calls, self.rows, self.fail = [], list(rows), fail

    def table(self, name):
        return FakeQuery(name, self.calls, self.rows, self.fail)


@pytest.fixture
def db(monkeypatch):
    fake = FakeDb()
    monkeypatch.setattr(answers, "_db", lambda: fake)
    return fake


def inserted(db):
    return next(c[2] for c in db.calls if c[0] == "insert")


class TestSaveAnswer:
    def test_問いと答えを残す(self, db):
        assert answers.save_answer("u1", "log-1", "2026-09-20", "その懐かしさは。", "映画を見たから") is True
        row = inserted(db)
        assert row["user_id"] == "u1" and row["log_id"] == "log-1"
        assert row["date"] == "2026-09-20" and row["kind"] == "hint"
        assert "映画を見たから" in row["answer"]

    # **困ったことの列には触れない**
    def test_記録の表に書かない(self, db):
        answers.save_answer("u1", "log-1", "2026-09-20", "問い。", "答え")
        assert {c[1] for c in db.calls} == {"log_answers"}

    def test_中身は暗号化して入れる(self, db, monkeypatch):
        monkeypatch.setattr(answers, "encrypt", lambda text, aad="": f"[{aad}]{text}")
        answers.save_answer("u1", "log-1", "2026-09-20", "問い。", "答え")
        row = inserted(db)
        assert row["answer"] == "[u1]答え" and row["question"] == "[u1]問い。"

    def test_知らない種類はhintにする(self, db):
        answers.save_answer("u1", "log-1", "2026-09-20", "問い。", "答え", kind="なにか")
        assert inserted(db)["kind"] == "hint"

    def test_見立てを選んだときはreading(self, db):
        answers.save_answer("u1", "log-1", "2026-09-20", "見立て", "選んだ方", kind="reading")
        assert inserted(db)["kind"] == "reading"

    # 記録に紐づかない答えも残す（記録を消せば道連れになる）
    def test_記録の番号が無くても残す(self, db):
        assert answers.save_answer("u1", "", "2026-09-20", "問い。", "答え") is True
        assert "log_id" not in inserted(db)

    @pytest.mark.parametrize("args", [
        ("", "log-1", "2026-09-20", "問い。", "答え"),
        ("u1", "log-1", "2026-09-20", "問い。", "   "),
        ("u1", "log-1", "", "問い。", "答え"),
    ])
    def test_足りなければ残さない(self, db, args):
        assert answers.save_answer(*args) is False
        assert db.calls == []

    # **表が無くても画面は止めない**
    def test_書けなければfalseを返す(self, monkeypatch):
        monkeypatch.setattr(answers, "_db", lambda: FakeDb(fail=True))
        assert answers.save_answer("u1", "log-1", "2026-09-20", "問い。", "答え") is False

    def test_DBが無ければfalse(self, monkeypatch):
        monkeypatch.setattr(answers, "_db", lambda: None)
        assert answers.save_answer("u1", "log-1", "2026-09-20", "問い。", "答え") is False


class TestLoadAnswers:
    def rows(self):
        return [{"id": 1, "user_id": "u1", "log_id": "log-1", "date": "2026-09-20",
                 "kind": "hint", "question": "問い。", "answer": "答え",
                 "created_at": "2026-09-20T12:00:00+00:00"}]

    def test_その人の答えを返す(self, monkeypatch):
        fake = FakeDb(rows=self.rows())
        monkeypatch.setattr(answers, "_db", lambda: fake)
        got = answers.load_answers("u1")
        assert got[0]["answer"] == "答え" and got[0]["log_id"] == "log-1"
        assert [c[2] for c in fake.calls if c[0] == "execute"][0]["user_id"] == "u1"

    def test_期間で絞れる(self, monkeypatch):
        fake = FakeDb(rows=self.rows())
        monkeypatch.setattr(answers, "_db", lambda: fake)
        answers.load_answers("u1", since="2026-09-01")
        assert [c[2] for c in fake.calls if c[0] == "execute"][0]["date>="] == "2026-09-01"

    def test_復号して返す(self, monkeypatch):
        fake = FakeDb(rows=self.rows())
        monkeypatch.setattr(answers, "_db", lambda: fake)
        monkeypatch.setattr(answers, "decrypt", lambda value, aad="": f"{value}/{aad}")
        assert answers.load_answers("u1")[0]["answer"] == "答え/u1"

    def test_読めなければ空(self, monkeypatch):
        monkeypatch.setattr(answers, "_db", lambda: FakeDb(fail=True))
        assert answers.load_answers("u1") == []

    def test_user_idが無ければ空(self, monkeypatch):
        monkeypatch.setattr(answers, "_db", lambda: FakeDb(rows=self.rows()))
        assert answers.load_answers("") == []


class TestRoutes:
    def test_答えの経路がある(self):
        from main import app

        # 同じパスに2つのルールがあるので、方法はまとめて見る
        methods = set()
        for rule in app.url_map.iter_rules():
            if str(rule) == "/api/answers":
                methods |= set(rule.methods)
        assert {"GET", "POST"} <= methods

    # 退会したら答えも消える
    def test_退会の削除対象に入っている(self):
        from modules.account import USER_TABLES

        assert "log_answers" in USER_TABLES
