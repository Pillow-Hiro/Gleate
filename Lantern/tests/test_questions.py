"""問いの資産の検査。

問いは資産として増やしていく。50問を手で書いた時点でも
「〇〇しましょう」「成長」のような言葉は自然に混ざる。
増えるほど目視では守れなくなるため、全件を機械的に検査する。

ここが落ちたら、テストを直す前に問いの文面を直すこと。
検査条件はAI憲法（CLAUDE.md）から取っている。
"""

import pytest

from modules.questions import (
    QUESTIONS,
    TAXONOMY,
    WRITING_CATEGORIES,
    pick_for_writing,
    pick_for_subcategory,
)

# CLAUDE.md「禁止ワード」より。評価・約束・命令にあたる語
FORBIDDEN_WORDS = [
    "頑張", "素晴らし", "よく頑張",
    "必ず", "きっと",
    "しましょう", "してみてください", "してください",
    "継続すること自体が力",
    "一歩", "前進", "成長", "充実",
    "お久しぶり", "ぶりですね", "記録が途切れ",
]

# Markdown はプロンプト設計の原則で禁止されている
MARKDOWN_MARKERS = ["**", "##", "---", "__", "- ["]

MAX_LENGTH = 40


class TestAssetIntegrity:
    def test_問いが存在する(self):
        assert len(QUESTIONS) >= 50

    def test_IDが重複していない(self):
        ids = [q["id"] for q in QUESTIONS]
        duplicates = {i for i in ids if ids.count(i) > 1}
        assert not duplicates, f"IDが重複している: {duplicates}"

    def test_本文が重複していない(self):
        texts = [q["text"] for q in QUESTIONS]
        duplicates = {t for t in texts if texts.count(t) > 1}
        assert not duplicates, f"同じ問いが複数ある: {duplicates}"

    def test_分類が定義済みのものに収まっている(self):
        for q in QUESTIONS:
            assert q["category"] in TAXONOMY, f"{q['id']}: 未定義の大分類 {q['category']}"
            assert q["subcategory"] in TAXONOMY[q["category"]], (
                f"{q['id']}: {q['category']} に {q['subcategory']} は無い"
            )

    def test_すべての小分類に問いがある(self):
        # 分類だけ作って問いが無い状態を防ぐ。選択時に空になる
        for category, subs in TAXONOMY.items():
            for sub in subs:
                found = [q for q in QUESTIONS if q["category"] == category and q["subcategory"] == sub]
                assert found, f"{category} > {sub} に問いが無い"


class TestConstitution:
    """AI憲法に反する問いが混ざっていないこと。"""

    @pytest.mark.parametrize("question", QUESTIONS, ids=lambda q: q["id"])
    def test_禁止ワードを含まない(self, question):
        hits = [w for w in FORBIDDEN_WORDS if w in question["text"]]
        assert not hits, f"{question['id']} に禁止ワード {hits}: {question['text']}"

    @pytest.mark.parametrize("question", QUESTIONS, ids=lambda q: q["id"])
    def test_Markdownを含まない(self, question):
        hits = [m for m in MARKDOWN_MARKERS if m in question["text"]]
        assert not hits, f"{question['id']} に Markdown {hits}"

    @pytest.mark.parametrize("question", QUESTIONS, ids=lambda q: q["id"])
    def test_問いの形で終わる(self, question):
        # 「〜してください」のような助言ではなく、問いであること
        assert question["text"].endswith("か。"), (
            f"{question['id']} が問いで終わっていない: {question['text']}"
        )

    @pytest.mark.parametrize("question", QUESTIONS, ids=lambda q: q["id"])
    def test_1行で読める長さ(self, question):
        assert len(question["text"]) <= MAX_LENGTH, (
            f"{question['id']} が長い（{len(question['text'])}文字）: {question['text']}"
        )

    # 丁寧体の語尾。過去形（ましたか・でしたか）も含める
    POLITE_ENDINGS = ("ですか。", "ますか。", "ましたか。", "でしたか。")

    @pytest.mark.parametrize("question", QUESTIONS, ids=lambda q: q["id"])
    def test_丁寧体である(self, question):
        assert question["text"].endswith(self.POLITE_ENDINGS), (
            f"{question['id']} が丁寧体でない: {question['text']}"
        )


class TestPickForWriting:
    def test_同じ日は同じ問いになる(self):
        # 読み込むたびに変わると「選び直せるもの」に見えて書く手が止まる
        a = pick_for_writing("2026-08-05")
        b = pick_for_writing("2026-08-05")
        assert a["id"] == b["id"]

    def test_日が変われば変わりうる(self):
        picked = {pick_for_writing(f"2026-08-{d:02d}")["id"] for d in range(1, 29)}
        assert len(picked) > 1, "28日ぶんすべて同じ問いになっている"

    def test_書き始める前には振り返りの問いを出さない(self):
        # 振り返りは書いた後に置く分類。書く前に出すと役割が混ざる
        for d in range(1, 29):
            q = pick_for_writing(f"2026-08-{d:02d}")
            assert q["category"] in WRITING_CATEGORIES, (
                f"{q['id']} は {q['category']} で、書き始める前には出さない分類"
            )

    def test_一か月で問いが重複しない(self):
        # 独立ハッシュで選んでいた頃は3日あけて同じ問いが出た。
        # 毎日開くアプリでは雑に見えるため巡回にしている
        picked = [pick_for_writing(f"2026-08-{d:02d}")["id"] for d in range(1, 32)]
        assert len(set(picked)) == len(picked), "1か月のうちに同じ問いが再び出ている"

    def test_問いの数だけ日が経つまで重複しない(self):
        from datetime import date, timedelta
        from modules.questions import WRITING_CATEGORIES as cats
        pool_size = len([q for q in QUESTIONS if q["category"] in cats])

        start = date(2026, 8, 1)
        picked = [
            pick_for_writing((start + timedelta(days=i)).isoformat())["id"]
            for i in range(pool_size)
        ]
        assert len(set(picked)) == pool_size, "一巡する前に重複している"

    def test_どの起点から数えても一巡ぶんは重複しない(self):
        # 周の境界をまたぐ位置でも成り立つこと。
        # 以前は一巡ごとに並びを変えており、境界付近で重複していた
        from datetime import date, timedelta
        from modules.questions import WRITING_CATEGORIES as cats
        pool_size = len([q for q in QUESTIONS if q["category"] in cats])

        base = date(2026, 1, 1)
        for offset in range(0, 90):
            start = base + timedelta(days=offset)
            window = [
                pick_for_writing((start + timedelta(days=i)).isoformat())["id"]
                for i in range(pool_size)
            ]
            assert len(set(window)) == pool_size, (
                f"{start} から {pool_size} 日のうちに重複がある"
            )


class TestPickForSubcategory:
    def test_指定した分類から選ぶ(self):
        q = pick_for_subcategory("創作", "壁", "seed")
        assert q["category"] == "創作" and q["subcategory"] == "壁"

    def test_同じseedなら同じ結果(self):
        a = pick_for_subcategory("日常", "感情", "x")
        b = pick_for_subcategory("日常", "感情", "x")
        assert a["id"] == b["id"]

    def test_存在しない分類ならNone(self):
        assert pick_for_subcategory("創作", "存在しない", "x") is None
