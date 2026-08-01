"""写真の保存先の管理。

パスは必ず user_id と date から組み立てる。
クライアントから受け取った文字列をそのままパスに使わない。
"""

import re

BUCKET = "lantern-photos"

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
# user_id は Supabase Auth の UUID。区切り文字や相対参照を含まないことだけ確認する。
_USER_ID_RE = re.compile(r"^[A-Za-z0-9\-_]+$")


def _validate(user_id, date):
    if not user_id or not _USER_ID_RE.match(str(user_id)):
        raise ValueError(f"不正な user_id: {user_id!r}")
    if not date or not _DATE_RE.match(str(date)):
        raise ValueError(f"不正な date: {date!r}")


def build_photo_path(user_id, date):
    _validate(user_id, date)
    return f"{user_id}/{date}.jpg"


def build_thumb_path(user_id, date):
    _validate(user_id, date)
    return f"{user_id}/{date}_thumb.jpg"
