import os
from datetime import datetime, timedelta
from supabase import create_client

_url = os.environ.get("SUPABASE_URL", "")
_key = os.environ.get("SUPABASE_KEY", "")
supabase = create_client(_url, _key) if _url and _key else None

# Supabase カラム名 ↔ アプリ内フィールド名の変換
# Supabase: content / good_things / struggles / next_action / lantern_message / updated_at
# App:      created / enjoyable   / struggled / next        / ai_response     / saved_at

_DB_SELECT = (
    "id, date, content, next_action, good_things, struggles, "
    "lantern_message, updated_at, user_id, photo_path, photo_thumb_path"
)


def _from_db(row):
    return {
        "date": str(row.get("date", "")),
        "created": row.get("content", ""),
        "enjoyable": row.get("good_things", ""),
        "struggled": row.get("struggles", ""),
        "next": row.get("next_action", ""),
        "saved_at": row.get("updated_at", "") or "",
        "ai_response": row.get("lantern_message", ""),
        "photo_path": row.get("photo_path", "") or "",
        "photo_thumb_path": row.get("photo_thumb_path", "") or "",
    }


def _to_db(l, user_id=None):
    # 写真カラム（photo_path / photo_thumb_path）は意図的に含めない。
    # /save は受け取ったデータから entry を作り直すため、ここに写真を足すと
    # テキストだけを編集したときに写真が消える。
    # 写真の更新は main.py の /api/logs/<date>/photo だけが行う。
    return {
        "date": l.get("date", ""),
        "content": l.get("created", ""),
        "good_things": l.get("enjoyable", ""),
        "struggles": l.get("struggled", ""),
        "next_action": l.get("next", ""),
        "lantern_message": l.get("ai_response", ""),
        "updated_at": l.get("saved_at") or datetime.now().isoformat(),
        "user_id": user_id,
    }


def _upsert_one(row):
    user_id = row.get("user_id")
    print(f"[Supabase] _upsert_one: date={row.get('date')} user_id={user_id}")
    try:
        q = supabase.table("logs").select("id").eq("date", row["date"])
        if user_id:
            q = q.eq("user_id", user_id)
        existing = q.execute()
        if existing.data:
            update_fields = {k: v for k, v in row.items() if k != "date"}
            supabase.table("logs").update(update_fields).eq("date", row["date"]).eq("user_id", user_id).execute()
            print(f"[Supabase] updated: {row.get('date')}")
        else:
            supabase.table("logs").insert(row).execute()
            print(f"[Supabase] inserted: {row.get('date')}")
    except Exception as e:
        print(f"[Supabase] _upsert_one FAILED: {type(e).__name__}: {e}")
        raise


# ── ログ ─────────────────────────────────────────────────────────

def load_logs(user_id=None):
    if not supabase:
        return []
    try:
        q = supabase.table("logs").select(_DB_SELECT)
        if user_id:
            q = q.eq("user_id", user_id)
        result = q.order("date").execute()
        return [_from_db(r) for r in (result.data or [])]
    except Exception as e:
        print(f"[Supabase] load_logs error: {e}")
        return []


def save_logs(logs, user_id=None):
    if not supabase or not logs:
        return
    for l in logs:
        _upsert_one(_to_db(l, user_id))


def delete_log_by_date(date, user_id=None):
    if not supabase:
        return
    q = supabase.table("logs").delete().eq("date", date)
    if user_id:
        q = q.eq("user_id", user_id)
    q.execute()


# ── 今日の灯り（日次キャッシュ） ──────────────────────────────────

def load_daily_quote(user_id, date):
    """その日の灯りが保存済みならテキストを返す。なければ None。"""
    if not supabase or not user_id:
        return None
    try:
        result = (
            supabase.table("daily_quotes")
            .select("quote")
            .eq("user_id", user_id)
            .eq("date", date)
            .limit(1)
            .execute()
        )
        if result.data:
            return result.data[0].get("quote") or None
    except Exception as e:
        print(f"[Supabase] load_daily_quote error: {e}")
    return None


def save_daily_quote(user_id, date, quote, source):
    """その日の灯りを保存する。保存に失敗しても表示は妨げない。"""
    if not supabase or not user_id or not quote:
        return
    try:
        supabase.table("daily_quotes").insert({
            "user_id": user_id,
            "date": date,
            "quote": quote,
            "source": source,
        }).execute()
        print(f"[Supabase] daily_quote saved: {date} source={source}")
    except Exception as e:
        # (user_id, date) の unique 制約違反 = 別リクエストが先に保存した場合を含む
        print(f"[Supabase] save_daily_quote error: {e}")


# ── 目標 ─────────────────────────────────────────────────────────

def load_goals():
    if not supabase:
        return {"vision": "", "monthly_goals": [], "weekly_goals": []}
    try:
        result = supabase.table("goals").select("*").eq("id", 1).execute()
        if result.data:
            row = result.data[0]
            return {
                "vision": row.get("vision", ""),
                "monthly_goals": row.get("monthly_goals", []) or [],
                "weekly_goals": row.get("weekly_goals", []) or [],
            }
    except Exception as e:
        print(f"[Supabase] load_goals error: {e}")
    return {"vision": "", "monthly_goals": [], "weekly_goals": []}


def save_goals_data(goals):
    if not supabase:
        return
    try:
        existing = supabase.table("goals").select("id").eq("id", 1).execute()
        payload = {
            "id": 1,
            "vision": goals.get("vision", ""),
            "monthly_goals": goals.get("monthly_goals", []),
            "weekly_goals": goals.get("weekly_goals", []),
            "updated_at": datetime.now().isoformat(),
        }
        if existing.data:
            supabase.table("goals").update(payload).eq("id", 1).execute()
        else:
            supabase.table("goals").insert(payload).execute()
    except Exception as e:
        print(f"[Supabase] save_goals_data error: {e}")


# ── 日付ヘルパー（変更なし） ──────────────────────────────────────

def get_week_str():
    return datetime.now().strftime("%Y-W%W")


def get_month_str():
    return datetime.now().strftime("%Y-%m")


def get_month_display_str():
    today = datetime.now()
    return f"{today.year}年{today.month}月"


def get_week_display_str():
    today = datetime.now()
    sunday = today - timedelta(days=(today.weekday() + 1) % 7)
    saturday = sunday + timedelta(days=6)
    pad = lambda n: str(n).zfill(2)
    return f"{sunday.year}/{pad(sunday.month)}/{pad(sunday.day)}〜{pad(saturday.month)}/{pad(saturday.day)}"


def get_current_weekly_goal(goals):
    week = get_week_str()
    for wg in reversed(goals.get("weekly_goals", [])):
        if wg.get("week") == week:
            return wg.get("goal", "")
    return ""


def get_current_monthly_goal(goals):
    month = get_month_str()
    for mg in reversed(goals.get("monthly_goals", [])):
        if mg.get("month") == month:
            return mg.get("goal", "")
    return ""
