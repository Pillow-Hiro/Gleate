"""アイデアの溜め場。

「思いついた瞬間に置いて、後で拾うもの」を扱う。
日付に紐づく記録（logs）とは性質が違うため別テーブルにしている。
logs の4項目はその日を振り返る構造で、混ぜると性質が濁る。

**done ではなく picked_at を持つ。**
アイデアは達成すべきタスクではない。done にすると未完了が負債に見え、
「〇件未完了」のような表示に繋がる。それは Lantern が最も避けている形。
"""

from datetime import datetime, timezone

# 1行のメモとして扱う。長文は記録（logs）の側に書くもの
MAX_LENGTH = 200


def _db():
    from modules.logs import supabase
    return supabase


def add_idea(user_id, text):
    """アイデアを1件追加する。空なら何もせず False を返す。"""
    cleaned = (text or "").strip()
    if not cleaned:
        return False
    db = _db()
    if not db:
        return False
    db.table("ideas").insert({
        "user_id": user_id,
        "text": cleaned[:MAX_LENGTH],
    }).execute()
    return True


def load_ideas(user_id, limit=200):
    """新しい順に返す。拾ったものも消さずに残す。"""
    db = _db()
    if not db:
        return []
    result = (
        db.table("ideas")
        .select("id, text, created_at, picked_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


def set_picked(user_id, idea_id, picked):
    """拾ったかどうかを切り替える。

    user_id で必ず絞る。絞り漏れは他人のアイデアを書き換える経路になる。
    """
    db = _db()
    if not db:
        return
    picked_at = datetime.now(timezone.utc).isoformat() if picked else None
    (
        db.table("ideas")
        .update({"picked_at": picked_at})
        .eq("id", idea_id)
        .eq("user_id", user_id)
        .execute()
    )


def delete_idea(user_id, idea_id):
    db = _db()
    if not db:
        return
    db.table("ideas").delete().eq("id", idea_id).eq("user_id", user_id).execute()
