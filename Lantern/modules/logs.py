import os
from datetime import datetime, timedelta
from supabase import create_client

_url = os.environ.get("SUPABASE_URL", "")
_key = os.environ.get("SUPABASE_KEY", "")
supabase = create_client(_url, _key) if _url and _key else None

# Supabase カラム名 ↔ アプリ内フィールド名の変換
# Supabase: content / good_things / struggles / next_action / lantern_message / updated_at
# App:      created / enjoyable   / struggled / next        / ai_response     / saved_at

_DB_SELECT_BASE = (
    "id, date, content, next_action, good_things, struggles, "
    "lantern_message, updated_at, user_id"
)
_DB_SELECT = _DB_SELECT_BASE + ", favorite"


def _from_db(row):
    # すべて `or ""` を通すのは、テキスト列が NULL の行が実際に存在するため。
    # `row.get("content", "")` は「キーはあるが値が None」では既定値を返さないため、
    # ここを通さないとクライアントに created: null が渡り、.trim() で落ちる。
    return {
        "date": str(row.get("date") or ""),
        "created": row.get("content") or "",
        "enjoyable": row.get("good_things") or "",
        "struggled": row.get("struggles") or "",
        "next": row.get("next_action") or "",
        "saved_at": row.get("updated_at") or "",
        "ai_response": row.get("lantern_message") or "",
        "favorite": bool(row.get("favorite")),
    }


def _to_db(l, user_id=None):
    # 写真カラムは 2026-08-06 に扱いをやめた。写真は端末の中だけに置く。
    # DBの列は残っているが読み書きしない。ここに足すと、
    # クライアントが送らないフィールドを空で上書きすることになる。
    #
    # **`favorite` も同じ理由でここに入れない。**
    # 記録フォームは favorite を送らない。ここに足すと、
    # 記録を編集するたびにお気に入りが外れる。
    # 付け外しは `set_favorite()` が、その列だけを書く。
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
    # user_id は出さない。誰がいつ書いたかがログに残る
    print(f"[Supabase] _upsert_one: date={row.get('date')} user={bool(user_id)}")
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

def load_logs(user_id):
    """記録を読む。**`user_id` は必ず渡す。**

    既定値を持たせていた頃は、渡し忘れると `.eq("user_id", ...)` が
    付かず、**全員の記録が返っていた。** 呼び出し側は全部渡していたが、
    「渡さなくても動く」形を残しておく理由が無い。
    

    **`favorite` 列が無くても記録を返す。**
    列を足す SQL は人の手で流す。サーバーの配備が先に済むと、
    `select` が落ちて**記録が1件も出ない画面**になる。
    順番に依存させないため、列が無ければ外して読み直す。
    列を足したあとは1回目で通るので、この道は使われなくなる。
    """
    if not user_id:
        raise ValueError("load_logs には user_id が要る")
    if not supabase:
        return []
    for select in (_DB_SELECT, _DB_SELECT_BASE):
        try:
            q = supabase.table("logs").select(select).eq("user_id", user_id)
            result = q.order("date").execute()
            return [_from_db(r) for r in (result.data or [])]
        except Exception as e:
            # 中身は出さない。型と、どちらの select で落ちたかだけ残す
            print(f"[Supabase] load_logs error ({type(e).__name__}), favorite={select is _DB_SELECT}")
    return []


def save_logs(logs, user_id):
    if not supabase or not logs:
        return
    for l in logs:
        _upsert_one(_to_db(l, user_id))


def set_favorite(date, favorite, user_id):
    """お気に入りの付け外し。**その列だけを書く。**

    記録の保存（`save_logs`）とは別の道にしている。
    一緒にすると、記録を編集するたびにお気に入りが外れる
    （クライアントは favorite を送らないため）。

    件数は返さない。「◯件お気に入り」は多い/少ないの評価になる。
    """
    if not supabase:
        return
    (
        supabase.table("logs")
        .update({"favorite": bool(favorite)})
        .eq("date", date)
        .eq("user_id", user_id)
        .execute()
    )


def delete_log_by_date(date, user_id):
    # 写真の削除はここでは行わない。写真は端末の中にしか無い（2026-08-06〜）。
    # 端末側は lib/photoStore.js の remove() が受け持つ。
    if not supabase:
        return
    if not user_id:
        raise ValueError("delete_log_by_date には user_id が要る")
    q = supabase.table("logs").delete().eq("date", date).eq("user_id", user_id)
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
