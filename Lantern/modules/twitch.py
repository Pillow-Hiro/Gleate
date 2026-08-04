"""Twitch 連携。認可とAPI呼び出し、配信の取得。

YouTube と同じ認可コードフローを使うが、違いが3つある。

1. PKCE を使わない。Twitch がサポートしていないため、付けると認可が通らない
2. 過去配信（VOD）は一定期間で消える。取得した時点で保存し、
   VOD が消えても Lantern には残るようにする
3. リフレッシュトークンは1回限りの使い捨て。更新のたびに保存し直す必要がある。
   保存漏れはその場では気づけず、次の更新で連携が切れる
"""

import os
import re
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import requests

from modules.oauth_state import build_state, parse_state  # noqa: F401

TWITCH_CLIENT_ID = os.environ.get("TWITCH_CLIENT_ID")
TWITCH_CLIENT_SECRET = os.environ.get("TWITCH_CLIENT_SECRET")

# Twitch に渡すリダイレクト先。必ず main.py の /api/twitch/callback と一致させること。
# 既定値はローカルのFlask。本番は Render の環境変数 TWITCH_REDIRECT_URI で上書きする。
# YouTube では既定値が Vite のポートを指していて認可コードが届かない状態が
# 本番に入っていたため、tests/test_twitch.py で実ルートとの一致を固定している。
REDIRECT_URI = os.environ.get(
    "TWITCH_REDIRECT_URI",
    "http://localhost:5000/api/twitch/callback",
)

AUTHORIZE_URL = "https://id.twitch.tv/oauth2/authorize"
TOKEN_URL = "https://id.twitch.tv/oauth2/token"
HELIX_BASE = "https://api.twitch.tv/helix"

# フォロワー数の取得に必要。他は user access token だけで読める
_SCOPES = ["moderator:read:followers"]

# 期限のこれだけ手前で更新する。呼び出しの途中で切れるのを防ぐ
_REFRESH_MARGIN_SECONDS = 300
_TIMEOUT_SECONDS = 10


# ── 認可 ─────────────────────────────────────────────────────────

def get_auth_url(user_id, platform="web"):
    params = {
        "client_id": TWITCH_CLIENT_ID or "",
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(_SCOPES),
        "state": build_state(user_id, platform),
    }
    return f"{AUTHORIZE_URL}?{urlencode(params)}"


def expiry_from_expires_in(expires_in, now=None):
    """expires_in（秒）から期限を出す。タイムゾーン付きで返す。"""
    if not expires_in:
        return None
    base = now or datetime.now(timezone.utc)
    return base + timedelta(seconds=int(expires_in))


def needs_refresh(token_expiry):
    """更新が必要かを返す。

    期限が不明・壊れている場合も True にする。
    分からないまま使って 401 になるより、先に更新した方が安い。
    """
    if not token_expiry:
        return True
    try:
        expiry = datetime.fromisoformat(str(token_expiry).replace("Z", "+00:00"))
    except ValueError:
        return True
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) >= expiry - timedelta(seconds=_REFRESH_MARGIN_SECONDS)


def exchange_code_for_token(code):
    """認可コードをトークンに交換する。"""
    res = requests.post(
        TOKEN_URL,
        data={
            "client_id": TWITCH_CLIENT_ID,
            "client_secret": TWITCH_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": REDIRECT_URI,
        },
        timeout=_TIMEOUT_SECONDS,
    )
    res.raise_for_status()
    return res.json()


def refresh_access_token(refresh_token):
    """アクセストークンを更新する。

    Twitch のリフレッシュトークンは1回限りの使い捨てで、
    応答に含まれる新しい refresh_token を必ず保存し直すこと。
    古いものを持ち続けると次の更新で失敗する。
    """
    res = requests.post(
        TOKEN_URL,
        data={
            "client_id": TWITCH_CLIENT_ID,
            "client_secret": TWITCH_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=_TIMEOUT_SECONDS,
    )
    res.raise_for_status()
    return res.json()


# ── 配信データの変換 ──────────────────────────────────────────────

_DURATION_RE = re.compile(r"^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$")


def parse_duration(duration):
    """Twitch の "3h21m33s" 形式を秒に変換する。読めなければ None。"""
    if not duration:
        return None
    m = _DURATION_RE.match(str(duration).strip())
    if not m or not any(m.groups()):
        return None
    h, mi, s = (int(g) if g else 0 for g in m.groups())
    return h * 3600 + mi * 60 + s


def video_to_stream(video, user_id):
    """Twitch の VOD を twitch_streams の1行に変換する。

    サムネイルは保存しない。TwitchのサムネイルURLはVODと一緒に死ぬため、
    保存しても壊れたリンクが残るだけになる。
    """
    return {
        "user_id": user_id,
        "video_id": str(video.get("id", "")),
        "title": video.get("title") or "",
        "started_at": video.get("created_at") or None,
        "duration_seconds": parse_duration(video.get("duration")),
        "view_count": video.get("view_count") or 0,
        "url": video.get("url") or "",
    }


# ── トークンの保存 ────────────────────────────────────────────────

def _db():
    from modules.logs import supabase
    return supabase


def save_tokens(user_id, token_response, broadcaster_id=None, display_name=None):
    """トークンを保存する。

    refresh_token は毎回この応答のものに置き換える。Twitch のリフレッシュトークンは
    1回限りの使い捨てで、古いものを持ち続けると次の更新で失敗する。
    """
    db = _db()
    if not db:
        return
    payload = {
        "user_id": user_id,
        "access_token": token_response.get("access_token"),
        "refresh_token": token_response.get("refresh_token"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    expiry = expiry_from_expires_in(token_response.get("expires_in"))
    if expiry:
        payload["token_expiry"] = expiry.isoformat()
    if broadcaster_id:
        payload["broadcaster_id"] = broadcaster_id
    if display_name:
        payload["display_name"] = display_name

    existing = db.table("twitch_tokens").select("user_id").eq("user_id", user_id).execute()
    if existing.data:
        db.table("twitch_tokens").update(payload).eq("user_id", user_id).execute()
    else:
        db.table("twitch_tokens").insert(payload).execute()


def get_tokens(user_id):
    db = _db()
    if not db:
        return None
    result = db.table("twitch_tokens").select("*").eq("user_id", user_id).execute()
    return result.data[0] if result.data else None


def delete_tokens(user_id):
    """連携を解除する。保存済みの配信（twitch_streams）は消さない。

    VOD が消えても Lantern には残る、という設計の核心にあたるため、
    連携を切っても記録は残す。
    """
    db = _db()
    if not db:
        return
    db.table("twitch_tokens").delete().eq("user_id", user_id).execute()


def get_valid_access_token(user_id):
    """有効なアクセストークンを返す。必要なら更新して保存し直す。"""
    row = get_tokens(user_id)
    if not row:
        return None, None

    if not needs_refresh(row.get("token_expiry")):
        return row.get("access_token"), row.get("broadcaster_id")

    refresh = row.get("refresh_token")
    if not refresh:
        return None, None

    try:
        token_response = refresh_access_token(refresh)
    except Exception as e:
        # 30日間使わないとリフレッシュトークンが失効する。
        # その場合は連携し直しになるが、ここでは責めずに未連携として扱う
        print(f"[Twitch] トークンの更新に失敗 user={user_id}: {type(e).__name__}: {e}")
        return None, None

    save_tokens(user_id, token_response)
    return token_response.get("access_token"), row.get("broadcaster_id")


# ── 配信の保存 ────────────────────────────────────────────────────

def save_streams(user_id, videos):
    """取得した配信を保存する。既にあるものは上書きする。

    VOD は一定期間で消えるため、取得できたときに残しておく。
    戻り値は保存を試みた件数。
    """
    db = _db()
    if not db or not videos:
        return 0
    rows = [video_to_stream(v, user_id) for v in videos]
    rows = [r for r in rows if r["video_id"]]
    if not rows:
        return 0
    db.table("twitch_streams").upsert(rows, on_conflict="user_id,video_id").execute()
    return len(rows)


def load_streams(user_id, limit=50):
    """保存済みの配信を新しい順に返す。"""
    db = _db()
    if not db:
        return []
    result = (
        db.table("twitch_streams")
        .select("video_id, title, started_at, duration_seconds, view_count, url")
        .eq("user_id", user_id)
        .order("started_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


# ── API 呼び出し ─────────────────────────────────────────────────

def _headers(access_token):
    return {
        "Authorization": f"Bearer {access_token}",
        "Client-Id": TWITCH_CLIENT_ID or "",
    }


def get_current_user(access_token):
    """認可したユーザー自身の情報。broadcaster_id を得るために使う。"""
    res = requests.get(
        f"{HELIX_BASE}/users", headers=_headers(access_token), timeout=_TIMEOUT_SECONDS
    )
    res.raise_for_status()
    items = res.json().get("data") or []
    return items[0] if items else None


def get_videos(access_token, broadcaster_id, limit=20):
    """過去配信（アーカイブ）を新しい順に返す。"""
    res = requests.get(
        f"{HELIX_BASE}/videos",
        headers=_headers(access_token),
        params={"user_id": broadcaster_id, "type": "archive", "first": limit},
        timeout=_TIMEOUT_SECONDS,
    )
    res.raise_for_status()
    return res.json().get("data") or []


def get_follower_count(access_token, broadcaster_id):
    """フォロワー数。moderator:read:followers スコープが要る。"""
    res = requests.get(
        f"{HELIX_BASE}/channels/followers",
        headers=_headers(access_token),
        params={"broadcaster_id": broadcaster_id, "first": 1},
        timeout=_TIMEOUT_SECONDS,
    )
    res.raise_for_status()
    return res.json().get("total", 0)
