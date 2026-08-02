"""アプリの日付基準。

Render は UTC で動くが、利用者は JST にいる。
サーバーが naive な datetime.now() から日付を作ると、JST 00:00〜09:00 の
9時間だけ日付が1日前になり、「今日の灯り」が前日のものになる。
日付の判定は必ずここを通すこと。

時刻そのもの（saved_at）は UTC のまま扱う。DB の timestamptz に入るため、
ローカル時刻を入れると解釈がずれる。日付だけを JST に寄せる。
"""

import os
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

# 個人利用前提のため単一のタイムゾーンでよい。
# 引っ越しや検証用に環境変数で上書きできるようにしておく。
APP_TZ = ZoneInfo(os.environ.get("APP_TIMEZONE", "Asia/Tokyo"))


def now_local(now=None):
    """アプリのタイムゾーンでの現在時刻。

    now を渡せる形にしているのはテストのため。
    naive な値を渡された場合は UTC とみなす（サーバーが UTC で動くため）。
    """
    base = now or datetime.now(timezone.utc)
    if base.tzinfo is None:
        base = base.replace(tzinfo=timezone.utc)
    return base.astimezone(APP_TZ)


def today_date(now=None):
    return now_local(now).date()


def today_str(now=None):
    return today_date(now).isoformat()


def days_ago_str(days, now=None):
    return (today_date(now) - timedelta(days=days)).isoformat()


def now_utc_iso():
    """保存時刻。timestamptz に入れるためオフセットを明示する。"""
    return datetime.now(timezone.utc).isoformat()
