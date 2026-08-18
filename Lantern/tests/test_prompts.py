"""AIのプロンプトが、AI憲法と矛盾していないかを機械的に検査する。

## なぜ必要か

2026-08-08、実機の出力が記録を並べ直しただけになっていた。

    App Storeへの配信準備が、今日のことです。
    ドメインや認証まわりの登録が、詰まったこととして残っています。

原因は**プロンプトの自己矛盾**だった。
`LANTERN_IDENTITY` は「具体的な活動名を列挙して要約しない」と定めているのに、
`get_ai_response` の指針が真逆を指示していた。

    「よかったこと」「詰まったこと」は記入があれば自然に織り込む
    今日のことへの観察 → 詳細（あれば静かに触れる） → 余白を残して終わる

**より具体的な指示が勝つ。** 憲法を書いておけば守られる、とはならない。

さらに「良い例」自体が加担していた。
「詰まったことが残っています。それだけ向き合っていた時間だったようです。」は
フォームの項目名をなぞっているだけで、その人の記録の話になっていない。
**例は教材なので、悪い例を良い例として置くとそれを学習する。**

## 二層で防ぐ

| 層 | 何を見るか | いつ動くか |
|---|---|---|
| これ（静的） | プロンプトの書き方 | pytest のたび |
| `scripts/audit_ai.py` | 実際の出力 | 手で動かす（APIに課金される） |

静的検査では「出力が良いか」は分からない。書き方の誤りだけを止める。
出力の良し悪しは実際に呼ぶしかない。

**落ちたらテストではなくプロンプトを直すこと。**
"""

import io
import os
import re

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AI_PATH = os.path.join(ROOT, "modules", "ai.py")


def source():
    return io.open(AI_PATH, encoding="utf-8").read()


# 実際に送るだけの関数。プロンプトを組み立てないので対象外。
#
# `call_claude_with_history` は 2026-08-18 に消した（呼び出し元がゼロ）。
# `lantern_prompt` は逆に**必ず人格を渡す**組み立て役なので、
# これを通っている関数は人格を持っている（`has_identity` を参照）。
TRANSPORT = {"call_claude", "lantern_prompt"}


def identity_constants():
    """人格を持ったモジュール定数の名前を集める。

    プロンプトは関数の中で直接組む場合と、モジュール定数にしてから
    渡す場合がある。**後者を見落とすと、正しく書けているのに落ちる。**

    2026-08-18 に `lantern_prompt(...)` の形を足した。
    どちらの形も拾う。
    """
    src = source()
    names = set(re.findall(r"^(_[A-Z_]+)\s*=\s*LANTERN_IDENTITY", src, re.M))
    names |= set(re.findall(r"^(_[A-Z_]+)\s*=\s*lantern_prompt\(", src, re.M))
    return names


def prompt_functions():
    """プロンプトを組み立てて `call_claude` に渡す関数を返す。

    AI に何かを言わせる関数だけが対象。送るだけの関数は除く。
    """
    src = source()
    out = []
    parts = re.split(r"\ndef ", src)
    for part in parts[1:]:
        name = part.split("(")[0].strip()
        if name in TRANSPORT:
            continue
        body = "def " + part
        if "call_claude" in body:
            out.append((name, body))
    return out


def has_identity(body):
    """憲法が渡っているか。定数経由と組み立て役経由も認める。

    **`lantern_prompt()` は人格を必ず前置きする**（`modules/ai.py`）。
    この関数を通っていれば、憲法は渡っている。
    2026-08-18 まで `LANTERN_IDENTITY` の直書きしか見ていなかったので、
    組み立て役に寄せた関数を「人格なし」と誤判定した。
    """
    if "LANTERN_IDENTITY" in body or "lantern_prompt(" in body:
        return True
    return any(c in body for c in identity_constants())


# 人格を持たせない関数。理由を添えて明示的に除外する。
#
# generate_keyword_frequency は頻出語の抽出で、Insights AI憲法が
# 「キーワード抽出は機械的な頻度ベース処理に限定する」と定めている。
# ここに伴走者の人格を入れると、解釈や感情分類が混ざる。
NO_PERSONA = {"generate_keyword_frequency"}

# CLAUDE.md の禁止ワード。**例文に混ざっていないか**を見る。
# 例は教材なので、ここに入れた時点で出力に出る。
BANNED_IN_EXAMPLES = [
    "頑張", "素晴らし", "よく頑張", "必ず", "きっと",
    "しましょう", "してみてください", "継続すること自体が力",
    "一歩", "前進", "成長", "充実",
    "お久しぶり", "ぶりですね", "記録が途切れ",
]

# 「全項目に触れろ」と読める指示。これがあると並べ直しが起きる。
ENUMERATION_HINTS = [
    "織り込む", "溶け込ませる",
    "それぞれ触れ", "順に触れ", "すべてに触れ", "全てに触れ",
]

# 記録フォームの項目名。**例文の主語になっていたら赤信号。**
# 「詰まったことが残っています」はフォームの話であって、記録の話ではない。
FIELD_LABELS = ["よかったこと", "詰まったこと", "困ったこと", "次にやること"]


def example_lines(body):
    """【良い例】ブロックの中の行を返す。悪い例は対象外。"""
    # 「【良い例】」だけでなく「【記録がある場合の良い例】」のような
    # 名前付きのブロックも拾う。**最初の版はこれを取りこぼし、
    # generate_video_insight の悪い例文を見逃していた。**
    out = []
    for m in re.finditer(r"【[^】]*良い例[^】]*】(.*?)(?=【|\"\"\")", body, re.S):
        out += [l.strip() for l in m.group(1).splitlines() if l.strip()]
    return out


class TestIdentityIsAlwaysPresent:
    """憲法を渡し忘れていないか。"""

    @pytest.mark.parametrize("name,body", prompt_functions(),
                             ids=lambda v: v if isinstance(v, str) else "")
    def test_人格を渡している(self, name, body):
        if name in NO_PERSONA:
            pytest.skip(f"{name} は機械処理のため人格を持たせない")
        assert has_identity(body), (
            f"{name} が LANTERN_IDENTITY を渡していない。"
            "禁止ワードも原則も効かない状態で AI に喋らせている。"
            "人格が不要な処理なら NO_PERSONA に理由つきで足すこと"
        )

    def test_除外は理由つきで管理する(self):
        # 増えていないか。増やすときは docstring に理由を書く
        assert NO_PERSONA == {"generate_keyword_frequency"}, (
            "人格を持たせない関数を増やした。"
            "本当に機械処理か、憲法を外す言い訳になっていないか確認すること"
        )


class TestExamplesDoNotTeachBadHabits:
    """例文が禁止事項を教えていないか。

    プロンプトの例は教材である。ここに入れたものは出力に出る。
    """

    @pytest.mark.parametrize("name,body", prompt_functions(),
                             ids=lambda v: v if isinstance(v, str) else "")
    def test_良い例に禁止ワードが無い(self, name, body):
        hits = []
        for line in example_lines(body):
            hits += [w for w in BANNED_IN_EXAMPLES if w in line]
        assert hits == [], f"{name} の良い例に禁止ワード: {sorted(set(hits))}"

    @pytest.mark.parametrize("name,body", prompt_functions(),
                             ids=lambda v: v if isinstance(v, str) else "")
    def test_良い例が項目名をなぞっていない(self, name, body):
        """「詰まったことが残っています」型を止める。

        フォームの項目名を主語にした文は、記録の話ではなく入力欄の話。
        どの記録にも当てはまる文は、その人の記録ではない。
        """
        bad = []
        for line in example_lines(body):
            for label in FIELD_LABELS:
                # 「〇〇が」「〇〇は」で始まる＝項目名が主語
                if re.search(rf"「?{label}」?[がはを]", line):
                    bad.append(line)
        assert bad == [], (
            f"{name} の良い例が項目名を主語にしている:\n  " + "\n  ".join(bad)
        )


class TestNoEnumerationInstruction:
    """全項目を並べろ、と指示していないか。"""

    @pytest.mark.parametrize("name,body", prompt_functions(),
                             ids=lambda v: v if isinstance(v, str) else "")
    def test_列挙を指示していない(self, name, body):
        # 【悪い例】の中は対象外。そこに書くのは正しい
        without_bad = re.sub(r"【悪い例[^】]*】.*?(?=【|\"\"\")", "", body, flags=re.S)
        hits = [w for w in ENUMERATION_HINTS if w in without_bad]
        assert hits == [], (
            f"{name} が全項目に触れるよう指示している: {hits}。"
            "LANTERN_IDENTITY の「具体的な活動名を列挙して要約しない」と衝突する"
        )


class TestNoMarkdownInPrompts:
    """Markdown を禁じながら、例で使っていないか。"""

    @pytest.mark.parametrize("name,body", prompt_functions(),
                             ids=lambda v: v if isinstance(v, str) else "")
    def test_例にMarkdownが無い(self, name, body):
        bad = [l for l in example_lines(body) if "**" in l or l.startswith("#")]
        assert bad == [], f"{name} の例に Markdown: {bad}"


class TestDetectorWorks:
    """検査そのものが効いているか。"""

    def test_人格の欠落を捕まえる(self):
        body = 'def f():\n    system_prompt = "適当"\n    call_claude(system_prompt, "")\n'
        assert not has_identity(body)

    def test_定数経由の人格を見落とさない(self):
        # `_PATTERNS_SYSTEM = LANTERN_IDENTITY + "..."` の形。
        # ここを追えないと、正しく書けているのに落ちる（最初の版で実際に落ちた）
        consts = identity_constants()
        assert consts, "LANTERN_IDENTITY を含む定数が見つからない"
        one = sorted(consts)[0]
        assert has_identity(f"def f():\n    call_claude({one}, '')\n")

    def test_送るだけの関数は対象外(self):
        names = {n for n, _ in prompt_functions()}
        assert not (names & TRANSPORT), "送信用の関数を検査対象にしている"

    def test_良い例の禁止ワードを捕まえる(self):
        body = 'def f():\n    x = """【良い例】\n「成長しましたね。」\n"""\n    call_claude(x, "")\n'
        hits = [w for w in BANNED_IN_EXAMPLES if any(w in l for l in example_lines(body))]
        assert "成長" in hits

    def test_項目名の主語を捕まえる(self):
        body = ('def f():\n    x = """【良い例】\n'
                '「詰まったことが残っています。」\n"""\n    call_claude(x, "")\n')
        lines = example_lines(body)
        assert any(re.search(r"「?詰まったこと」?[がはを]", l) for l in lines)

    def test_列挙の指示を捕まえる(self):
        body = 'def f():\n    x = "詰まったことは自然に織り込む"\n    call_claude(x, "")\n'
        assert any(w in body for w in ENUMERATION_HINTS)
