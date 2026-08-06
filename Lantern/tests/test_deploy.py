"""本番の起動構成を固定する。

## なぜ必要か

2026-08-06 まで、**本番で Flask の開発サーバーが動いていた。**
`Procfile` が `python -u main.py` で、Werkzeug がそのまま公開されていた。

    Server: Werkzeug/3.1.8 Python/3.14.3

Flask 自身が本番利用を警告している構成で、同時実行にも耐えない。
2ヶ月気づかなかったのは、動いてはいたため。
**「動いているから正しい」と判断しない**ための検査をここに置く。

依存の版も固定する。名前だけを書いていたので、Render は
デプロイのたびに最新版を入れていた。コードを変えていないのに
壊れる余地があり、壊れたときに何が変わったのか追えない。
"""

import io
import os
import re

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(name):
    return io.open(os.path.join(ROOT, name), encoding="utf-8").read()


def requirement_lines():
    for line in read("requirements.txt").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            yield line


class TestProcfile:
    def test_開発サーバーで起動していない(self):
        proc = read("Procfile")
        assert "python main.py" not in proc and "python -u main.py" not in proc, (
            "Procfile が Flask の開発サーバーを起動している。"
            "Werkzeug は本番用ではない"
        )

    def test_gunicornで起動する(self):
        assert read("Procfile").strip().startswith("web: gunicorn "), \
            "Procfile が gunicorn で始まっていない"

    def test_WSGIの入口がmain_appである(self):
        assert "main:app" in read("Procfile")

    def test_Renderが渡すポートを使う(self):
        # 固定ポートにすると Render のヘルスチェックが通らない
        assert "$PORT" in read("Procfile")

    def test_タイムアウトがAIの待ち時間より長い(self):
        from modules.ai import _TIMEOUT_SECONDS

        m = re.search(r"--timeout\s+(\d+)", read("Procfile"))
        assert m, "Procfile に --timeout の指定が無い"
        assert int(m.group(1)) > _TIMEOUT_SECONDS, (
            f"gunicorn のタイムアウト {m.group(1)}秒 が "
            f"AI の待ち時間 {_TIMEOUT_SECONDS}秒 以下。"
            "AIの応答を待っている最中にワーカーが落とされる"
        )

    def test_アクセスログを出さない(self):
        # アクセスログにはクエリ文字列が入る。OAuth のコールバックURLには
        # 認可コードと state が乗るため、有効にすると
        # tests/test_privacy.py で塞いだ漏れが別経路で復活する
        assert "--access-logfile" not in read("Procfile"), (
            "アクセスログはクエリ文字列ごと記録する。"
            "OAuth の認可コードがログに残る"
        )


class TestRequirementsPinned:
    def test_すべて版を固定している(self):
        loose = [l for l in requirement_lines() if "==" not in l]
        assert loose == [], (
            f"版が固定されていない依存がある: {loose}。"
            "Render はデプロイのたびに最新を入れる"
        )

    def test_gunicornが入っている(self):
        assert any(l.startswith("gunicorn==") for l in requirement_lines()), \
            "Procfile が gunicorn を使うのに requirements.txt に無い"

    @pytest.mark.parametrize("package", [
        "flask", "flask-cors", "anthropic", "python-dotenv", "requests",
        "supabase", "google-auth", "google-auth-oauthlib",
        "google-api-python-client", "PyJWT[crypto]", "cryptography",
    ])
    def test_使っている依存が残っている(self, package):
        # 整理のときに消すと、ローカルには入ったままなので気づけない
        assert any(l.startswith(f"{package}==") for l in requirement_lines()), \
            f"{package} が requirements.txt から消えている"


class TestPythonVersionPinned:
    def test_版を固定している(self):
        path = os.path.join(ROOT, ".python-version")
        assert os.path.isfile(path), (
            ".python-version が無い。Render は既定版を使うため、"
            "既定が変わるとある日突然インタプリタが変わる"
        )

    def test_形式が正しい(self):
        # Render の .python-version は major.minor でよい（patch は省略可）
        v = read(".python-version").strip()
        assert re.fullmatch(r"\d+\.\d+(\.\d+)?", v), f"版の書き方が不正: {v!r}"


def cors_origins():
    """main.py の CORS(...) に渡している origins を読み取る。

    ファイル全体を文字列で検索すると、コメントに書いた説明にも当たる。
    実際に渡している値だけを見る。
    """
    import ast

    for node in ast.walk(ast.parse(read("main.py"))):
        if not (isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
                and node.func.id == "CORS"):
            continue
        for kw in node.keywords:
            if kw.arg != "origins":
                continue
            if isinstance(kw.value, ast.List):
                return [ast.unparse(e) for e in kw.value.elts]
            return [ast.unparse(kw.value)]
    raise AssertionError("main.py に CORS(origins=...) が見つからない")


class TestCorsOrigins:
    def test_廃止したViteのポートを許可していない(self):
        # frontend/ は 2026-08-04 に廃止した。5173 は存在しない
        bad = [o for o in cors_origins() if "5173" in o]
        assert bad == [], f"廃止した Vite 開発サーバーの origin が残っている: {bad}"

    def test_本番のoriginを許可している(self):
        assert any("lantern-inky-three.vercel.app" in o for o in cors_origins())

    def test_許可元を把握できる数に保つ(self):
        # 増えすぎたら、何のために開けたのか分からなくなる
        origins = cors_origins()
        assert len(origins) <= 4, f"許可元が多い: {origins}"

    def test_全許可にしていない(self):
        src = read("main.py")
        assert 'origins="*"' not in src and "origins='*'" not in src, \
            "CORS を全許可にしている"
