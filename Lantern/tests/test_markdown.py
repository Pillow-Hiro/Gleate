"""記録の Markdown を剥がせているか。

2026-08-13 に「やったこと」だけ装飾できるようにした。保存は Markdown で、
`**強い**` や `- 箇条書き` が本文に混ざる。

**AI に渡す前に必ず剥がす。** 渡したままだと
- 記法が「その人の言葉」として扱われる
- 応答にも `**` が混ざる（AI憲法「Markdownを使わない」に反する）
- 頻出語に `**曲**` のような語が出る
"""
import re

import pytest

from modules.markdown import strip_markdown


class TestStripMarkdown:
    @pytest.mark.parametrize("src,want", [
        ("**曲**を書いた", "曲を書いた"),
        ("__曲__を書いた", "曲を書いた"),
        ("*曲*を書いた", "曲を書いた"),
        ("_曲_を書いた", "曲を書いた"),
        ("- 曲を書いた", "曲を書いた"),
        ("* 曲を書いた", "曲を書いた"),
        ("+ 曲を書いた", "曲を書いた"),
        ("  - 字下げした箇条書き", "字下げした箇条書き"),
    ])
    def test_記法を外す(self, src, want):
        assert strip_markdown(src) == want

    def test_太字と斜体が混ざっていても外す(self):
        assert strip_markdown("**強い**と*斜め*") == "強いと斜め"

    def test_太字を斜体より先に処理する(self):
        # 逆順だと `**a**` が `*` + `*a*` + `*` に割れて `*a*` が残る
        assert strip_markdown("**a**") == "a"
        assert "*" not in strip_markdown("**a** **b**")

    def test_改行は残す(self):
        # 1行にまとめると、書いた人が分けた意味が失われる
        assert strip_markdown("- 一つ目\n- 二つ目") == "一つ目\n二つ目"

    def test_複数行にまたがる太字も外す(self):
        assert strip_markdown("**一つ目\n二つ目**") == "一つ目\n二つ目"

    def test_記法が無ければそのまま(self):
        assert strip_markdown("ふつうの文章です。") == "ふつうの文章です。"

    def test_空でも落ちない(self):
        assert strip_markdown("") == ""
        assert strip_markdown(None) == ""

    def test_文中のアスタリスクを壊さない(self):
        # 掛け算や強調のつもりでない `*` を消してしまわない
        assert strip_markdown("2 * 3 = 6") == "2 * 3 = 6"

    def test_マイナス記号を箇条書きと誤らない(self):
        # 行頭の `-` でも、後ろに空白が無ければ箇条書きではない
        assert strip_markdown("-5度だった") == "-5度だった"


class TestAiNeverSeesMarkdown:
    """プロンプトを組む側が記法を剥がしているか。

    **これが本題。** `strip_markdown` が正しくても、
    呼び忘れた場所があればそこだけ素通りする。
    """

    MD_LOG = {
        "date": "2026-08-13",
        "created": "**曲**を書いた\n- サビを直した",
        "enjoyable": "*静かな朝*",
        "struggled": "__詰まった__",
        "next": "- 明日つづき",
    }

    def test_一覧の整形に記法が残らない(self):
        from modules.ai import _fmt_logs

        text = _fmt_logs([self.MD_LOG])
        assert "**" not in text and "__" not in text
        assert "- サビ" not in text, "箇条書きの記号が残っている"
        assert "曲を書いた" in text

    def test_項目を読む口が記法を外す(self):
        from modules.ai import _plain

        assert _plain(self.MD_LOG, "created").startswith("曲を書いた")
        assert "*" not in _plain(self.MD_LOG, "enjoyable")

    def test_空なら既定値を返す(self):
        from modules.ai import _plain

        assert _plain({}, "created", "（未記入）") == "（未記入）"
        assert _plain({"created": None}, "created", "（未記入）") == "（未記入）"

    def test_対になっていない記号は消さない(self):
        """**書いた文字を勝手に削らない。**

        `**` だけの行は装飾ではなく、その人が打った文字。
        記法として成立していないものを消すと、書いたものが変わる。
        """
        from modules.ai import _plain

        assert _plain({"created": "**"}, "created") == "**"
        assert _plain({"created": "5 * 3"}, "created") == "5 * 3"


class TestNoRawFieldReadsInAi:
    """`modules/ai.py` が記録の項目を素で読んでいないか。

    **人が守れないので機械に見張らせる。** プロンプトを足すたびに
    `log.get("created", "")` と書きたくなる。1か所でも通ると、
    そこだけ記法が混ざる。

    存在の確認（`if log.get("enjoyable"):`）は対象外。
    値を取り出さないので記法は混ざらない。

    落ちたらテストではなく `_plain()` を使うように直すこと。
    """

    FIELDS = "created|enjoyable|struggled|next"

    def _source(self):
        import os

        root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        with open(os.path.join(root, "modules", "ai.py"), encoding="utf-8") as f:
            return f.read()

    def test_既定値つきのgetを使っていない(self):
        src = self._source()
        hits = re.findall(rf"""\w+\.get\(["']({self.FIELDS})["']\s*,""", src)
        assert hits == [], f"_plain() を使うこと: {hits}"

    def test_添字で読んでいない(self):
        src = self._source()
        hits = re.findall(rf"""\w+\[["']({self.FIELDS})["']\]""", src)
        assert hits == [], f"_plain() を使うこと: {hits}"

    def test_検査が実際に拾えること(self):
        # 見張り役が空振りしていないことを、既知の悪い書き方で確かめる
        bad = 'text += log.get("created", "")'
        assert re.search(rf"""\w+\.get\(["']({self.FIELDS})["']\s*,""", bad)
