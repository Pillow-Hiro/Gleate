"""CORS の許可元。

2026-08-15 まで `re.compile(r'https://lantern-.*\\.vercel\\.app')` を許していた。
flask-cors は `re.match`（先頭一致）で見るため**後ろが開いており**、
`https://lantern-x.vercel.app.attacker.example` まで通っていた。

`.*` も広すぎる。`lantern-` で始まる vercel.app のサブドメインは
誰でも作れるので、他人の Vercel から叩ける状態だった。

Lantern は Cookie ではなく Bearer トークンで認証するので、
これだけで即座に情報が漏れるわけではない。**ただし許可を広く出す理由も無い。**
"""

import re

import pytest

from main import app


def _origin_patterns():
    """CORS に渡している正規表現を取り出す。

    flask-cors は `app.extensions` ではなく `after_request` に畳み込むため、
    設定した値そのものを見るには初期化時の引数を辿るしかない。
    ここでは `main.py` の呼び出しを読む方が確実で壊れにくい。
    """
    import io
    import os

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    source = io.open(os.path.join(root, "main.py"), encoding="utf-8").read()
    # **コメント行は読まない。** 直した経緯として古い正規表現を
    # コメントに残してあるので、それを拾うと落ちる
    code = "\n".join(l for l in source.splitlines() if not l.lstrip().startswith("#"))
    return re.findall(r"re\.compile\(r'([^']+)'\)", code)


class Test許可元の正規表現:
    def test_前後を留めている(self):
        patterns = _origin_patterns()
        assert patterns, "CORS の正規表現が見つからない"
        for p in patterns:
            assert p.startswith("^"), f"先頭が留まっていない: {p}"
            assert p.endswith("$"), f"末尾が留まっていない: {p}"

    def test_任意の文字を並べていない(self):
        # `.*` を許すと、想定しないホストまで入る
        for p in _origin_patterns():
            assert ".*" not in p, f"広すぎる: {p}"

    @pytest.mark.parametrize(
        "origin",
        [
            "https://lantern-x.vercel.app.attacker.example",
            "https://evil.com/https://lantern-x.vercel.app",
            "http://lantern-x.vercel.app",
            "https://lantern-x.vercel.app.evil",
        ],
    )
    def test_似せた出どころを弾く(self, origin):
        for p in _origin_patterns():
            assert not re.match(p, origin), f"{p} が {origin} を通した"

    @pytest.mark.parametrize(
        "origin",
        [
            "https://lantern-inky-three.vercel.app",
            "https://lantern-abc123.vercel.app",
        ],
    )
    def test_本来の出どころは通す(self, origin):
        assert any(re.match(p, origin) for p in _origin_patterns()), origin


class Test本文の上限:
    def test_上限を決めている(self):
        # 上限が無いと、大きな本文を投げるだけでメモリを食わせられる。
        # 記録は文章だけで、写真も添付も端末の中に置く
        assert app.config.get("MAX_CONTENT_LENGTH")
        assert app.config["MAX_CONTENT_LENGTH"] <= 5 * 1024 * 1024
