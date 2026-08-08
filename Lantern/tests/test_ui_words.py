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
    assert hits == [], os.path.basename(path) + "\n" + "\n".join(hits)


def test_検査が実際に拾えること():
    """検査そのものを疑う。

    2026-08-08 に `test_prompts.py` が誤検出と見逃しの両方を出した。
    見張り役が空振りしていないことを、既知の悪い文で確かめる。
    """
    bad = ["const a = '記録を始めましょう'"]
    assert any(w in bad[0] for w, _ in BANNED)
