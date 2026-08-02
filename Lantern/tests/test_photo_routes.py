"""写真エンドポイントのテスト。

実際のアップロードは Storage に依存するため、ここでは
認証ガード・入力検証・署名付きURLの付与を固定する。
"""

import io

import pytest

import main
from main import app


@pytest.fixture
def client():
    return app.test_client()


class TestPhotoRoutesAuth:
    def test_PUTは認証なしで401(self, client):
        assert client.put("/api/logs/2026-08-01/photo").status_code == 401

    def test_DELETEは認証なしで401(self, client):
        assert client.delete("/api/logs/2026-08-01/photo").status_code == 401

    @pytest.mark.parametrize("method", ["put", "delete"])
    def test_不正なトークンでも401(self, client, method):
        headers = {"Authorization": "Bearer not-a-jwt"}
        res = getattr(client, method)("/api/logs/2026-08-01/photo", headers=headers)
        assert res.status_code == 401

    def test_ルートが登録されている(self):
        paths = {str(r) for r in app.url_map.iter_rules()}
        assert "/api/logs/<date>/photo" in paths


class TestAttachPhotoUrls:
    """写真パスを署名付きURLに変換して返す。

    内部の Storage パスはクライアントに渡さない。
    """

    def test_写真パスがあれば署名付きURLを付ける(self, monkeypatch):
        monkeypatch.setattr(
            "modules.photos.signed_url",
            lambda path: f"https://example.test/{path}" if path else None,
        )
        logs = [{
            "date": "2026-08-01",
            "photo_path": "u/a.jpg",
            "photo_thumb_path": "u/a_thumb.jpg",
        }]

        result = main._attach_photo_urls(logs)

        assert result[0]["photo_url"] == "https://example.test/u/a.jpg"
        assert result[0]["photo_thumb_url"] == "https://example.test/u/a_thumb.jpg"

    def test_写真がなければURLはNone(self, monkeypatch):
        monkeypatch.setattr("modules.photos.signed_url", lambda path: None)
        logs = [{"date": "2026-08-01", "photo_path": "", "photo_thumb_path": ""}]

        result = main._attach_photo_urls(logs)

        assert result[0]["photo_url"] is None
        assert result[0]["photo_thumb_url"] is None

    def test_内部のStorageパスは返さない(self, monkeypatch):
        monkeypatch.setattr("modules.photos.signed_url", lambda path: "https://example.test/x")
        logs = [{
            "date": "2026-08-01",
            "photo_path": "u/a.jpg",
            "photo_thumb_path": "u/a_thumb.jpg",
        }]

        result = main._attach_photo_urls(logs)

        assert "photo_path" not in result[0]
        assert "photo_thumb_path" not in result[0]

    def test_他のフィールドは残す(self, monkeypatch):
        monkeypatch.setattr("modules.photos.signed_url", lambda path: None)
        logs = [{"date": "2026-08-01", "created": "曲を書いた", "photo_path": ""}]

        result = main._attach_photo_urls(logs)

        assert result[0]["created"] == "曲を書いた"
        assert result[0]["date"] == "2026-08-01"

    def test_元のリストを書き換えない(self, monkeypatch):
        monkeypatch.setattr("modules.photos.signed_url", lambda path: "https://example.test/x")
        logs = [{"date": "2026-08-01", "photo_path": "u/a.jpg", "photo_thumb_path": "u/t.jpg"}]

        main._attach_photo_urls(logs)

        assert logs[0]["photo_path"] == "u/a.jpg"
        assert "photo_url" not in logs[0]

    def test_記録が無ければ空リスト(self):
        assert main._attach_photo_urls([]) == []


class TestUploadValidation:
    """認証を通した状態での入力検証。

    require_auth を差し替えるのではなく、g.user_id を直接立てて
    ビュー関数を呼ぶ（デコレータの検証は TestPhotoRoutesAuth が担当）。
    """

    def _call_upload(self, monkeypatch, files, saved=None):
        from flask import g

        def _fake_save(user_id, date, photo_bytes, thumb_bytes):
            if saved is not None:
                saved.append((user_id, date, photo_bytes, thumb_bytes))
            return f"{user_id}/{date}.jpg", f"{user_id}/{date}_thumb.jpg"

        monkeypatch.setattr("modules.photos.save_photo", _fake_save)
        monkeypatch.setattr("modules.photos.signed_url", lambda p: f"https://example.test/{p}")
        monkeypatch.setattr("modules.logs.set_photo_paths", lambda *a, **k: None)

        with app.test_request_context("/api/logs/2026-08-01/photo", method="PUT", data=files):
            g.user_id = "abc-123"
            return main.upload_log_photo.__wrapped__("2026-08-01")

    def test_photoが無ければ400(self, monkeypatch):
        res, status = self._call_upload(
            monkeypatch, {"thumb": (io.BytesIO(b"t"), "t.jpg")}
        )
        assert status == 400

    def test_thumbが無ければ400(self, monkeypatch):
        res, status = self._call_upload(
            monkeypatch, {"photo": (io.BytesIO(b"p"), "p.jpg")}
        )
        assert status == 400

    def test_両方あれば署名付きURLを返す(self, monkeypatch):
        saved = []
        res = self._call_upload(
            monkeypatch,
            {"photo": (io.BytesIO(b"photo"), "p.jpg"), "thumb": (io.BytesIO(b"thumb"), "t.jpg")},
            saved,
        )
        body = res.get_json()
        assert body["photo_url"] == "https://example.test/abc-123/2026-08-01.jpg"
        assert body["photo_thumb_url"] == "https://example.test/abc-123/2026-08-01_thumb.jpg"

    def test_ファイルの中身がそのまま渡る(self, monkeypatch):
        saved = []
        self._call_upload(
            monkeypatch,
            {"photo": (io.BytesIO(b"photo"), "p.jpg"), "thumb": (io.BytesIO(b"thumb"), "t.jpg")},
            saved,
        )
        assert saved[0][2] == b"photo"
        assert saved[0][3] == b"thumb"

    def test_user_idはgから取る(self, monkeypatch):
        # クライアントから渡された値ではなく、認証済みの user_id を使う
        saved = []
        self._call_upload(
            monkeypatch,
            {"photo": (io.BytesIO(b"p"), "p.jpg"), "thumb": (io.BytesIO(b"t"), "t.jpg")},
            saved,
        )
        assert saved[0][0] == "abc-123"

    def test_不正な日付は400(self, monkeypatch):
        from flask import g

        def _raising(user_id, date, photo_bytes, thumb_bytes):
            raise ValueError(f"実在しない date: {date!r}")

        monkeypatch.setattr("modules.photos.save_photo", _raising)
        files = {"photo": (io.BytesIO(b"p"), "p.jpg"), "thumb": (io.BytesIO(b"t"), "t.jpg")}

        with app.test_request_context("/api/logs/2026-02-30/photo", method="PUT", data=files):
            g.user_id = "abc-123"
            res, status = main.upload_log_photo.__wrapped__("2026-02-30")

        assert status == 400


class TestGetLogsAttachesUrls:
    """/api/logs が署名付きURLを付けて返すこと。

    _attach_photo_urls を呼び忘れると、フロントは photo_url を受け取れず
    写真が表示されない（例外は出ないので気づきにくい）。
    """

    def test_取得した記録に署名付きURLが付く(self, monkeypatch):
        from flask import g

        # main は load_logs をモジュールレベルで import しているため、
        # modules.logs 側を差し替えても効かない。main の名前を差し替える。
        monkeypatch.setattr(
            main,
            "load_logs",
            lambda user_id: [{
                "date": "2026-08-01",
                "created": "曲を書いた",
                "photo_path": "abc-123/2026-08-01.jpg",
                "photo_thumb_path": "abc-123/2026-08-01_thumb.jpg",
            }],
        )
        monkeypatch.setattr("modules.photos.signed_url", lambda p: f"https://example.test/{p}" if p else None)

        with app.test_request_context("/api/logs"):
            g.user_id = "abc-123"
            body = main.get_logs_api.__wrapped__().get_json()

        assert body[0]["photo_url"] == "https://example.test/abc-123/2026-08-01.jpg"
        assert body[0]["photo_thumb_url"] == "https://example.test/abc-123/2026-08-01_thumb.jpg"
        # 内部のStorageパスは漏らさない
        assert "photo_path" not in body[0]


class TestUserIdComesFromAuth:
    """パスの user_id は必ず認証済みの g.user_id から取る。

    クライアントの値を信用すると、他ユーザーのフォルダに書き込める。
    """

    def test_リクエストにuser_idを混ぜても無視される(self, monkeypatch):
        from flask import g

        saved = []
        monkeypatch.setattr(
            "modules.photos.save_photo",
            lambda user_id, date, p, t: (saved.append(user_id), (f"{user_id}/x.jpg", f"{user_id}/t.jpg"))[1],
        )
        monkeypatch.setattr("modules.photos.signed_url", lambda p: "https://example.test/x")
        monkeypatch.setattr("modules.logs.set_photo_paths", lambda *a, **k: None)

        files = {
            "photo": (io.BytesIO(b"p"), "p.jpg"),
            "thumb": (io.BytesIO(b"t"), "t.jpg"),
            "user_id": "attacker-999",   # 攻撃者が混ぜてきた値
        }
        with app.test_request_context("/api/logs/2026-08-01/photo", method="PUT", data=files):
            g.user_id = "abc-123"
            main.upload_log_photo.__wrapped__("2026-08-01")

        assert saved == ["abc-123"], "クライアントの user_id が使われている"
