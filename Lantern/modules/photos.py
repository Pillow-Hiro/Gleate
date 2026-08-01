"""写真の保存先の管理。

パスは必ず user_id と date から組み立てる。
クライアントから受け取った文字列をそのままパスに使わない。
"""

import re
from datetime import date as _date_cls

BUCKET = "lantern-photos"

# $ は文字列末尾だけでなく末尾の改行の直前にもマッチするため \Z を使う。
# \d は全角数字など Unicode の数字全般にマッチするため [0-9] で ASCII に固定する。
_DATE_RE = re.compile(r"\A[0-9]{4}-[0-9]{2}-[0-9]{2}\Z")
# user_id は Supabase Auth の UUID。区切り文字や相対参照を含まないことだけ確認する。
_USER_ID_RE = re.compile(r"\A[A-Za-z0-9\-_]+\Z")


def _validate(user_id, date):
    if not user_id or not _USER_ID_RE.match(str(user_id)):
        raise ValueError(f"不正な user_id: {user_id!r}")
    if not date or not _DATE_RE.match(str(date)):
        raise ValueError(f"不正な date: {date!r}")
    # 形式が合っていても実在しない日付（2026-02-30 等）は Postgres の DATE 型が
    # 拒否する。Storage書き込み後にDB更新が失敗して孤児ファイルが残るのを防ぐため、
    # ここで実在する日付かどうかも検証する。
    try:
        _date_cls.fromisoformat(str(date))
    except ValueError:
        raise ValueError(f"実在しない date: {date!r}")


def build_photo_path(user_id, date):
    _validate(user_id, date)
    return f"{user_id}/{date}.jpg"


def build_thumb_path(user_id, date):
    _validate(user_id, date)
    return f"{user_id}/{date}_thumb.jpg"
