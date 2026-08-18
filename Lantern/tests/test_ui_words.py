"""画面の文言が AI憲法の禁止ワードを含んでいないか。

**AIの出力だけを見張っても足りない。**
2026-08-09 に `client/app/(tabs)/journal.jsx` で2箇所見つかった。

    日付をタップして記録を始めましょう
    今日のタブから記録を始めましょう

「〇〇しましょう」は CLAUDE.md の禁止ワードで、
「ユーザーを正しい方向に導こうとしない」という原則に正面から反する。
`tests/test_prompts.py` はプロンプトを見るが、**画面に直接書いた
日本語は誰も見ていなかった。**

問いの資産と同じ考え方で機械に見張らせる。
落ちたらテストではなく文言を直すこと。
"""
import os
import re

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLIENT = os.path.join(ROOT, "client")

# CLAUDE.md「禁止ワード」から、画面の文言として現れうるものだけを取る。
# 「〇〇しましょう」「〇〇してみてください」は命令・助言なので最優先。
BANNED = [
    ("ましょう", "命令・勧誘。ユーザーを導かない"),
    ("してみてください", "助言。ユーザーが決める"),
    ("頑張", "評価しない"),
    ("素晴らし", "評価しない"),
    ("成長", "意味づけはユーザーが行う"),
    ("充実", "評価しない"),
    ("日ぶり", "離脱期間に言及しない"),
    ("久しぶり", "離脱期間に言及しない"),
    ("途切れ", "連続の途切れを煽らない"),
    ("必ず", "断定して約束しない"),
]

# 「一歩」「前進」は熟語の一部として自然に出うるため、単独で使われた
# ときだけ拾う。今のところ実物には無い。
BANNED_EXACT = ["一歩", "前進"]

# **2026-08-18 の言葉の精査で見つけた型。**
#
# 上の BANNED は CLAUDE.md の禁止ワードを字面のまま並べたもので、
# **言い換えを取り逃していた。** 実際に画面に出ていた例を足す。
BANNED_2026_08_18 = [
    ("歩み", "「一歩」「前進」と同じ比喩。記録を進み具合として評価する枠になる"),
    ("気づきを届け", "意味づけは利用者が行う。AIは並べるところまで"),
    ("見つけたこと", "発見は解釈。プロンプト側は全編「観察」で通っている"),
    ("生成中", "LLMの言葉。AIを待つ場面は「読んでいます」で揃える"),
    ("観察中", "利用者が観察される側に読める"),
    ("見えてきます", "未来の約束。「きっと〇〇できます」と同じ形"),
]

# **画面で「AI」と名乗らない。** 他は全部 Lantern を主語にしている。
# 日本語に隣接した AI だけを拾う（`aiRef` のような識別子は見ない）。
AI_NAMING = re.compile(r"(AI[ぁ-んァ-ヶ一-龥]|[ぁ-んァ-ヶ一-龥]AI)")

# **`？` は答えが要るときだけ。**
#
# 答えを求めない問いは `。` で終える（原則3「問いには正解を求めない。
# ユーザーが答えなくてもいい」）。`modules/questions/data.py` の全50問が
# そうなっている。破ってよいのは、実際に答えを迫る確認だけ。
QUESTION_MARK_ALLOWED = {
    ("LogDetail.jsx", "削除しますか？"),  # 消すかどうかは答えが要る
}


def jsx_files():
    out = []
    for sub in ("app", os.path.join("app", "(tabs)"), "components"):
        d = os.path.join(CLIENT, sub)
        if not os.path.isdir(d):
            continue
        for f in sorted(os.listdir(d)):
            if f.endswith(".jsx"):
                out.append(os.path.join(d, f))
    return out


def visible_text(src):
    """コメントを除いた行を返す。

    禁止ワードの説明をコメントに書けるようにするため。
    実際 `LogSnapshot.jsx` は「離脱期間に触れない」と注記している。
    """
    src = re.sub(r"\{/\*.*?\*/\}", "", src, flags=re.S)
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    return [ln for ln in src.splitlines() if not ln.strip().startswith("//")]


@pytest.mark.parametrize("path", jsx_files(), ids=lambda p: os.path.basename(p))
def test_禁止ワードを含まない(path):
    import io

    src = io.open(path, encoding="utf-8").read()
    hits = []
    for i, line in enumerate(visible_text(src), 1):
        for word, why in BANNED:
            if word in line:
                hits.append(f"{i}行目 「{word}」（{why}）: {line.strip()[:60]}")
        for word in BANNED_EXACT:
            if re.search(rf"[^ぁ-んァ-ヶ一-龠]{word}[^ぁ-んァ-ヶ一-龠]", line):
                hits.append(f"{i}行目 「{word}」: {line.strip()[:60]}")
        for word, why in BANNED_2026_08_18:
            if word in line:
                hits.append(f"{i}行目 「{word}」（{why}）: {line.strip()[:60]}")
    assert hits == [], os.path.basename(path) + "\n" + "\n".join(hits)


def test_検査が実際に拾えること():
    """検査そのものを疑う。

    2026-08-08 に `test_prompts.py` が誤検出と見逃しの両方を出した。
    見張り役が空振りしていないことを、既知の悪い文で確かめる。
    """
    bad = ["const a = '記録を始めましょう'"]
    assert any(w in bad[0] for w, _ in BANNED)


@pytest.mark.parametrize("path", jsx_files(), ids=lambda p: os.path.basename(p))
def test_画面でAIと名乗らない(path):
    """**呼び名を Lantern に揃える。**

    2026-08-18 まで、ログイン画面が「AI伴走者」と名乗り、
    サーバーの待ち時間の文が「AIの応答に時間がかかっています」だった。
    他の場所（Lanternが観察したこと・Lanternに聞く・今日の灯り）は
    全部 Lantern を主語にしている。**混ざると「静かな伴走者」が薄まる。**
    """
    import io

    src = io.open(path, encoding="utf-8").read()
    hits = [
        f"{i}行目: {line.strip()[:60]}"
        for i, line in enumerate(visible_text(src), 1)
        if AI_NAMING.search(line)
    ]
    assert hits == [], os.path.basename(path) + chr(10) + chr(10).join(hits)


@pytest.mark.parametrize("path", jsx_files(), ids=lambda p: os.path.basename(p))
def test_答えを求めない問いに疑問符を使わない(path):
    """`？` は答えを迫る形。

    許すのは `QUESTION_MARK_ALLOWED` に書いたものだけ。
    足すときは、**本当に答えが要る問いかどうか**を考えること。
    """
    import io

    name = os.path.basename(path)
    src = io.open(path, encoding="utf-8").read()
    hits = []
    for i, line in enumerate(visible_text(src), 1):
        if "？" not in line:
            continue
        if any(name == f and allowed in line for f, allowed in QUESTION_MARK_ALLOWED):
            continue
        hits.append(f"{i}行目: {line.strip()[:60]}")
    assert hits == [], name + chr(10) + chr(10).join(hits)
