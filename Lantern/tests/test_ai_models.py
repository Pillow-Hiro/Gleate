# -*- coding: utf-8 -*-
"""どの生成がどちらの模型を使うか（2026-09-13）。

作者の指示は「**有料だけ Opus 5、今日の灯りは Sonnet 5**」。

無料側は毎日呼ばれ、有料側は月に1回か押したときだけ。呼ばれる回数が
二桁違うので、同じ模型にする理由が無い。**深く見てほしい所にだけ
重いものを置く。**

## この検査が守るもの

対応そのものより、**分類し忘れ**を止める。`call_claude` を呼ぶ関数を
増やしたとき、どちらの模型かを決めないまま通ると、
**黙って既定側（安いほう）に落ちる。**落ちても動くので気づけない。

有料かどうかの正は `main.py` の `@require_paid` と、月次だけを有料に
している `reviews` の判定。**「週次の振り返り」は無料**なので既定側。
"""
import ast
import io
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 有料の入口から呼ばれるもの。**ここに足すときは `main.py` を見ること**
DEEP = {
    "get_monthly_review",          # 月次の振り返り
    "generate_timeline_reflection",  # 過去との対話
    "generate_channel_insight",    # YouTube チャンネル
    "generate_video_insight",      # YouTube 動画
    "generate_stream_insight",     # Twitch 配信
    "generate_deepen",             # 深掘り（有料）
}


def _functions_calling_claude():
    src = io.open(os.path.join(ROOT, "modules", "ai.py"), encoding="utf-8").read()
    tree = ast.parse(src)
    out = {}
    for node in tree.body:
        if not isinstance(node, ast.FunctionDef):
            continue
        deep = False
        calls = False
        for sub in ast.walk(node):
            if isinstance(sub, ast.Call) and getattr(sub.func, "id", "") == "call_claude":
                calls = True
                for kw in sub.keywords:
                    if kw.arg == "model" and getattr(kw.value, "id", "") == "_MODEL_DEEP":
                        deep = True
        if calls:
            out[node.name] = deep
    return out


class TestModelSplit:
    def test_有料の生成は重いほうを使う(self):
        found = _functions_calling_claude()
        missing = sorted(n for n in DEEP if not found.get(n))
        assert missing == [], (
            "有料の入口から呼ばれるのに既定の模型のまま: " + ", ".join(missing)
        )

    def test_無料の生成は既定のままにする(self):
        found = _functions_calling_claude()
        extra = sorted(n for n, deep in found.items() if deep and n not in DEEP)
        assert extra == [], (
            "無料で毎日呼ばれるのに重い模型を使っている: " + ", ".join(extra)
            + "。費用が読めなくなる"
        )

    # **分類し忘れを止める。**落ちても動くので、検査でしか気づけない
    def test_新しい生成は分類されるまで通さない(self):
        found = _functions_calling_claude()
        known = DEEP | {
            "get_splash_quote",
            "get_ai_response",
            "get_weekly_review",       # 週次は無料（main.py の reviews）
            "get_daily_quote",         # 今日の灯り
            "generate_milestone_reflection",
            "generate_keyword_frequency",  # 1.0.0 がまだ叩く
            "generate_hint",
            "generate_hint_question",
        }
        unknown = sorted(set(found) - known)
        assert unknown == [], (
            "どちらの模型か決まっていない生成: " + ", ".join(unknown)
            + "。`tests/test_ai_models.py` の一覧に足すこと"
        )


class TestModelNames:
    def test_二つ持っている(self):
        from modules import ai

        assert ai._MODEL_DEFAULT != ai._MODEL_DEEP

    def test_既定は渡さなくても効く(self):
        """`model` を渡さない呼び出しが既定側に落ちること。

        **落ちる先が無いと、無料側が全部止まる。**
        """
        src = io.open(os.path.join(ROOT, "modules", "ai.py"), encoding="utf-8").read()
        assert "chosen = model or _MODEL_DEFAULT" in src
