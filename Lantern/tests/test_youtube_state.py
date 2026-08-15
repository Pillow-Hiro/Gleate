"""modules/youtube.py の純粋関数のテスト。

state の形式は「Google Cloud Console のリダイレクトURI設定を変えずに
Web とネイティブアプリを出し分ける」ための要。ここが壊れると
OAuth から戻れなくなり、しかも実機でしか気づけない。
"""

import base64
import hashlib

import pytest

from modules.youtube import (
    build_state,
    parse_state,
    generate_code_verifier,
    generate_code_challenge,
)


# state の形式そのものの検査は `tests/test_oauth_state.py` へ移した。
# **2026-08-15 に署名を足した**ので、`"abc-123|app"` のような
# 素の文字列はもう通らない。ここでは「YouTube から呼んでも同じものが使える」
# ことだけを見る（実体は `modules/oauth_state.py` の再輸出）。
class TestState往復:
    @pytest.mark.parametrize("platform", ["web", "app"])
    @pytest.mark.parametrize("user_id", ["abc-123", "5efc736a-e32c-4904-af2e-98a6b9768032"])
    def test_build_state_と_parse_state_は往復する(self, user_id, platform):
        assert parse_state(build_state(user_id, platform)) == (user_id, platform)

    def test_署名の無い文字列は通らない(self):
        assert parse_state("abc-123|app") == (None, "web")

    def test_空とNoneは_user_idなし(self):
        assert parse_state("") == (None, "web")
        assert parse_state(None) == (None, "web")


class TestPkce:
    def test_verifierは呼ぶたびに変わる(self):
        assert generate_code_verifier() != generate_code_verifier()

    def test_verifierは_RFC7636_の長さ制約_43から128文字_を満たす(self):
        v = generate_code_verifier()
        assert 43 <= len(v) <= 128

    def test_verifierはURLセーフな文字のみ(self):
        v = generate_code_verifier()
        assert all(c.isalnum() or c in "-._~" for c in v), v

    def test_challengeは同じverifierに対して決定的(self):
        v = generate_code_verifier()
        assert generate_code_challenge(v) == generate_code_challenge(v)

    def test_challengeはパディングなしのbase64url(self):
        c = generate_code_challenge(generate_code_verifier())
        assert "=" not in c
        assert "+" not in c and "/" not in c

    def test_challengeはS256_手計算と一致する(self):
        v = "test-verifier"
        expected = base64.urlsafe_b64encode(
            hashlib.sha256(v.encode()).digest()
        ).rstrip(b"=").decode()
        assert generate_code_challenge(v) == expected

    def test_RFC7636_付録Bのテストベクタと一致する(self):
        verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
        assert generate_code_challenge(verifier) == "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
