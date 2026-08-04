"""modules/twitch.py のテスト。

Twitch は YouTube と同じ認可コードフローを使うが、以下が違う。

- PKCE を使わない（Twitch がサポートしていない）
- 過去配信（VOD）は一定期間で消えるため、取得した時点で保存する
- リフレッシュトークンは1回限りの使い捨て。更新のたびに保存し直す

最後の点が最も壊れやすい。保存漏れは即座に連携切れになるが、
その場では気づけず、次にトークンを更新しようとした時に失敗する。
"""

from datetime import datetime, timedelta, timezone

import pytest

from modules import twitch


class TestRedirectUri:
    """既定値が実在する Flask ルートと一致すること。

    YouTube では既定値が Vite のポートを指していて認可コードが
    届かない状態が本番に入っていた。同じ失敗を繰り返さない。
    """

    def test_既定値はFlaskの実ルートと一致する(self, monkeypatch):
        monkeypatch.delenv("TWITCH_REDIRECT_URI", raising=False)
        import importlib
        reloaded = importlib.reload(twitch)
        try:
            assert reloaded.REDIRECT_URI.endswith("/api/twitch/callback")
        finally:
            importlib.reload(twitch)

    def test_既定値のパスが実際に存在するルートである(self):
        from main import app
        path = "/" + twitch.REDIRECT_URI.split("/", 3)[3]
        paths = {str(r) for r in app.url_map.iter_rules()}
        assert path in paths, f"{path} というルートが存在しない"

    def test_既定値はViteやExpoのポートを指していない(self):
        # 5173(Vite) と 8081(Expo) はFlaskではないため認可コードが届かない
        assert ":5173" not in twitch.REDIRECT_URI
        assert ":8081" not in twitch.REDIRECT_URI

    def test_環境変数があればそちらを使う(self, monkeypatch):
        monkeypatch.setenv("TWITCH_REDIRECT_URI", "https://example.test/api/twitch/callback")
        import importlib
        reloaded = importlib.reload(twitch)
        try:
            assert reloaded.REDIRECT_URI == "https://example.test/api/twitch/callback"
        finally:
            monkeypatch.delenv("TWITCH_REDIRECT_URI", raising=False)
            importlib.reload(twitch)


class TestAuthUrl:
    def test_必要なパラメータが載る(self):
        url = twitch.get_auth_url("abc-123", platform="web")
        assert url.startswith("https://id.twitch.tv/oauth2/authorize")
        assert "response_type=code" in url
        assert "client_id=" in url

    def test_stateにuser_idとplatformが載る(self):
        url = twitch.get_auth_url("abc-123", platform="app")
        assert "state=abc-123%7Capp" in url or "state=abc-123|app" in url

    def test_PKCEのパラメータを付けない(self):
        # Twitch は認可コードフローで PKCE をサポートしていない。
        # 付けると認可が通らない
        url = twitch.get_auth_url("abc-123")
        assert "code_challenge" not in url

    def test_スコープにフォロワー読み取りが入る(self):
        url = twitch.get_auth_url("abc-123")
        assert "moderator" in url and "read" in url and "followers" in url


class TestTokenExpiry:
    def test_expires_inから期限を計算する(self):
        before = datetime.now(timezone.utc)
        expiry = twitch.expiry_from_expires_in(3600, now=before)
        assert expiry == before + timedelta(seconds=3600)

    def test_expires_inが無ければNone(self):
        assert twitch.expiry_from_expires_in(None) is None

    def test_タイムゾーン付きで返す(self):
        assert twitch.expiry_from_expires_in(60).tzinfo is not None


class TestNeedsRefresh:
    def test_期限切れなら更新が必要(self):
        past = datetime.now(timezone.utc) - timedelta(minutes=1)
        assert twitch.needs_refresh(past.isoformat()) is True

    def test_期限が近ければ更新が必要(self):
        # 直前に切れると API 呼び出しの途中で失敗するため余裕を持つ
        soon = datetime.now(timezone.utc) + timedelta(seconds=60)
        assert twitch.needs_refresh(soon.isoformat()) is True

    def test_十分先なら更新しない(self):
        later = datetime.now(timezone.utc) + timedelta(hours=2)
        assert twitch.needs_refresh(later.isoformat()) is False

    def test_期限が不明なら更新する(self):
        # 分からないまま使って 401 になるより、先に更新する
        assert twitch.needs_refresh(None) is True

    def test_壊れた値でも例外にしない(self):
        assert twitch.needs_refresh("not-a-date") is True


class TestVideoToStream:
    """Twitch の VOD を twitch_streams の行に変換する。"""

    VIDEO = {
        "id": "1234567890",
        "title": "作業配信",
        "created_at": "2026-08-01T12:00:00Z",
        "duration": "3h21m33s",
        "view_count": 42,
        "url": "https://www.twitch.tv/videos/1234567890",
    }

    def test_必要な項目を取り出す(self):
        row = twitch.video_to_stream(self.VIDEO, "abc-123")
        assert row["user_id"] == "abc-123"
        assert row["video_id"] == "1234567890"
        assert row["title"] == "作業配信"
        assert row["view_count"] == 42
        assert row["url"] == self.VIDEO["url"]

    @pytest.mark.parametrize("duration,expected", [
        ("3h21m33s", 3 * 3600 + 21 * 60 + 33),
        ("21m33s", 21 * 60 + 33),
        ("33s", 33),
        ("2h", 2 * 3600),
        ("1h0m0s", 3600),
    ])
    def test_配信時間を秒に変換する(self, duration, expected):
        row = twitch.video_to_stream({**self.VIDEO, "duration": duration}, "u")
        assert row["duration_seconds"] == expected

    def test_時間が読めなければNone(self):
        row = twitch.video_to_stream({**self.VIDEO, "duration": "???"}, "u")
        assert row["duration_seconds"] is None

    def test_サムネイルは保存しない(self):
        # TwitchのサムネイルURLはVODと一緒に死ぬ。保存しても壊れたリンクが残るだけ
        row = twitch.video_to_stream({**self.VIDEO, "thumbnail_url": "https://x/y.jpg"}, "u")
        assert "thumbnail" not in row
        assert "thumbnail_url" not in row

    def test_開始時刻を保つ(self):
        row = twitch.video_to_stream(self.VIDEO, "u")
        assert row["started_at"] == "2026-08-01T12:00:00Z"

    def test_欠けた項目があっても落ちない(self):
        row = twitch.video_to_stream({"id": "1"}, "u")
        assert row["video_id"] == "1"
        assert row["title"] == ""
        assert row["view_count"] == 0
