"""ルートの認証ガードのテスト。

2026-07-28 に、認証なしで実ユーザーのYouTube情報を返すデバッグ経路
（`/api/youtube/channel-test`）が本番に残っていた。
同じことを繰り返さないための回帰テスト。

新しいルートを認証なしで追加すると `test_公開ルートは許可リストと完全に一致する`
が落ちる。落ちたときは「テストを直す」前に、そのルートが本当に
公開でよいのかを判断すること。
"""

import re

import pytest

from main import app


# 認証なしで公開してよいルートと、その理由。
# ここに足すときは理由を必ず書くこと。
PUBLIC_ENDPOINTS = {
    "static": "Flask標準の静的配信",
    "debug_version": "デプロイ後の稼働バージョン確認。commit/branch/公開redirect_uriのみ",
    "splash_content_api": "起動画面の写真と引用。ユーザー個別のデータを含まない",
    "youtube_callback": "GoogleからのOAuthリダイレクト先。stateで本人性を確認する",
    "twitch_callback": "TwitchからのOAuthリダイレクト先。stateで本人性を確認する",
    # サーバー同士の経路。利用者のJWTは来ない。
    # Authorization ヘッダを共有の秘密と突き合わせ、未設定なら503で閉じる
    # （modules/billing.py）。
    "revenuecat_webhook": "RevenueCatからの購読状態の通知。共有の秘密で認証する",
}

# 削除済みのルート。復活していないことを確認する。
REMOVED_PATHS = [
    "/api/youtube/channel-test",
    "/debug/db-test",
    "/debug/insert-test",
    "/api/debug/routes",
    "/api/debug/youtube-config",
    "/api/debug/review-test",
    "/api/debug/static-check",
    "/api/debug/serve-react-test",
    "/goals/save",
    "/goals/suggest",
    "/goals/interview",
    "/api/vision",
]


def _is_authed(endpoint):
    # require_auth は functools.wraps を使うため、適用されると __wrapped__ が付く。
    return hasattr(app.view_functions[endpoint], "__wrapped__")


def _concrete_path(rule):
    """/api/logs/<date> のような可変部分をダミー値で埋める。

    型付きコンバータ（<int:idea_id> など）に合わない値を入れると
    ルートに一致せず404になり、認証ガードを検査できない。
    """
    def _fill(m):
        return "1" if m.group(0).startswith("<int:") else "x"

    return re.sub(r"<[^>]+>", _fill, rule.rule)


def _primary_method(rule):
    methods = rule.methods - {"HEAD", "OPTIONS"}
    for preferred in ("GET", "POST", "DELETE", "PUT", "PATCH"):
        if preferred in methods:
            return preferred
    return next(iter(methods))


def _authed_rules():
    return [r for r in app.url_map.iter_rules() if _is_authed(r.endpoint)]


@pytest.fixture
def client():
    return app.test_client()


class TestPublicSurface:
    def test_公開ルートは許可リストと完全に一致する(self):
        actual = {r.endpoint for r in app.url_map.iter_rules() if not _is_authed(r.endpoint)}
        assert actual == set(PUBLIC_ENDPOINTS), (
            "認証なしのルートが変わっている。\n"
            f"増えた: {sorted(actual - set(PUBLIC_ENDPOINTS))}\n"
            f"減った: {sorted(set(PUBLIC_ENDPOINTS) - actual)}"
        )

    def test_許可リストのすべてに理由が書かれている(self):
        for endpoint, reason in PUBLIC_ENDPOINTS.items():
            assert reason.strip(), f"{endpoint} に公開の理由がない"

    def test_ユーザーデータを返すルートが公開されていない(self):
        # 名前による二重チェック。許可リストの書き換えだけでは通らないようにする。
        危険な語 = ("logs", "quote", "milestone", "insights", "review", "timeline")
        for endpoint in PUBLIC_ENDPOINTS:
            if endpoint in ("serve_react", "static"):
                continue
            assert not any(w in endpoint for w in 危険な語), (
                f"{endpoint} はユーザーデータを返す可能性がある名前なのに公開扱いになっている"
            )


class TestAuthGuard:
    def test_認証必須ルートはヘッダなしで401を返す(self, client):
        for rule in _authed_rules():
            path, method = _concrete_path(rule), _primary_method(rule)
            res = client.open(path, method=method)
            assert res.status_code == 401, f"{method} {path} が {res.status_code} を返した"

    def test_Bearer以外のAuthorizationヘッダは401(self, client):
        for rule in _authed_rules():
            path, method = _concrete_path(rule), _primary_method(rule)
            res = client.open(path, method=method, headers={"Authorization": "Basic abc"})
            assert res.status_code == 401, f"{method} {path} が {res.status_code} を返した"

    def test_不正なトークンは401(self, client):
        for rule in _authed_rules():
            path, method = _concrete_path(rule), _primary_method(rule)
            res = client.open(path, method=method, headers={"Authorization": "Bearer not-a-jwt"})
            assert res.status_code == 401, f"{method} {path} が {res.status_code} を返した"

    def test_認証必須ルートが1つ以上ある(self):
        # 検出方法が壊れて「対象ゼロ」で上のテストが素通りするのを防ぐ
        assert len(_authed_rules()) >= 15


class TestRemovedRoutes:
    @pytest.mark.parametrize("path", REMOVED_PATHS)
    def test_削除したデバッグ経路が復活していない(self, client, path):
        # serve_react の _BLOCKED_PREFIXES に当たるため404になる
        assert client.get(path).status_code == 404

    def test_channel_testにユーザーIDがハードコードされていない(self):
        # 削除したUUIDがコードに残っていないことを直接確認する
        import io
        src = io.open("main.py", encoding="utf-8").read()
        assert "5efc736a-e32c-4904-af2e-98a6b9768032" not in src
