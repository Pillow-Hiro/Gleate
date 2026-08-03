"""JWT の検証アルゴリズムのテスト。

JWKS が配るのは非対称鍵（Supabase は ES256 一本）。
許可アルゴリズムに HS256 を混ぜると、公開鍵を HMAC の秘密鍵として
署名させるアルゴリズム混同攻撃の入口になる。

PyJWT は鍵オブジェクトを HMAC 秘密鍵として使うことを拒否するため
実際には防がれていたが、ライブラリの実装に依存させない。
"""

import jwt
import pytest

from modules import auth
from main import app


class TestAllowedAlgorithms:
    def test_HS256は許可リストに無い(self):
        assert "HS256" not in auth._ALGORITHMS

    def test_非対称鍵のアルゴリズムだけ(self):
        assert set(auth._ALGORITHMS) <= {"ES256", "RS256", "ES384", "RS384", "ES512", "RS512"}

    def test_空にはしない(self):
        # 空にすると全てのトークンが弾かれ、ログインできなくなる
        assert auth._ALGORITHMS


class _FakeKey:
    """JWKS が文字列の鍵を返したことにする。

    HS256 が許可されていれば、この文字列を共有秘密鍵として
    署名した偽トークンが通ってしまう。
    """

    def __init__(self, secret):
        self.key = secret


class _FakeJwks:
    def __init__(self, secret):
        self._secret = secret

    def get_signing_key_from_jwt(self, token):
        return _FakeKey(self._secret)


class TestHs256TokenIsRejected:
    SECRET = "public-key-material-pretending-to-be-a-secret"

    @pytest.fixture
    def client(self, monkeypatch):
        monkeypatch.setattr(auth, "_jwks_client", _FakeJwks(self.SECRET))
        return app.test_client()

    def test_HS256で署名した偽トークンは401(self, client):
        # 鍵素材を共有秘密鍵として署名する。これが通ると
        # 公開鍵さえ知っていれば誰でも任意のユーザーになりすませる
        forged = jwt.encode({"sub": "someone-elses-user-id"}, self.SECRET, algorithm="HS256")
        res = client.get("/api/logs", headers={"Authorization": f"Bearer {forged}"})
        assert res.status_code == 401, "HS256 の偽トークンが通っている"

    def test_なりすまし先のデータが返っていない(self, client):
        forged = jwt.encode({"sub": "someone-elses-user-id"}, self.SECRET, algorithm="HS256")
        res = client.get("/api/logs", headers={"Authorization": f"Bearer {forged}"})
        assert res.get_json() != []
        assert "error" in res.get_json()
