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


class TestBuildState:
    def test_platform_を明示すると_user_idと連結される(self):
        assert build_state("abc-123", "app") == "abc-123|app"

    def test_platform_省略時は_web(self):
        assert build_state("abc-123") == "abc-123|web"


class TestParseState:
    def test_新形式を_user_idと_platformに分解する(self):
        assert parse_state("abc-123|app") == ("abc-123", "app")

    def test_旧形式_platformなし_は_web扱い(self):
        # 既存のWebフロントは platform を含まない state を送る。
        # ここが web にフォールバックしないと、Web利用者が lantern:// へ飛ばされる。
        assert parse_state("abc-123") == ("abc-123", "web")

    def test_空文字は_user_idなし_web(self):
        assert parse_state("") == (None, "web")

    def test_Noneは_user_idなし_web(self):
        # Google が state を返さなかった場合。例外ではなく None を返す契約。
        assert parse_state(None) == (None, "web")

    def test_platformが空文字なら_webにフォールバックする(self):
        assert parse_state("abc-123|") == ("abc-123", "web")

    def test_user_idが空なら_Noneを返す(self):
        assert parse_state("|app") == (None, "app")

    @pytest.mark.parametrize("platform", ["web", "app"])
    @pytest.mark.parametrize("user_id", ["abc-123", "5efc736a-e32c-4904-af2e-98a6b9768032"])
    def test_build_state_と_parse_state_は往復する(self, user_id, platform):
        assert parse_state(build_state(user_id, platform)) == (user_id, platform)

    def test_区切り文字が複数あっても最初の1つで分解する(self):
        # user_id は UUID なので '|' を含まない。仮に含んでも
        # partition が最初の1つだけを見るため platform 側に寄る、という現状の挙動を固定する。
        assert parse_state("abc|def|ghi") == ("abc", "def|ghi")


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
