"""記録の暗号化（2026-09-02）。

ここで固定するのは4つ。

1. **鍵が無ければ素通し**（配備と鍵の設定は別作業。順番が前後する）
2. **移行中は平文と暗号文が混ざる**。両方読める
3. **復号に失敗したら投げる。** 空を返すと上書きで消える
4. **鍵の入れ替えができる。** 古い鍵で読めるまま、新しい鍵で書く
"""

import base64
import os

import pytest

from modules import crypto
from modules.crypto import DecryptError, decrypt, encrypt, is_encrypted
from modules.logs import _from_db, _to_db


def _key():
    return base64.b64encode(os.urandom(32)).decode()


@pytest.fixture
def one_key(monkeypatch):
    k = _key()
    monkeypatch.setenv("LANTERN_ENC_KEYS", f"1:{k}")
    return k


@pytest.fixture
def no_key(monkeypatch):
    monkeypatch.delenv("LANTERN_ENC_KEYS", raising=False)


class Test鍵が無いとき:
    def test_素通しする(self, no_key):
        # **配備が先でも鍵の設定が先でも壊れない**
        assert encrypt("今日は曲を書いた") == "今日は曲を書いた"
        assert decrypt("今日は曲を書いた") == "今日は曲を書いた"

    def test_効いていないと分かる(self, no_key):
        assert crypto.is_enabled() is False


class Test往復:
    def test_戻る(self, one_key):
        for text in ["今日は曲を書いた", "改行\nを含む", "絵文字🏮", "a" * 2000]:
            assert decrypt(encrypt(text)) == text

    def test_封筒に入る(self, one_key):
        sealed = encrypt("今日は曲を書いた")
        assert is_encrypted(sealed)
        # **中身が読めないこと。**ここが目的
        assert "今日は曲を書いた" not in sealed

    def test_毎回ちがう暗号文(self, one_key):
        # nonce が使い回されると、同じ文が同じ暗号文になり中身を推測できる
        a, b = encrypt("同じ文"), encrypt("同じ文")
        assert a != b
        assert decrypt(a) == decrypt(b) == "同じ文"

    def test_空文字は触らない(self, one_key):
        assert encrypt("") == ""
        assert decrypt("") == ""

    def test_二重に包まない(self, one_key):
        once = encrypt("一度だけ")
        assert encrypt(once) == once


class Test移行中:
    def test_平文をそのまま読む(self, one_key):
        # 移行の途中は混ざる。**両方読めること**
        assert decrypt("まだ平文の記録") == "まだ平文の記録"

    def test_混ざった一覧を読める(self, one_key):
        rows = [
            {"user_id": "u1", "content": "平文のまま", "date": "2026-01-01"},
            {"user_id": "u1", "content": encrypt("暗号文", "u1"), "date": "2026-01-02"},
        ]
        assert [_from_db(r)["created"] for r in rows] == ["平文のまま", "暗号文"]


class Test付帯データ:
    def test_別の利用者では読めない(self, one_key):
        sealed = encrypt("u1の記録", "u1")
        # 暗号文を別の行へ移し替えても開かない
        with pytest.raises(DecryptError):
            decrypt(sealed, "u2")


class Test復号できないとき:
    def test_投げる(self, one_key, monkeypatch):
        sealed = encrypt("消えては困る記録")
        # 鍵を入れ替え損ねた状況
        monkeypatch.setenv("LANTERN_ENC_KEYS", f"1:{_key()}")

        # **空を返さない。** 空だと、開いて保存した人が中身を空で上書きする
        with pytest.raises(DecryptError):
            decrypt(sealed)

    def test_鍵が消えたときも投げる(self, one_key, monkeypatch):
        sealed = encrypt("消えては困る記録")
        monkeypatch.delenv("LANTERN_ENC_KEYS", raising=False)
        with pytest.raises(DecryptError):
            decrypt(sealed)

    def test_壊れた封筒も投げる(self, one_key):
        with pytest.raises(DecryptError):
            decrypt("v1.1.こわれている")


class Test鍵の入れ替え:
    def test_古い鍵で読めるまま新しい鍵で書く(self, monkeypatch):
        old, new = _key(), _key()

        monkeypatch.setenv("LANTERN_ENC_KEYS", f"1:{old}")
        was = encrypt("古い鍵で書いた")

        # 2本並べる。**最後のものが有効**
        monkeypatch.setenv("LANTERN_ENC_KEYS", f"1:{old},2:{new}")
        assert decrypt(was) == "古い鍵で書いた"

        now = encrypt("新しい鍵で書いた")
        assert now.startswith("v1.2.")
        assert decrypt(now) == "新しい鍵で書いた"


class Test列の選び方:
    def test_本文だけ包む(self, one_key):
        row = _to_db(
            {
                "date": "2026-09-02",
                "created": "本文",
                "enjoyable": "よかったこと",
                "struggled": "困ったこと",
                "next": "次にやること",
                "ai_response": "灯り",
                "saved_at": "2026-09-02T00:00:00",
            },
            user_id="u1",
        )

        for k in ("content", "good_things", "struggles", "next_action", "lantern_message"):
            assert is_encrypted(row[k]), f"{k} が平文のまま"

        # **絞り込みと差分同期に使う列は平文のまま。**
        # 包むと `.eq("date")` も `?since=` も効かなくなる
        assert row["date"] == "2026-09-02"
        assert row["user_id"] == "u1"
        assert row["updated_at"] == "2026-09-02T00:00:00"

    def test_書いて読んで戻る(self, one_key):
        entry = {
            "date": "2026-09-02",
            "created": "本文",
            "enjoyable": "",
            "struggled": "困った",
            "next": "次",
            "ai_response": "灯り",
            "saved_at": "2026-09-02T00:00:00",
        }
        row = _to_db(entry, user_id="u1")
        row["user_id"] = "u1"
        back = _from_db(row)

        assert back["created"] == "本文"
        assert back["struggled"] == "困った"
        assert back["ai_response"] == "灯り"
        assert back["enjoyable"] == ""
