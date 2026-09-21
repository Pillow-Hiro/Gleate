"""アカウント削除の検査。

**取り返しがつかない処理なので、境界を全部固定する。**

とくに危ないのは2つ。

1. `.eq("user_id", ...)` を落とすと全員の記録が消える
2. 認証の利用者を先に消すと、残った行を誰も辿れなくなる
   （`user_id` でしか引けないため）
"""

import ast
import io
import os

import pytest

from modules import account

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
USER = "abc-123"

# 利用者に紐づかない表。削除の対象外でよい。
#
# goals は `.eq("id", 1)` で引く単一行で、user_id を持たない。
# そもそも DB に実在せず、load_goals() は毎回失敗を握り潰している。
# 目標設定機能は REQUIREMENTS.md の「やらないこと」に入っているため、
# コードごと消せる。ただし ai.py の引数を変える必要があるので別作業にした。
NOT_PER_USER = {"goals"}


class FakeQuery:
    def __init__(self, table, calls, fail_on):
        self.table = table
        self.calls = calls
        self.fail_on = fail_on
        self.filters = {}

    def delete(self):
        self.calls.append(("delete", self.table))
        return self

    def eq(self, column, value):
        self.filters[column] = value
        return self

    def execute(self):
        if self.table in self.fail_on:
            raise RuntimeError(f"{self.table} が落ちた")
        self.calls.append(("execute", self.table, dict(self.filters)))
        return {}


class FakeAdmin:
    def __init__(self, calls, fail):
        self.calls = calls
        self.fail = fail

    def delete_user(self, user_id):
        if self.fail:
            raise RuntimeError("認証の削除が落ちた")
        self.calls.append(("auth_delete", user_id))


class FakeDb:
    def __init__(self, fail_on=(), fail_auth=False):
        self.calls = []
        self.fail_on = set(fail_on)
        self.auth = type("A", (), {})()
        self.auth.admin = FakeAdmin(self.calls, fail_auth)

    def table(self, name):
        return FakeQuery(name, self.calls, self.fail_on)


def executed(db):
    return [c for c in db.calls if c[0] == "execute"]


class TestDeleteUserRows:
    def test_全部の表を消す(self):
        db = FakeDb()
        deleted, failed = account.delete_user_rows(USER, db)
        assert set(deleted) == set(account.USER_TABLES)
        assert failed == []

    def test_必ずuser_idで絞る(self):
        # ここが抜けると全員の記録が消える
        db = FakeDb()
        account.delete_user_rows(USER, db)
        for call in executed(db):
            assert call[2] == {"user_id": USER}, f"{call[1]} が絞れていない: {call[2]}"

    def test_表を1つも取りこぼさない(self):
        db = FakeDb()
        account.delete_user_rows(USER, db)
        assert {c[1] for c in executed(db)} == set(account.USER_TABLES)

    def test_1つ落ちても残りは試す(self):
        # 途中で止めると、どこまで消えたのか分からなくなる
        db = FakeDb(fail_on=["ideas"])
        deleted, failed = account.delete_user_rows(USER, db)
        assert "ideas" not in deleted
        assert [t for t, _ in failed] == ["ideas"]
        assert len(deleted) == len(account.USER_TABLES) - 1

    def test_user_idが空なら投げる(self):
        # 空で呼ぶと、絞り込みの無い削除に化ける
        for bad in ("", None):
            with pytest.raises(ValueError):
                account.delete_user_rows(bad, FakeDb())


class TestDeleteAccount:
    def test_記録を消してから認証を消す(self):
        db = FakeDb()
        ok, detail = account.delete_account(USER, db)
        assert ok is True
        assert detail["auth_deleted"] is True

        order = [c[0] for c in db.calls]
        assert order[-1] == "auth_delete", "認証の削除が最後になっていない"
        assert "execute" in order[:-1]

    def test_行の削除に失敗したら認証を消さない(self):
        # 先に認証を消すと、残った行を誰も辿れなくなる
        db = FakeDb(fail_on=["logs"])
        ok, detail = account.delete_account(USER, db)
        assert ok is False
        assert detail["auth_deleted"] is False
        assert not [c for c in db.calls if c[0] == "auth_delete"]

    def test_認証の削除に失敗しても例外を投げない(self):
        db = FakeDb(fail_auth=True)
        ok, detail = account.delete_account(USER, db)
        assert ok is False
        assert detail["auth_deleted"] is False
        assert [t for t, _ in detail["failed"]] == ["auth"]

    def test_認証だけ残った状態からやり直せる(self):
        # 行はもう無い。2回目で認証だけ消えればよい
        db = FakeDb()
        ok, _ = account.delete_account(USER, db)
        assert ok is True

    def test_user_idが空なら投げる(self):
        with pytest.raises(ValueError):
            account.delete_account("", FakeDb())


class TestTableList:
    def test_利用者の表を網羅している(self):
        """user_id を持つ表が増えたら、ここに足し忘れていないか気づく。

        消し漏れは「退会したのに記録が残る」形で現れる。
        画面には出ないので、気づく手段がこれしかない。
        """
        used = set()
        for name in ("logs.py", "answers.py", "ideas.py", "twitch.py", "youtube.py"):
            text = io.open(os.path.join(ROOT, "modules", name), encoding="utf-8").read()
            for node in ast.walk(ast.parse(text)):
                if (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
                        and node.func.attr == "table" and node.args
                        and isinstance(node.args[0], ast.Constant)):
                    used.add(node.args[0].value)

        missing = used - set(account.USER_TABLES) - NOT_PER_USER
        assert not missing, (
            f"コードが使っているのに削除対象に無い表: {sorted(missing)}。"
            "利用者に紐づかない表なら NOT_PER_USER に理由つきで足すこと"
        )


class TestRouteExists:
    def test_アカウント削除のルートがある(self):
        from main import app

        rules = {str(r): r.methods for r in app.url_map.iter_rules()}
        assert "/api/account" in rules
        assert "DELETE" in rules["/api/account"]
