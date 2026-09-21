# -*- coding: utf-8 -*-
"""Gleate の問いに答えた言葉を、**記録の項目とは別に持つ**（2026-09-22・作者の判断）。

## なぜ分けたか

2026-09-04 から、手がかりの問いへの答えは `logs.struggles`（困ったこと）に
入れていた。「手がかりを押す人は、いま詰まっている」という前提だったが、
**前提は外れる。**作者の記録では、旅の記録に置かれた問いへの答えが
困ったこととして残っていた。困ってはいない。

困ったことに混ぜると、

- `modules/facts.py` が困ったことの語だけを数えるので、**答えがつまずきになる**
- 振り返りと深掘りが「（困ったこと: …）」と項目名付きで読む
- ホームの「今週の発見」が最新の困ったこととして拾う

## ここに入るもの

| kind | 何の答えか |
|---|---|
| `hint` | 手がかりの問いに答えた言葉（`client/components/HintPanel.jsx`） |
| `reading` | 深掘りで、本人が選んだ見立て（2026-09-22・作者の判断で候補から選ぶ形にした） |

## 表が無い間も画面は止めない

`docs/sql/log_answers.sql` は人の手で流す。読めなければ空、書けなければ false。
`modules/hintusage.py` と同じ考え方で揃えている。
**公開前に必ず流すこと。**流し忘れると、答えがどこにも残らない。
"""
from modules.crypto import decrypt, encrypt

KINDS = ("hint", "reading")

# 1回に読む上限。**振り返りが読むのは3か月ぶん**（`modules/deepen.py`）なので足りる
_LIMIT = 200


def _db():
    from modules.logs import supabase
    return supabase


def _out(row):
    """**復号はここ1か所**（`modules/logs.py` の `_from_db` と同じ形）"""
    aad = str(row.get("user_id") or "")
    return {
        "id": row.get("id"),
        "log_id": row.get("log_id") or "",
        "date": row.get("date") or "",
        "kind": row.get("kind") or "hint",
        "question": decrypt(row.get("question") or "", aad),
        "answer": decrypt(row.get("answer") or "", aad),
        "created_at": row.get("created_at") or "",
    }


def save_answer(user_id, log_id, date, question, answer, kind="hint"):
    """答えを残す。**残せたかどうかを返す。例外は投げない。**

    画面は答えを見せたあとに呼ばれる。ここで落とすと、
    利用者には何が起きたのか分からない。
    """
    db = _db()
    answer = (answer or "").strip()
    if not db or not user_id or not answer or not date:
        return False

    row = {
        "user_id": user_id,
        "date": date,
        "kind": kind if kind in KINDS else "hint",
        "question": encrypt((question or "").strip(), user_id),
        "answer": encrypt(answer, user_id),
    }
    # **記録に紐づかない答えも残す。**記録が消えれば道連れになる（SQL の on delete cascade）
    if log_id:
        row["log_id"] = log_id
    try:
        db.table("log_answers").insert(row).execute()
        # 中身は書かない（`tests/test_privacy.py`）
        print(f"[Answers] 残した: {date} kind={row['kind']}")
        return True
    except Exception as e:
        print(f"[Answers] 残せなかった ({type(e).__name__})")
        return False


def load_answers(user_id, since=None):
    """その人の答え。**読めなければ空**（表が無い間も画面は出る）。"""
    db = _db()
    if not db or not user_id:
        return []
    try:
        q = db.table("log_answers").select("*").eq("user_id", user_id)
        if since:
            q = q.gte("date", since)
        result = q.order("date", desc=True).limit(_LIMIT).execute()
        return [_out(r) for r in (result.data or [])]
    except Exception as e:
        print(f"[Answers] log_answers を読めない ({type(e).__name__})")
        return []
