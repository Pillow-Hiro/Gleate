"""
Lantern データ移行スクリプト: data/logs.json → Supabase

実行方法:
  python migrate.py

前提:
  - .env に SUPABASE_URL / SUPABASE_KEY が設定済み
  - Supabase に logs テーブルが作成済み

Supabase カラムマッピング:
  app.created      → db.content
  app.enjoyable    → db.good_things
  app.struggled    → db.struggles
  app.next         → db.next_action
  app.ai_response  → db.lantern_message
  app.saved_at     → db.updated_at
"""

import json
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

DATA_FILE = "data/logs.json"


def upsert_one(client, row):
    existing = client.table("logs").select("id").eq("date", row["date"]).execute()
    if existing.data:
        update_fields = {k: v for k, v in row.items() if k != "date"}
        client.table("logs").update(update_fields).eq("date", row["date"]).execute()
        return "updated"
    else:
        client.table("logs").insert(row).execute()
        return "inserted"


def migrate():
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_KEY", "")
    if not url or not key:
        print("ERROR: SUPABASE_URL / SUPABASE_KEY が .env に設定されていません")
        return

    client = create_client(url, key)

    if not os.path.exists(DATA_FILE):
        print(f"ERROR: {DATA_FILE} が見つかりません")
        return

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        logs = json.load(f)

    if not logs:
        print("移行するデータがありません")
        return

    print(f"{len(logs)} 件のログを Supabase に移行します...")

    inserted = updated = errors = 0
    for l in logs:
        if not l.get("date"):
            continue
        row = {
            "date": l["date"],
            "content": l.get("created", ""),
            "good_things": l.get("enjoyable", ""),
            "struggles": l.get("struggled", ""),
            "next_action": l.get("next", ""),
            "lantern_message": l.get("ai_response", ""),
            "updated_at": l.get("saved_at") or None,
        }
        try:
            action = upsert_one(client, row)
            if action == "inserted":
                inserted += 1
            else:
                updated += 1
            print(f"  {action}: {l['date']} - {str(l.get('created',''))[:30]}")
        except Exception as e:
            print(f"  ERROR {l['date']}: {e}")
            errors += 1

    print(f"\n完了: inserted={inserted}, updated={updated}, errors={errors}")


if __name__ == "__main__":
    migrate()
