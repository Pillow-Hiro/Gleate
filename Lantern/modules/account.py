"""アカウントの削除。

## なぜ要るのか

App Store のガイドライン 5.1.1(v) は、**アカウントを作れるアプリに
アプリ内からの削除を置くことを求めている**。無効化では足りない。
Lantern は新規登録を持つため、これが無いと審査を通らない。

要件である以前に、記録アプリとして持っているべき機能でもある。
「自分の言葉を自分で引き上げられる」ことは、預ける側の当然の権利である。

## 順番を守ること

**データを消してから、認証の利用者を消す。** 逆にすると、
認証が先に消えた時点で誰も辿れない行が残る。
`user_id` で引くしかない設計なので、消せないゴミになる。

途中で失敗したら認証の利用者は消さない。
「消えたことになっているのに残っている」状態を作らない。

## user_id で必ず絞ること

`.eq("user_id", ...)` を落とすと全員の記録が消える。
`tests/test_account.py` がこれを機械的に検査する。
"""

# 消す順。子から親へ、ではなく「復元できない順」に並べている。
# どれも user_id を持つ独立した表なので、依存関係はない。
USER_TABLES = (
    "logs",
    "ideas",
    "daily_quotes",
    "youtube_tokens",
    "twitch_tokens",
    "twitch_streams",
)


def _db():
    from modules.logs import supabase
    return supabase


def delete_user_rows(user_id, db=None):
    """利用者の行を全部消す。消せた表と、失敗した表を返す。

    1つ落ちても残りは試す。片付けを途中で止めると、
    どこまで消えたのか分からない状態になる。
    """
    if not user_id:
        raise ValueError("user_id が空")

    db = db or _db()
    deleted, failed = [], []
    for table in USER_TABLES:
        try:
            db.table(table).delete().eq("user_id", user_id).execute()
            deleted.append(table)
        except Exception as e:
            # 表が無い場合もここに来る。存在しない表は消す必要もない
            failed.append((table, f"{type(e).__name__}: {e}"))
    return deleted, failed


def delete_account(user_id, db=None):
    """記録を消してから、認証の利用者を消す。

    戻り値は (成功したか, 詳細)。失敗しても例外は投げない。
    呼び出し元がそのまま利用者に返せる形にする。
    """
    if not user_id:
        raise ValueError("user_id が空")

    db = db or _db()
    deleted, failed = delete_user_rows(user_id, db)

    if failed:
        # 認証の利用者は残す。ここで消すと、残った行を誰も辿れなくなる
        return False, {"deleted": deleted, "failed": failed, "auth_deleted": False}

    try:
        db.auth.admin.delete_user(user_id)
    except Exception as e:
        # 記録は消えている。もう一度呼べば認証だけ消せる
        return False, {
            "deleted": deleted,
            "failed": [("auth", f"{type(e).__name__}: {e}")],
            "auth_deleted": False,
        }

    return True, {"deleted": deleted, "failed": [], "auth_deleted": True}
