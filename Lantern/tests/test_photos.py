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

    @pytest.mark.parametrize("bad_date", ["20260801", "2026W011", "2026-W01-1"])
    def test_ハイフン区切り以外のISO形式を拒否する(self, bad_date):
        # date.fromisoformat はこれらも日付として受け付けてしまう。
        # 通すと同じ日の写真が別パスに保存され、logsテーブルのDATE列と対応が取れなくなる。
        with pytest.raises(ValueError):
            build_photo_path("abc-123", bad_date)

    @pytest.mark.parametrize("bad_date", ["2026-08-01\n", "2026-08-01\r\n"])
    def test_末尾の改行を拒否する(self, bad_date):
        with pytest.raises(ValueError):
            build_photo_path("abc-123", bad_date)

    def test_user_idの末尾の改行も拒否する(self):
        # Python の $ は末尾の改行の直前にもマッチするため \Z が要る（ここだけが実際に効く）
        with pytest.raises(ValueError):
            build_photo_path("abc-123\n", "2026-08-01")

    @pytest.mark.parametrize("bad_date", ["２０２６-０８-０１", "٢٠٢٦-٠٨-٠١"])
    def test_ASCII以外の数字を拒否する(self, bad_date):
        with pytest.raises(ValueError):
            build_photo_path("abc-123", bad_date)

    @pytest.mark.parametrize("bad_date", ["9999-99-99", "2026-02-30", "2026-13-01", "2026-00-10"])
    def test_実在しない日付を拒否する(self, bad_date):
        # 形式が合っていてもDBのDATE型は受け付けない。
        # Storageに書いた後でDB更新が失敗すると孤児ファイルが残るため、ここで弾く
        with pytest.raises(ValueError):
            build_photo_path("abc-123", bad_date)

    def test_うるう年の2月29日は通す(self):
        assert build_photo_path("abc-123", "2028-02-29") == "abc-123/2028-02-29.jpg"

    def test_平年の2月29日は拒否する(self):
        with pytest.raises(ValueError):
            build_photo_path("abc-123", "2026-02-29")
