"""AI を呼ぶ回数の上限。

## なぜ要るのか

AI の経路は認証を通るが、**通ったあとの回数を見ていなかった**
（2026-08-15 の精査）。1人が叩き続ければ Anthropic の課金は増える。
鍵が漏れているわけではないので「盗まれる」問題ではなく、
**使いすぎを止められない**問題である。

## なぜプロセスの中で数えないのか

本番は gunicorn で複数ワーカーが動く。プロセス内のカウンタは
ワーカーごとに別なので、**上限が人数ぶん緩む。**
起動画面の写真のキャッシュで同じことを踏んでいる（`main.py`）。

## 表が無くても止まらない

`ai_usage` 表は人の手で作る。**表が無い間は素通しする。**
配備の順番に依存させない、というのは `favorite` 列で決めた形と同じ。
数えられないことを理由に、記録が書けなくなる方が困る。

作る SQL は `docs/sql/ai_usage.sql` にある。

## 数えるのは「AIを呼んだ回数」だけ

**何を書いたかは持たない。** 日付と件数だけ。
利用ログを集めない、という方針（CLAUDE.md）から外れないようにする。
"""

from modules.timeutil import today_str

# **上限はここに持たない。** `modules/plan.py` が唯一の置き場所
# （無料 10 回・有料 30 回）。
#
# 2026-08-23 まで `DAILY_LIMIT = 60` を既定値として持っていた。
# 呼ぶ側（`main.py`）は必ず `plan.daily_limit()` を渡すので
# **一度も使われていなかった**が、数字だけが古いまま残り、
# `HANDOFF.md` にも「1日60回」と書き写されていた。
#
# 既定値を消して、**必ず渡させる。** 2か所に数字があると、
# 片方だけ変えたときに気づけない。


def _db():
    from modules.logs import supabase
    return supabase


def check_and_count(user_id, limit, date=None):
    """今日ぶんを1つ数える。上限を超えていれば False。

    **表が無ければ True**（素通し）。数えられないことを理由に止めない。
    """
    db = _db()
    if not db or not user_id:
        return True

    day = date or today_str()
    try:
        result = (
            db.table("ai_usage")
            .select("count")
            .eq("user_id", user_id)
            .eq("date", day)
            .execute()
        )
    except Exception as e:
        # 表が無い・読めない。**止めない**
        print(f"[RateLimit] 読めなかったので素通し ({type(e).__name__})")
        return True

    rows = result.data or []
    current = rows[0].get("count", 0) if rows else 0
    if current >= limit:
        return False

    try:
        db.table("ai_usage").upsert(
            {"user_id": user_id, "date": day, "count": current + 1},
            on_conflict="user_id,date",
        ).execute()
    except Exception as e:
        # 数えられなくても通す。**数えることが目的ではない**
        print(f"[RateLimit] 数えられなかった ({type(e).__name__})")

    return True
