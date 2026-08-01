"""modules/photos.py のテスト。

パスは必ずサーバー側で user_id と date から組み立てる。
クライアントから渡された文字列をパスに使うと、他ユーザーの
ファイルを指定される経路ができてしまう。
"""

import pytest

from modules.photos import build_photo_path, build_thumb_path, BUCKET


class TestBuildPath:
    def test_本体のパスはuser_idとdateから決まる(self):
        assert build_photo_path("abc-123", "2026-08-01") == "abc-123/2026-08-01.jpg"

    def test_サムネイルのパスは_thumb_が付く(self):
        assert build_thumb_path("abc-123", "2026-08-01") == "abc-123/2026-08-01_thumb.jpg"

    def test_バケット名は定数で持つ(self):
        assert BUCKET == "lantern-photos"

    @pytest.mark.parametrize("bad_date", [
        "../../etc/passwd", "2026-08-01/../x", "..", "a/b", "2026-08-01.jpg",
    ])
    def test_不正な日付は拒否する(self, bad_date):
        # パス区切りや相対参照を含む値でディレクトリを抜けられないようにする
        with pytest.raises(ValueError):
            build_photo_path("abc-123", bad_date)

    @pytest.mark.parametrize("bad_user", ["../other", "a/b", "", None])
    def test_不正なuser_idは拒否する(self, bad_user):
        with pytest.raises(ValueError):
            build_photo_path(bad_user, "2026-08-01")

    def test_日付の形式はYYYY_MM_DDのみ(self):
        with pytest.raises(ValueError):
            build_photo_path("abc-123", "2026-8-1")
