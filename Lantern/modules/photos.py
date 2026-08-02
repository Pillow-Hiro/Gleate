"""写真の保存先の管理。

パスは必ず user_id と date から組み立てる。
クライアントから受け取った文字列をそのままパスに使わない。
"""

import re
from datetime import date as date_type

BUCKET = "lantern-photos"

# 日付はパスの一部になるので YYYY-MM-DD だけに固定する。
# fromisoformat は 20260801 や 2026W011 も受け付けるため、これに任せると
# 同じ日の写真が別パスに保存され、logs テーブルの DATE 列と対応が取れなくなる。
_DATE_RE = re.compile(r"\A[0-9]{4}-[0-9]{2}-[0-9]{2}\Z")
# user_id は Supabase Auth の UUID。区切り文字や相対参照を含まないことだけ確認する。
# $ は末尾の改行の直前にもマッチするため \Z を使う（"uid\n" を通さない）。
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
        date_type.fromisoformat(str(date))
    except ValueError:
        raise ValueError(f"実在しない date: {date!r}") from None


def build_photo_path(user_id, date):
    _validate(user_id, date)
    return f"{user_id}/{date}.jpg"


def build_thumb_path(user_id, date):
    _validate(user_id, date)
    return f"{user_id}/{date}_thumb.jpg"


_SIGNED_URL_TTL_SECONDS = 3600


def _client():
    """Supabase クライアントを返す。テストで差し替えられるよう関数にしている。"""
    from modules.logs import supabase
    return supabase


def save_photo(user_id, date, photo_bytes, thumb_bytes):
    """本体とサムネイルを保存し (本体パス, サムネイルパス) を返す。

    失敗は握り潰さない。呼び出し元がユーザーにエラーを返す必要がある。
    """
    photo_path = build_photo_path(user_id, date)
    thumb_path = build_thumb_path(user_id, date)

    # 1記録1枚なので同じパスへの上書きが正常系。
    # content-type はバケットが image/jpeg のみ許可しているため必須。
    options = {"content-type": "image/jpeg", "upsert": "true"}

    bucket = _client().storage.from_(BUCKET)
    bucket.upload(photo_path, photo_bytes, file_options=options)
    bucket.upload(thumb_path, thumb_bytes, file_options=options)
    return photo_path, thumb_path


def delete_photo(user_id, date):
    """本体とサムネイルを削除する。

    記録の削除に巻き込まれて500にならないよう、失敗しても例外は外に出さない。
    ただしログには残す（孤児ファイルに気づけるようにするため）。
    """
    try:
        paths = [build_photo_path(user_id, date), build_thumb_path(user_id, date)]
        _client().storage.from_(BUCKET).remove(paths)
    except Exception as e:
        print(f"[Photo] 写真の削除に失敗 user={user_id} date={date}: {type(e).__name__}: {e}")


def signed_url(path):
    """署名付きURLを発行する。パスが無ければ None。

    URLはDBに保存しない。期限が切れて壊れるため、読み出しのたびに発行する。
    1枚のURLが出せなくても記録一覧全体を落とさないよう、失敗時は None を返す。
    """
    if not path:
        return None
    try:
        res = _client().storage.from_(BUCKET).create_signed_url(path, _SIGNED_URL_TTL_SECONDS)
        if isinstance(res, dict):
            return res.get("signedURL") or res.get("signedUrl")
        return getattr(res, "signedURL", None)
    except Exception as e:
        print(f"[Photo] 署名付きURLの発行に失敗 path={path}: {type(e).__name__}: {e}")
        return None
