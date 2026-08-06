"""記録の中身と資格情報がサーバーログに出ないことを機械的に検査する。

## なぜ必要か

Render のログは保存され、あとから読める。
**記録アプリのサーバーログに記録の中身を残さない。**

2026-08-06 に実際に3か所見つかった。

- `modules/ai.py` が JSON 解析に失敗したとき、AI出力の先頭200文字を出していた。
  AI憲法の原則2に従い、AIは利用者が実際に残した言葉を引用する。
  つまりAI出力には記録の中身が混ざる
- `main.py` の YouTube コールバックが、クエリ全体と完全URLを出していた。
  `code` は認可コードそのもので、`state` には user_id が入っている
- `modules/logs.py` が保存のたびに user_id を出していた。
  誰がいつ書いたかがログに残る

どれも「気をつける」では防げない。書いた本人がデバッグ中に足すため。

## 何を見ているか

ソースを読んで、出力（print / logger）の引数に
記録のフィールドや資格情報が入っていないかを見る。
実行時のログそのものは見ない。**落ちたら出力の方を直すこと。**
"""

import ast
import io
import os

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 検査するソース。tests/ と scripts/ は本番で動かないため対象外
TARGETS = [
    "main.py",
    os.path.join("modules", "ai.py"),
    os.path.join("modules", "auth.py"),
    os.path.join("modules", "ideas.py"),
    os.path.join("modules", "logs.py"),
    os.path.join("modules", "oauth_state.py"),
    os.path.join("modules", "timeutil.py"),
    os.path.join("modules", "twitch.py"),
    os.path.join("modules", "youtube.py"),
]

# 記録そのもの。DBのカラム名とアプリのフィールド名の両方
RECORD_NAMES = {
    "content", "good_things", "struggles", "next_action", "lantern_message",
    "created", "enjoyable", "struggled", "ai_response",
    "quote", "text",
}

# AIとの往復。プロンプトにも応答にも記録が混ざる
AI_NAMES = {"raw", "user_message", "system_prompt", "past_context", "logs_text", "answer"}

# 資格情報・本人を特定するもの
SECRET_NAMES = {
    "code", "code_verifier", "access_token", "refresh_token", "token",
    "client_secret", "api_key", "state", "user_id", "jwt", "password",
}

FORBIDDEN = RECORD_NAMES | AI_NAMES | SECRET_NAMES

# 値を明かさずに包む書き方。この中身までは追わない。
#   bool(code)      有無だけ
#   len(raw)        長さだけ
#   type(e).__name__ 型名だけ
#   _shape(raw)     長さと先頭の文字種だけ（modules/ai.py に実装がある）
SAFE_WRAPPERS = {"bool", "len", "isinstance", "type", "id", "_shape"}


def _sources():
    for rel in TARGETS:
        path = os.path.join(ROOT, rel)
        yield rel, io.open(path, encoding="utf-8").read()


def _is_output_call(node):
    """print(...) か logger.xxx(...) か。"""
    f = node.func
    if isinstance(f, ast.Name) and f.id == "print":
        return True
    if isinstance(f, ast.Attribute) and isinstance(f.value, ast.Name):
        return f.value.id in ("logger", "logging")
    return False


def _names_in(node):
    """式に現れる識別子・属性名・添え字の文字列を集める。

    値を明かさない包み（bool / len など）の中には降りない。
    文字列を弄って再パースすると f-string を壊すため、木のまま歩く。
    """
    found = set()

    def walk(n):
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) \
                and n.func.id in SAFE_WRAPPERS:
            return
        if isinstance(n, ast.Name):
            found.add(n.id)
        elif isinstance(n, ast.Attribute):
            found.add(n.attr)
        elif isinstance(n, ast.Constant) and isinstance(n.value, str):
            # row["content"] / row.get("content") / getattr(row, "content") を
            # まとめて拾う。書き方ごとに条件を足すと、次の書き方で漏れる。
            # 文言そのもの（"[Supabase] 保存した" 等）は完全一致しないので当たらない。
            found.add(n.value)
        for child in ast.iter_child_nodes(n):
            walk(child)

    walk(node)
    return found


def _violations(rel, src):
    """出力に禁止した名前が混ざっている箇所を返す。"""
    bad = []
    for node in ast.walk(ast.parse(src)):
        if not isinstance(node, ast.Call) or not _is_output_call(node):
            continue
        hits = set()
        for arg in node.args:
            hits |= _names_in(arg) & FORBIDDEN
        if hits:
            bad.append(f"{rel}:{node.lineno}: {sorted(hits)} -> {ast.unparse(node)[:90]}")
    return bad


class TestNoSecretsInLogs:
    @pytest.mark.parametrize("rel", TARGETS)
    def test_出力に記録や資格情報を渡していない(self, rel):
        src = io.open(os.path.join(ROOT, rel), encoding="utf-8").read()
        bad = _violations(rel, src)
        assert bad == [], (
            "サーバーログに記録の中身か資格情報が出る:\n  " + "\n  ".join(bad)
            + "\n有無だけを出すなら bool(...) にする"
        )

    def test_リクエストの中身をそのまま出していない(self):
        # request.url / request.args には code と state が入る
        for rel, src in _sources():
            for node in ast.walk(ast.parse(src)):
                if not isinstance(node, ast.Call) or not _is_output_call(node):
                    continue
                text = ast.unparse(node)
                for danger in ("request.url", "request.args", "request.form", "request.json"):
                    assert danger not in text, f"{rel}:{node.lineno}: {danger} を出力している"


class TestDetectorWorks:
    """検査そのものが効いているか。素通しなら守れていない。"""

    def test_記録の中身を出すコードを捕まえる(self):
        src = 'def f(log):\n    print(f"{log[\'content\']}")\n'
        assert _violations("x.py", src)

    def test_getで取り出しても捕まえる(self):
        # このコードで実際に使われている書き方。最初の版はここを見逃した
        src = 'def f(row):\n    print(f"{row.get(\'content\')}")\n'
        assert _violations("x.py", src)

    def test_getattrで取り出しても捕まえる(self):
        src = 'def f(row):\n    print(getattr(row, "next_action"))\n'
        assert _violations("x.py", src)

    def test_普通の文言は誤検出しない(self):
        # 禁止語と完全一致しない限り当たらない
        src = 'def f():\n    print("[Twitch] トークンを更新した")\n'
        assert not _violations("x.py", src)

    def test_AI出力を出すコードを捕まえる(self):
        src = 'def f(raw):\n    print(f"先頭: {raw[:200]}")\n'
        assert _violations("x.py", src)

    def test_認可コードを出すコードを捕まえる(self):
        src = 'def f(code):\n    logger.info(f"code={code}")\n'
        assert _violations("x.py", src)

    def test_user_idを出すコードを捕まえる(self):
        src = 'def f(user_id):\n    print(f"user={user_id}")\n'
        assert _violations("x.py", src)

    def test_有無だけなら通す(self):
        src = 'def f(code):\n    logger.info(f"code={bool(code)}")\n'
        assert not _violations("x.py", src)

    def test_出力以外は見ない(self):
        # 保存や送信そのものは当然テキストを扱う。見るのは出力だけ
        src = 'def f(raw):\n    return save(raw)\n'
        assert not _violations("x.py", src)


class TestPhotosStayOnDevice:
    """写真をサーバーへ戻していないこと。

    2026-08-06 に Supabase Storage への保存をやめた。
    保存されていれば、サーバーの鍵を持つ開発者が中身を見られるため。
    """

    def test_写真モジュールが復活していない(self):
        assert not os.path.exists(os.path.join(ROOT, "modules", "photos.py"))

    def test_写真を受けるルートが無い(self):
        from main import app

        paths = [str(r) for r in app.url_map.iter_rules()]
        assert not [p for p in paths if "photo" in p], f"写真のルートがある: {paths}"

    def test_写真カラムを読み書きしない(self):
        src = io.open(os.path.join(ROOT, "modules", "logs.py"), encoding="utf-8").read()
        tree = ast.parse(src)
        for node in ast.walk(tree):
            if isinstance(node, ast.Constant) and isinstance(node.value, str):
                assert "photo_path" not in node.value, "写真カラムを扱っている"
