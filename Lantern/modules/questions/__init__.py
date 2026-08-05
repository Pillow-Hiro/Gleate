"""問いの選択。

その日の問いは日付から決める。読み込むたびに変わると、
「選び直せるもの」に見えてしまい、書く手が止まる。

AI は使わない。問いは資産（data.py）から選ぶだけで、
呼び出し費用はかからない。
"""

import hashlib
from datetime import date

from modules.questions.data import (  # noqa: F401
    QUESTIONS,
    TAXONOMY,
    WRITING_CATEGORIES,
)


def _for_categories(categories):
    return [q for q in QUESTIONS if q["category"] in categories]


def _pick(pool, seed):
    """seed から決まる1件を返す。同じ seed なら必ず同じ結果になる。"""
    if not pool:
        return None
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    return pool[int(digest, 16) % len(pool)]


def pick_for_writing(date_str):
    """書き始める前に置く問い。創作と日常から1つ選ぶ。

    同じ日は同じ問いになる。日付は JST 基準で渡すこと（modules.timeutil）。

    日付ごとに独立して選ぶと、数日のうちに同じ問いが再び出る
    （実際に3日あけて重複した）。毎日開くアプリでは雑に見える。
    そのため固定の並びを一定間隔で巡回する。

    一巡ごとに並びを変える案も試したが、周の境界をまたいだところで
    近接した重複が起きた（周の末尾と次の周の先頭が近づくため）。
    並びを固定すれば、重複しない間隔が問いの数と厳密に一致する。
    並び順が毎周同じになるが、利用者は1人で間隔は40日あるため許容する。
    """
    pool = _for_categories(WRITING_CATEGORIES)
    if not pool:
        return None
    try:
        ordinal = date.fromisoformat(date_str).toordinal()
    except ValueError:
        return _pick(pool, f"writing:{date_str}")

    order = sorted(
        pool,
        key=lambda q: hashlib.sha256(q["id"].encode("utf-8")).hexdigest(),
    )
    return order[ordinal % len(order)]


def pick_for_subcategory(category, subcategory, seed):
    """分類を指定して選ぶ。

    記録の傾向に合わせて問いを変える用途を想定している
    （「詰まる」が多い時期は 創作>壁 から出す、など）。
    その判定は機械的な頻度処理で行い、AI は使わない。
    """
    pool = [
        q for q in QUESTIONS
        if q["category"] == category and q["subcategory"] == subcategory
    ]
    return _pick(pool, f"{category}:{subcategory}:{seed}")
