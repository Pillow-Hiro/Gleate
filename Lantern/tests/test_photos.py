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


class _FakeStorageBucket:
    """supabase.storage.from_(BUCKET) の代わり。呼ばれた内容だけ記録する。"""

    def __init__(self):
        self.uploaded = []
        self.removed = []
        self.signed = []

    def upload(self, path, file, file_options=None):
        self.uploaded.append({"path": path, "file": file, "options": file_options})

    def remove(self, paths):
        self.removed.append(paths)

    def create_signed_url(self, path, expires_in):
        self.signed.append({"path": path, "expires_in": expires_in})
        return {"signedURL": f"https://example.test/{path}?token=dummy"}


class _FakeStorage:
    def __init__(self, bucket):
        self._bucket = bucket

    def from_(self, name):
        assert name == BUCKET
        return self._bucket


class _FakeSupabase:
    def __init__(self, bucket):
        self.storage = _FakeStorage(bucket)


def _use_fake(monkeypatch, bucket):
    from modules import photos
    monkeypatch.setattr(photos, "_client", lambda: _FakeSupabase(bucket))
    return photos


class TestSaveAndDelete:
    def test_本体とサムネイルを両方アップロードする(self, monkeypatch):
        bucket = _FakeStorageBucket()
        photos = _use_fake(monkeypatch, bucket)

        paths = photos.save_photo("abc-123", "2026-08-01", b"photo-bytes", b"thumb-bytes")

        assert paths == ("abc-123/2026-08-01.jpg", "abc-123/2026-08-01_thumb.jpg")
        assert [u["path"] for u in bucket.uploaded] == [
            "abc-123/2026-08-01.jpg",
            "abc-123/2026-08-01_thumb.jpg",
        ]

    def test_本体とサムネイルの中身が入れ替わらない(self, monkeypatch):
        bucket = _FakeStorageBucket()
        photos = _use_fake(monkeypatch, bucket)

        photos.save_photo("abc-123", "2026-08-01", b"photo-bytes", b"thumb-bytes")

        assert bucket.uploaded[0]["file"] == b"photo-bytes"
        assert bucket.uploaded[1]["file"] == b"thumb-bytes"

    def test_撮り直しは上書きになる(self, monkeypatch):
        bucket = _FakeStorageBucket()
        photos = _use_fake(monkeypatch, bucket)

        photos.save_photo("abc-123", "2026-08-01", b"x", b"y")

        # 1記録1枚なので同じパスに上書きする。upsert を有効にしないと409になる
        assert bucket.uploaded[0]["options"]["upsert"] == "true"

    def test_content_typeをjpegで指定する(self, monkeypatch):
        bucket = _FakeStorageBucket()
        photos = _use_fake(monkeypatch, bucket)

        photos.save_photo("abc-123", "2026-08-01", b"x", b"y")

        # バケットが image/jpeg のみ許可しているため、未指定だと拒否される
        assert bucket.uploaded[0]["options"]["content-type"] == "image/jpeg"

    def test_不正な日付ではStorageに触らない(self, monkeypatch):
        bucket = _FakeStorageBucket()
        photos = _use_fake(monkeypatch, bucket)

        # パス検証で弾かれるので、1バイトも書かれてはいけない
        with pytest.raises(ValueError):
            photos.save_photo("abc-123", "2026-02-30", b"x", b"y")
        assert bucket.uploaded == []

    def test_削除は本体とサムネイルの両方を消す(self, monkeypatch):
        bucket = _FakeStorageBucket()
        photos = _use_fake(monkeypatch, bucket)

        photos.delete_photo("abc-123", "2026-08-01")

        assert bucket.removed == [[
            "abc-123/2026-08-01.jpg",
            "abc-123/2026-08-01_thumb.jpg",
        ]]

    def test_署名付きURLを発行する(self, monkeypatch):
        bucket = _FakeStorageBucket()
        photos = _use_fake(monkeypatch, bucket)

        url = photos.signed_url("abc-123/2026-08-01.jpg")

        assert url.startswith("https://example.test/")
        assert bucket.signed[0]["expires_in"] == 3600

    @pytest.mark.parametrize("empty", [None, ""])
    def test_パスが空ならURLもNone(self, monkeypatch, empty):
        bucket = _FakeStorageBucket()
        photos = _use_fake(monkeypatch, bucket)

        assert photos.signed_url(empty) is None
        assert bucket.signed == []

    def test_削除の失敗は握り潰さずログに出す(self, monkeypatch, capsys):
        class _Failing(_FakeStorageBucket):
            def remove(self, paths):
                raise RuntimeError("storage down")

        photos = _use_fake(monkeypatch, _Failing())

        # 呼び出し元（記録の削除）を巻き添えにしないため例外は外に出さない
        photos.delete_photo("abc-123", "2026-08-01")
        assert "写真の削除に失敗" in capsys.readouterr().out

    def test_URL発行の失敗はNoneを返しログに出す(self, monkeypatch, capsys):
        class _Failing(_FakeStorageBucket):
            def create_signed_url(self, path, expires_in):
                raise RuntimeError("storage down")

        photos = _use_fake(monkeypatch, _Failing())

        # 1枚のURLが出せなくても記録一覧全体を落とさない
        assert photos.signed_url("abc-123/2026-08-01.jpg") is None
        assert "署名付きURLの発行に失敗" in capsys.readouterr().out

    def test_アップロードの失敗は呼び出し元に伝える(self, monkeypatch):
        class _Failing(_FakeStorageBucket):
            def upload(self, path, file, file_options=None):
                raise RuntimeError("storage down")

        photos = _use_fake(monkeypatch, _Failing())

        # 保存は失敗を隠してはいけない。呼び出し元がユーザーにエラーを返す必要がある
        with pytest.raises(RuntimeError):
            photos.save_photo("abc-123", "2026-08-01", b"x", b"y")
