"""手がかりを使った回数を数える。**通算。日ごとではない。**

最初の `FREE_HINTS` 回だけ無料で、そのあとは有料プランで開く
（`modules/plan.py`）。1日あたりの上限は `modules/ratelimit.py` が
別に見ている。**役割が違うので混ぜない。**

## 表が無ければ通す

`docs/sql/hint_usage.sql` は人の手で流す。
**読めない間は無料の範囲として扱う。**

逆にすると、表の作成が遅れただけで、
誰も手がかりを使えない状態になる。`modules/ratelimit.py`
`modules/plan.py` と同じ考え方で揃えている。

**公開前に必ず流すこと。** 流し忘れると全員が無制限になる。
"""

from modules.plan import FREE_HINTS


def _db():
    from modules.logs import supabase
    return supabase


def used_count(user_id):
    """その人が使った回数。**読めなければ 0**（無料の範囲として扱う）。"""
    db = _db()
    if not db or not user_id:
        return 0
    try:
        result = (
            db.table("hint_usage")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .execute()
        )
        return result.count or 0
    except Exception as e:
        print(f"[Hint] hint_usage を読めないので無料として扱う ({type(e).__name__})")
        return 0


def has_free_left(user_id):
    """無料の枠が残っているか。"""
    return used_count(user_id) < FREE_HINTS


def record_use(user_id):
    """1回使ったことを残す。**失敗しても止めない。**

    数え漏らしても、利用者に見える壊れ方はしない。
    ここで例外を投げると、手がかりが出た直後に画面が失敗する。
    """
    db = _db()
    if not db or not user_id:
        return
    try:
        db.table("hint_usage").insert({"user_id": user_id}).execute()
    except Exception as e:
        print(f"[Hint] 使用の記録に失敗 ({type(e).__name__})")
