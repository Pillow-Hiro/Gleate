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


def review_windows(review_type, now=None):
    """振り返りが読む期間と、比べる前の期間。`((始まり, 終わり), (始まり, 終わり))`。

    ## 2つは重ならない（2026-09-14）

    今週は「7日前から今日まで」、先週は「月曜から日曜」と、**別の数え方で
    切っていた。** 月曜には先週がまるごと今週の中に入る。

    モデルは同じ記録を「週の記録」と「先週のログ」の2回受け取り、
    「今週と先週で、9月7日と9月9日の記録が同じ言葉で書かれています」と返した。
    深掘りは当然「同じ話に見える記録は、見つかりませんでした」になる。
    **モデルは渡されたものを読んでいた。渡し方が間違っていた。**

    ついでに、今週は今日を含めて8日あった。画面は「過去7日間」、
    数えた事実にも7日として渡している。今週は今日を含めて7日にする。

    月は暦で切る（今月の1日から今日まで／先月まるごと）。こちらは重なっていなかった。
    """
    today = today_date(now)
    if review_type == "weekly":
        start = today - timedelta(days=6)
        prev_end = start - timedelta(days=1)
        prev_start = prev_end - timedelta(days=6)
    else:
        start = today.replace(day=1)
        prev_end = start - timedelta(days=1)
        prev_start = prev_end.replace(day=1)
    return (
        (start.isoformat(), today.isoformat()),
        (prev_start.isoformat(), prev_end.isoformat()),
    )


def now_utc_iso():
    """保存時刻。timestamptz に入れるためオフセットを明示する。"""
    return datetime.now(timezone.utc).isoformat()
