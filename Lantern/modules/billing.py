"""RevenueCat からの知らせを受けて `subscriptions` を書く。

## なぜサーバーで受けるのか

端末が「買いました」と言ってくるのを信じると、**言うだけで有料になる。**
Apple のレシートを検証するのは RevenueCat で、その結果を
サーバー同士で受け取る。端末は経路に入らない。

## 認証

RevenueCat の webhook は `Authorization` ヘッダに、こちらが
管理画面で設定した文字列をそのまま載せてくる。**署名ではない。**
だから合わせるだけでよく、合わなければ 401 を返す。

`REVENUECAT_WEBHOOK_SECRET` が未設定なら**受け口ごと閉じる**（503）。
既定値を持たせると、設定を忘れたまま誰でも書ける口が開く。

## 冪等

同じ知らせが2回来ても構わない作りにしてある（`upsert`）。
RevenueCat は再送するので、来ない前提を置かない。
"""

import os

from modules.plan import ACTIVE_STATUSES
from modules.timeutil import now_utc_iso

# RevenueCat のイベント種別 → こちらが持つ状態。
#
# 知らない種別は**触らない**。増えたときに勝手な解釈で
# 権利を消すより、そのままにして気づく方がよい。
EVENT_STATUS = {
    "INITIAL_PURCHASE": "active",
    "RENEWAL": "active",
    "UNCANCELLATION": "active",
    "NON_RENEWING_PURCHASE": "active",
    "SUBSCRIPTION_EXTENDED": "active",
    "TRIAL_STARTED": "trialing",
    "TRIAL_CONVERTED": "active",
    # 解約を押した時点ではまだ期限まで使える。**ここで切らない。**
    "CANCELLATION": "active",
    "BILLING_ISSUE": "in_grace_period",
    "EXPIRATION": "expired",
    "TRIAL_CANCELLED": "expired",
    "REFUND": "expired",
    "SUBSCRIPTION_PAUSED": "paused",
}


def _db():
    from modules.logs import supabase
    return supabase


def secret():
    return os.environ.get("REVENUECAT_WEBHOOK_SECRET", "")


def authorized(header_value):
    """`Authorization` ヘッダが設定と一致するか。

    **未設定なら常に False。** 呼ぶ側が 503 を返す。
    """
    expected = secret()
    if not expected:
        return False
    return header_value == expected


def parse_event(payload):
    """webhook の本文から、書き込むべき行を作る。

    分からない形なら `None`。**推測で書かない。**
    """
    if not isinstance(payload, dict):
        return None
    event = payload.get("event")
    if not isinstance(event, dict):
        return None

    event_type = event.get("type")
    status = EVENT_STATUS.get(event_type)
    if status is None:
        # 知らない種別。触らない
        return None

    # `app_user_id` に Supabase の user_id を入れて購入する
    # （`client/lib/purchases.js` が `logIn()` で渡す）
    user_id = event.get("app_user_id")
    if not user_id:
        return None

    # ミリ秒。無い経路があるので落ちないようにする
    expires_ms = event.get("expiration_at_ms")
    expires_at = None
    if isinstance(expires_ms, (int, float)) and expires_ms > 0:
        from datetime import datetime, timezone

        expires_at = datetime.fromtimestamp(
            expires_ms / 1000, tz=timezone.utc
        ).isoformat()

    return {
        "user_id": user_id,
        "status": status,
        "product_id": event.get("product_id"),
        "expires_at": expires_at,
        "revenuecat_id": event.get("original_app_user_id") or user_id,
        "updated_at": now_utc_iso(),
    }


def apply_event(payload):
    """受け取った知らせを `subscriptions` に反映する。

    戻り値は `(ok, detail)`。**書けなかったことを握りつぶさない** —
    RevenueCat は 2xx 以外なら再送してくれる。
    """
    row = parse_event(payload)
    if row is None:
        # 知らない種別・形。**受け取ったことにする**（再送されても同じ）
        return True, "ignored"

    db = _db()
    if not db:
        return False, "no_db"

    try:
        db.table("subscriptions").upsert(row, on_conflict="user_id").execute()
    except Exception as e:
        # ここで 500 を返すと RevenueCat が再送する。**それでよい**
        print(f"[Billing] subscriptions に書けなかった ({type(e).__name__})")
        return False, "write_failed"

    print(f"[Billing] {row['status']} を反映")
    return True, row["status"]


def is_active_status(status):
    """有料として扱う状態か。判定は `modules/plan.py` に1つだけ置いてある。"""
    return status in ACTIVE_STATUSES
