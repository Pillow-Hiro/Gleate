"""既にある記録を暗号化する。**何度流してもよい。**

暗号化はサーバーが書くときに自動でかかる（`modules/logs.py`）。
これは**鍵を入れる前に書かれた行**を、後から包み直すためのもの。

## 使い方

    python scripts/encrypt_logs.py --dry-run   # 数えるだけ
    python scripts/encrypt_logs.py             # 実際に包む

`LANTERN_ENC_KEYS` が要る。無ければ何もせず終わる。

## 途中で止まっても壊れない

1行ずつ包んで書き戻す。**平文と暗号文が混ざった状態でもアプリは動く**
（`_from_db` が両方読める）。落ちたらもう一度流せばよい。

## updated_at を動かさない

包み直しは中身の変更ではない。**時刻を打ち直すと、
控えを持っているクライアントが「新しい記録が来た」と誤解する**
（差分同期は `updated_at` で比べる。`client/lib/logsCache.js`）。
"""

import argparse
import io
import os
import pathlib
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

_env = pathlib.Path(__file__).resolve().parent.parent / ".env"
if _env.exists():
    for raw in io.open(_env, encoding="utf-8").read().splitlines():
        if "=" in raw and not raw.strip().startswith("#"):
            k, v = raw.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

from modules import crypto  # noqa: E402
from modules.logs import _SECRET_FIELDS, supabase  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="数えるだけ。書き換えない")
    args = ap.parse_args()

    if not crypto.is_enabled():
        print("LANTERN_ENC_KEYS が無い。何もしない")
        return
    if not supabase:
        print("Supabase に繋がらない")
        return

    rows = supabase.table("logs").select("*").execute().data or []
    print(f"記録: {len(rows)}件")

    todo = []
    for r in rows:
        plain_fields = [f for f in _SECRET_FIELDS
                        if (r.get(f) or "") and not crypto.is_encrypted(r[f])]
        if plain_fields:
            todo.append((r, plain_fields))

    print(f"包む対象: {len(todo)}件")
    if args.dry_run or not todo:
        for r, fields in todo[:5]:
            print(f"  {r['date']}: {', '.join(fields)}")
        if len(todo) > 5:
            print(f"  ... 他 {len(todo) - 5}件")
        return

    done = 0
    for r, fields in todo:
        aad = str(r.get("user_id") or "")
        patch = {f: crypto.encrypt(r[f], aad) for f in fields}
        try:
            # **updated_at は触らない**（上の理由）
            supabase.table("logs").update(patch).eq("id", r["id"]).execute()
            done += 1
        except Exception as e:
            # 1行落ちても続ける。混ざった状態でもアプリは動く
            print(f"  失敗 {r['date']}: {type(e).__name__}")

    print(f"包んだ: {done}/{len(todo)}件")
    print("残りが 0 でなければ、もう一度流してよい")


main()
