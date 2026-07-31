"""YouTube OAuth のリダイレクト先のテスト。

2026-07-31 に、ローカルで redirect_uri_mismatch が出た。
`YOUTUBE_REDIRECT_URI` 未設定時のフォールバックが
`http://localhost:5173/youtube/callback` になっており、

  - 5173 は Vite で、そのパスは Flask へプロキシされない（/api と /save のみ）
  - Google Cloud Console に登録しようのない値だった

という二重の誤りがあった。同じことを繰り返さないための回帰テスト。
"""

import importlib
import os

import pytest

import main
from main import _youtube_redirect_target, _resolve_frontend_origin


class TestRedirectUriDefault:
    def test_既定値はFlaskの実ルートと一致する(self, monkeypatch):
        # ここが /api/youtube/callback 以外になると redirect_uri_mismatch になる
        monkeypatch.delenv("YOUTUBE_REDIRECT_URI", raising=False)
        import modules.youtube as yt
        importlib.reload(yt)
        assert yt.REDIRECT_URI == "http://localhost:5000/api/youtube/callback"

    def test_既定値のパスが実際に存在するルートである(self, monkeypatch):
        monkeypatch.delenv("YOUTUBE_REDIRECT_URI", raising=False)
        import modules.youtube as yt
        importlib.reload(yt)

        from urllib.parse import urlparse
        path = urlparse(yt.REDIRECT_URI).path
        paths = {str(r) for r in main.app.url_map.iter_rules()}
        assert path in paths, f"{path} は Flask に存在しないルート"

    def test_既定値はViteのポートを指していない(self, monkeypatch):
        # 5173 は Vite。認可コードがFlaskに届かないため使ってはいけない
        monkeypatch.delenv("YOUTUBE_REDIRECT_URI", raising=False)
        import modules.youtube as yt
        importlib.reload(yt)
        assert ":5173" not in yt.REDIRECT_URI

    def test_環境変数があればそちらを使う(self, monkeypatch):
        monkeypatch.setenv("YOUTUBE_REDIRECT_URI", "https://example.com/api/youtube/callback")
        import modules.youtube as yt
        importlib.reload(yt)
        assert yt.REDIRECT_URI == "https://example.com/api/youtube/callback"

    def teardown_method(self):
        # 他のテストに影響させないため実際の環境で読み直す
        import modules.youtube as yt
        importlib.reload(yt)


class TestRedirectTarget:
    def test_webはフロントのdashboardへ戻す(self):
        result = _youtube_redirect_target("web", "connected")
        assert result.endswith("/dashboard?youtube=connected")

    def test_appはスキームURLへ戻す(self):
        # ネイティブはブラウザから直接アプリへ戻す必要がある
        assert _youtube_redirect_target("app", "connected") == "lantern://dashboard?youtube=connected"

    def test_platform不明はweb扱い(self):
        # 旧形式の state は platform を持たない。web にフォールバックする
        assert _youtube_redirect_target("", "connected").endswith("/dashboard?youtube=connected")
        assert not _youtube_redirect_target("", "connected").startswith("lantern://")

    @pytest.mark.parametrize("status", ["connected", "error", "denied"])
    def test_statusがそのまま載る(self, status):
        assert f"youtube={status}" in _youtube_redirect_target("web", status)
        assert f"youtube={status}" in _youtube_redirect_target("app", status)

    def test_スラッシュが重複しない(self):
        # FRONTEND_ORIGIN に末尾スラッシュを書かれても // にならないこと
        assert "//dashboard" not in _youtube_redirect_target("web", "connected")


class TestResolveFrontendOrigin:
    """環境変数の解決だけを純粋関数として検証する。

    main を reload すると load_dotenv() が走って開発者の .env を読み込むため、
    モジュール変数を直接見るテストは環境依存になる。ここでは関数を直接呼ぶ。
    """

    @pytest.mark.parametrize("raw", [None, ""])
    def test_未設定なら本番のVercelを使う(self, raw):
        # Render 側に環境変数を足さなくても動く状態を保つ
        assert _resolve_frontend_origin(raw) == "https://lantern-inky-three.vercel.app"

    def test_環境変数で上書きできる(self):
        assert _resolve_frontend_origin("http://localhost:5173") == "http://localhost:5173"

    @pytest.mark.parametrize("raw,expected", [
        ("http://localhost:5173/", "http://localhost:5173"),
        ("http://localhost:5173///", "http://localhost:5173"),
        ("https://example.com/", "https://example.com"),
    ])
    def test_末尾スラッシュは取り除かれる(self, raw, expected):
        assert _resolve_frontend_origin(raw) == expected

    def test_実際に使われている値が有効なoriginである(self):
        # 開発者の .env に何が入っていても、末尾スラッシュなしのURLであること
        assert main._FRONTEND_ORIGIN.startswith("http")
        assert not main._FRONTEND_ORIGIN.endswith("/")
