"""MusicKit の開発者トークン（`modules/applemusic.py`）。

**本物の鍵は使わない。** 検査のたびに Apple の鍵を置く必要が無いよう、
その場で P-256 の鍵を作って署名させる。見るのは JWT の形と、
**鍵が無いときに黙って止まること。**
"""

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

from modules import applemusic

KEY_ID = "BL55RD3DBN"
TEAM_ID = "42P5VK92HG"


@pytest.fixture
def keypair():
    """その場限りの P-256。Apple の鍵と同じ種類（ES256）"""
    private = ec.generate_private_key(ec.SECP256R1())
    pem = private.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()
    return pem, private.public_key()


@pytest.fixture(autouse=True)
def clean(monkeypatch):
    """覚えを捨ててから始める。**前の検査のトークンを見ない**"""
    applemusic._reset_for_tests()
    for name in ("APPLE_MUSIC_KEY_ID", "APPLE_MUSIC_TEAM_ID", "APPLE_MUSIC_KEY"):
        monkeypatch.delenv(name, raising=False)
    yield
    applemusic._reset_for_tests()


def _configure(monkeypatch, pem):
    monkeypatch.setenv("APPLE_MUSIC_KEY_ID", KEY_ID)
    monkeypatch.setenv("APPLE_MUSIC_TEAM_ID", TEAM_ID)
    monkeypatch.setenv("APPLE_MUSIC_KEY", pem)


class Test鍵が無いとき:
    # **鍵の無い環境でもアプリは動く。** ローカルの検査でも、
    # まだ設定していない本番でも、音楽が繋がらないだけにする
    def test_止まっていると答える(self):
        assert applemusic.is_enabled() is False

    def test_トークンを作らない(self):
        assert applemusic.developer_token() is None
        assert applemusic.token_response() is None

    def test_一部だけでも足りない(self, monkeypatch, keypair):
        pem, _ = keypair
        monkeypatch.setenv("APPLE_MUSIC_KEY_ID", KEY_ID)
        monkeypatch.setenv("APPLE_MUSIC_KEY", pem)
        # Team ID が無い
        assert applemusic.is_enabled() is False


class Testトークンの形:
    def test_Appleが求める形で署名する(self, monkeypatch, keypair):
        pem, public = keypair
        _configure(monkeypatch, pem)

        token = applemusic.developer_token(now=1_000_000)
        assert token

        head = jwt.get_unverified_header(token)
        # **`kid` は頭に入る。** Apple はこれで鍵を選ぶ
        assert head["kid"] == KEY_ID
        assert head["alg"] == "ES256"

        # **期限は自分で見る。**`now` を偽っているので、
        # `jwt` に本物の時刻で照らされると必ず切れている扱いになる
        body = jwt.decode(token, public, algorithms=["ES256"], options={"verify_exp": False})
        # **`iss` は Team ID。** 誰の名義かを示す
        assert body["iss"] == TEAM_ID
        assert body["iat"] == 1_000_000
        assert body["exp"] == 1_000_000 + applemusic.TOKEN_TTL

    # Apple の上限は約6ヶ月。**そこまで延ばさない**——
    # 長すぎると、漏れたときに閉じられない期間が延びる
    def test_期限は6ヶ月より短い(self):
        assert applemusic.TOKEN_TTL < 15_777_000
        assert applemusic.TOKEN_TTL >= 24 * 60 * 60

    def test_期限も一緒に返す(self, monkeypatch, keypair):
        pem, _ = keypair
        _configure(monkeypatch, pem)
        body = applemusic.token_response(now=1_000_000)
        assert body["token"]
        assert body["expires_at"] == 1_000_000 + applemusic.TOKEN_TTL


class Test改行の書き方:
    # `.p8` は改行を含む。環境変数には `\n` と書くしかない場面がある
    def test_改行の書き方を戻す(self, monkeypatch, keypair):
        pem, public = keypair
        monkeypatch.setenv("APPLE_MUSIC_KEY_ID", KEY_ID)
        monkeypatch.setenv("APPLE_MUSIC_TEAM_ID", TEAM_ID)
        monkeypatch.setenv("APPLE_MUSIC_KEY", pem.replace("\n", "\\n"))

        token = applemusic.developer_token(now=1_000_000)
        assert token
        decoded = jwt.decode(token, public, algorithms=["ES256"], options={"verify_exp": False})
        assert decoded["iss"] == TEAM_ID


class Test作り直し:
    def test_同じものを配り続ける(self, monkeypatch, keypair):
        pem, _ = keypair
        _configure(monkeypatch, pem)
        first = applemusic.developer_token(now=1_000_000)
        # 1日後。まだ期限は遠い
        assert applemusic.developer_token(now=1_000_000 + 86_400) == first

    # **ぎりぎりに配らない。** 受け取った端末が使う頃には切れている
    def test_期限が近づいたら作り直す(self, monkeypatch, keypair):
        pem, public = keypair
        _configure(monkeypatch, pem)
        first = applemusic.developer_token(now=1_000_000)

        late = 1_000_000 + applemusic.TOKEN_TTL - applemusic.RENEW_BEFORE + 1
        second = applemusic.developer_token(now=late)
        assert second != first
        decoded = jwt.decode(second, public, algorithms=["ES256"], options={"verify_exp": False})
        assert decoded["iat"] == late


class Test壊れた鍵:
    # **落ちない。** 音楽が繋がらないだけにする
    def test_読めない鍵でもアプリは動く(self, monkeypatch):
        monkeypatch.setenv("APPLE_MUSIC_KEY_ID", KEY_ID)
        monkeypatch.setenv("APPLE_MUSIC_TEAM_ID", TEAM_ID)
        monkeypatch.setenv("APPLE_MUSIC_KEY", "-----BEGIN PRIVATE KEY-----\nこわれている\n-----END PRIVATE KEY-----")
        assert applemusic.is_enabled() is True
        assert applemusic.developer_token() is None


class Test曲を探す:
    """`applemusic.search`。**本物の Apple は叩かない。**"""

    def _reply(self, monkeypatch, status=200, payload=None, capture=None):
        class Res:
            status_code = status

            def json(self):
                return payload or {}

        def fake_get(url, **kwargs):
            if capture is not None:
                capture["url"] = url
                capture.update(kwargs)
            return Res()

        monkeypatch.setattr(applemusic.requests, "get", fake_get)

    def test_鍵が無ければ探さない(self, monkeypatch):
        called = {"n": 0}

        def boom(*a, **k):
            called["n"] += 1
            raise AssertionError("叩いてはいけない")

        monkeypatch.setattr(applemusic.requests, "get", boom)
        assert applemusic.search("test") == []
        assert called["n"] == 0

    def test_空の言葉では探さない(self, monkeypatch, keypair):
        pem, _ = keypair
        _configure(monkeypatch, pem)
        monkeypatch.setattr(applemusic.requests, "get", lambda *a, **k: 1 / 0)
        assert applemusic.search("") == []
        assert applemusic.search("   ") == []

    def test_添えられる形にして返す(self, monkeypatch, keypair):
        pem, _ = keypair
        _configure(monkeypatch, pem)
        self._reply(monkeypatch, payload={
            "results": {"songs": {"data": [
                {"attributes": {
                    "name": "月の曲",
                    "artistName": "だれか",
                    "url": "https://music.apple.com/jp/album/tsuki/1?i=2",
                }},
                # URL の無いものは落とす。**押せないものを並べない**
                {"attributes": {"name": "url が無い", "artistName": "x"}},
            ]}}
        })
        songs = applemusic.search("月")
        assert songs == [{
            "title": "月の曲",
            "artist": "だれか",
            "url": "https://music.apple.com/jp/album/tsuki/1?i=2",
        }]

    def test_鍵を頭に載せる(self, monkeypatch, keypair):
        pem, _ = keypair
        _configure(monkeypatch, pem)
        seen = {}
        self._reply(monkeypatch, payload={}, capture=seen)
        applemusic.search("月", storefront="us")

        assert seen["url"].endswith("/catalog/us/search")
        assert seen["headers"]["Authorization"].startswith("Bearer ey")
        assert seen["params"]["term"] == "月"
        assert seen["params"]["types"] == "songs"

    # **数を絞る。**大きい数を渡されても Apple の上限を越えない
    def test_数は絞る(self, monkeypatch, keypair):
        pem, _ = keypair
        _configure(monkeypatch, pem)
        seen = {}
        self._reply(monkeypatch, payload={}, capture=seen)
        applemusic.search("月", limit=999)
        assert seen["params"]["limit"] == 25

    # **探せないことでアプリを止めない**
    def test_断られても空を返す(self, monkeypatch, keypair):
        pem, _ = keypair
        _configure(monkeypatch, pem)
        self._reply(monkeypatch, status=401)
        assert applemusic.search("月") == []

    def test_通信が落ちても空を返す(self, monkeypatch, keypair):
        pem, _ = keypair
        _configure(monkeypatch, pem)

        def boom(*a, **k):
            raise TimeoutError("届かない")

        monkeypatch.setattr(applemusic.requests, "get", boom)
        assert applemusic.search("月") == []

    def test_形が違っても落ちない(self, monkeypatch, keypair):
        pem, _ = keypair
        _configure(monkeypatch, pem)
        self._reply(monkeypatch, payload={"results": None})
        assert applemusic.search("月") == []

