import os
import secrets
import hashlib
import base64
import traceback
from datetime import datetime, timezone, timedelta, date as date_type

from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

YOUTUBE_CLIENT_ID = os.environ.get("YOUTUBE_CLIENT_ID")
YOUTUBE_CLIENT_SECRET = os.environ.get("YOUTUBE_CLIENT_SECRET")
REDIRECT_URI = os.environ.get("YOUTUBE_REDIRECT_URI", "http://localhost:5173/youtube/callback")
_SCOPES = ["https://www.googleapis.com/auth/youtube.readonly"]

# user_id -> code_verifier の一時ストア（OAuth フロー完了まで保持）
_verifier_store: dict = {}


def _make_flow():
    client_config = {
        "web": {
            "client_id": YOUTUBE_CLIENT_ID,
            "client_secret": YOUTUBE_CLIENT_SECRET,
            "redirect_uris": [REDIRECT_URI],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }
    return Flow.from_client_config(client_config, scopes=_SCOPES, redirect_uri=REDIRECT_URI)


def _get_db():
    from modules.logs import supabase
    return supabase


def generate_code_verifier():
    return secrets.token_urlsafe(32)


def generate_code_challenge(verifier):
    digest = hashlib.sha256(verifier.encode()).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b'=').decode()


def get_auth_url(user_id):
    flow = _make_flow()
    code_verifier = generate_code_verifier()
    code_challenge = generate_code_challenge(code_verifier)
    _verifier_store[user_id] = code_verifier
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        state=user_id,
        prompt="consent",
        code_challenge=code_challenge,
        code_challenge_method="S256",
    )
    return auth_url


def pop_code_verifier(user_id):
    return _verifier_store.pop(user_id, None)


def exchange_code_for_token(code, user_id):
    code_verifier = pop_code_verifier(user_id)
    print(f"[YouTube] exchange_code_for_token: REDIRECT_URI={REDIRECT_URI} verifier_present={bool(code_verifier)}")
    try:
        flow = _make_flow()
        flow.fetch_token(code=code, code_verifier=code_verifier)
        return flow.credentials
    except Exception as e:
        print(f"[YouTube] exchange_code_for_token FAILED: {type(e).__name__}: {e}")
        print(traceback.format_exc())
        raise


def save_tokens(user_id, credentials):
    db = _get_db()
    if not db:
        print("[YouTube] save_tokens: no DB connection")
        return

    print(f"[YouTube] save_tokens: user_id={user_id} has_token={bool(credentials.token)} has_refresh={bool(credentials.refresh_token)} expiry={credentials.expiry}")

    payload = {
        "user_id": user_id,
        "access_token": credentials.token,
        "token_expiry": credentials.expiry.isoformat() if credentials.expiry else None,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    # refresh_token が None の場合は DB の既存値を上書きしない
    # （creds.refresh() 後は refresh_token が None になる場合がある）
    if credentials.refresh_token:
        payload["refresh_token"] = credentials.refresh_token
    else:
        print("[YouTube] save_tokens: refresh_token is None → preserving existing DB value")

    try:
        from googleapiclient.discovery import build
        youtube = build("youtube", "v3", credentials=credentials, cache_discovery=False)
        response = youtube.channels().list(part="snippet", mine=True).execute()
        if response.get("items"):
            ch = response["items"][0]
            payload["channel_id"] = ch["id"]
            payload["channel_name"] = ch["snippet"]["title"]
            print(f"[YouTube] save_tokens: channel_name={payload['channel_name']}")
    except Exception as e:
        print(f"[YouTube] save_tokens: channel fetch error (continuing): {e}")

    existing = db.table("youtube_tokens").select("id").eq("user_id", user_id).execute()
    if existing.data:
        print("[YouTube] save_tokens: UPDATE existing row")
        db.table("youtube_tokens").update(payload).eq("user_id", user_id).execute()
        print("[YouTube] save_tokens: UPDATE done")
    else:
        if "refresh_token" not in payload:
            print("[YouTube] save_tokens: INSERT skipped (no refresh_token)")
            return
        print("[YouTube] save_tokens: INSERT new row")
        db.table("youtube_tokens").insert(payload).execute()
        print("[YouTube] save_tokens: INSERT done")


def get_tokens(user_id):
    uid = str(user_id)
    print(f"[YouTube] get_tokens called: user_id={uid}")
    try:
        from modules.logs import supabase
        if not supabase:
            print("[YouTube] get_tokens: supabase client is None")
            return None
        result = supabase.table("youtube_tokens").select("*").eq("user_id", uid).execute()
        print(f"[YouTube] get_tokens result: count={len(result.data or [])}")
        if not result.data:
            print(f"[YouTube] get_tokens: NO RECORD FOUND for user_id={uid}")
            return None
        tokens = result.data[0]
        print(f"[YouTube] get_tokens: found record has_access={bool(tokens.get('access_token'))} has_refresh={bool(tokens.get('refresh_token'))}")
        return tokens
    except Exception as e:
        print(f"[YouTube] get_tokens FAILED: {type(e).__name__}: {e}")
        print(traceback.format_exc())
        return None


def delete_tokens(user_id):
    db = _get_db()
    if not db:
        return
    db.table("youtube_tokens").delete().eq("user_id", user_id).execute()


def refresh_token_if_needed(user_id):
    print(f"[YouTube] refresh_token_if_needed START user_id={user_id}")
    row = get_tokens(user_id)
    if not row:
        print("[YouTube] ERROR: no tokens found in DB")
        return None
    if not row.get("refresh_token"):
        print("[YouTube] ERROR: refresh_token missing in DB row")
        return None

    print(f"[YouTube] tokens OK: has_access={bool(row.get('access_token'))} token_expiry={row.get('token_expiry')} channel={row.get('channel_name')}")
    print(f"[YouTube] client_id_set={bool(YOUTUBE_CLIENT_ID)} client_secret_set={bool(YOUTUBE_CLIENT_SECRET)}")

    # DB の token_expiry を datetime に変換（creds.expiry は書き換えない）
    expiry = None
    if row.get("token_expiry"):
        try:
            expiry = datetime.fromisoformat(row["token_expiry"])
            print(f"[YouTube] expiry parsed: {expiry} tzinfo={expiry.tzinfo}")
        except Exception as e:
            print(f"[YouTube] expiry parse FAILED: {e} raw={row.get('token_expiry')!r}")

    creds = Credentials(
        token=row["access_token"],
        refresh_token=row["refresh_token"],
        token_uri="https://oauth2.googleapis.com/token",
        client_id=YOUTUBE_CLIENT_ID,
        client_secret=YOUTUBE_CLIENT_SECRET,
        scopes=_SCOPES,
        expiry=expiry,
    )

    # expiry が NULL（初回保存など）は期限不明なので必ずリフレッシュ
    if expiry is None:
        needs_refresh = True
        print("[YouTube] token_expiry NULL → forcing refresh")
    else:
        try:
            valid = creds.valid
            expired = creds.expired
            needs_refresh = not valid
            print(f"[YouTube] creds.valid={valid} creds.expired={expired} needs_refresh={needs_refresh}")
        except TypeError as te:
            # google-auth の naive/aware 混在を手動 UTC 比較でフォールバック
            exp_utc = expiry if expiry.tzinfo else expiry.replace(tzinfo=timezone.utc)
            needs_refresh = datetime.now(timezone.utc) >= exp_utc - timedelta(seconds=300)
            print(f"[YouTube] TypeError in creds.valid ({te}) → fallback needs_refresh={needs_refresh}")

    if needs_refresh:
        print(f"[YouTube] refreshing token... current_expiry={expiry}")
        try:
            creds.refresh(Request())
            print(f"[YouTube] token refreshed OK new_expiry={creds.expiry}")
        except Exception as e:
            print(f"[YouTube] token refresh FAILED: {type(e).__name__}: {e}")
            print(traceback.format_exc())
            return None
        # トークン保存は別 try に分離（DB エラーでリフレッシュ成功が消えないように）
        try:
            save_tokens(user_id, creds)
            print("[YouTube] tokens saved to DB")
        except Exception as e:
            print(f"[YouTube] token save error (continuing): {type(e).__name__}: {e}")
    else:
        print("[YouTube] token still valid, skip refresh")

    print("[YouTube] refresh_token_if_needed END → returning creds")
    return creds


def _build_client(credentials):
    from googleapiclient.discovery import build
    return build("youtube", "v3", credentials=credentials, cache_discovery=False)


def get_channel_stats(user_id):
    print(f"[YouTube] get_channel_stats START user_id={user_id}")
    creds = refresh_token_if_needed(user_id)
    if not creds:
        print("[YouTube] get_channel_stats: creds is None → return None")
        return None
    try:
        print("[YouTube] get_channel_stats: building youtube client...")
        youtube = _build_client(creds)
        print("[YouTube] get_channel_stats: calling channels().list(mine=True)...")
        response = youtube.channels().list(
            part="statistics,snippet",
            mine=True,
        ).execute()
        print(f"[YouTube] get_channel_stats: items_count={len(response.get('items', []))}")
        if not response.get("items"):
            print("[YouTube] get_channel_stats: no items in response → return None")
            return None
        ch = response["items"][0]
        stats = ch.get("statistics", {})
        snippet = ch.get("snippet", {})
        result = {
            "channel_name": snippet.get("title"),
            "subscriber_count": int(stats.get("subscriberCount", 0)),
            "total_view_count": int(stats.get("viewCount", 0)),
            "video_count": int(stats.get("videoCount", 0)),
        }
        print(f"[YouTube] get_channel_stats OK: channel={result['channel_name']}")
        return result
    except Exception as e:
        print(f"[YouTube] get_channel_stats FAILED: {type(e).__name__}: {e}")
        print(traceback.format_exc())
        return None


def get_recent_videos(user_id, max_results=10):
    creds = refresh_token_if_needed(user_id)
    if not creds:
        return None
    try:
        youtube = _build_client(creds)

        # uploads プレイリスト ID を取得（channels.list → contentDetails）
        ch_response = youtube.channels().list(
            part="contentDetails",
            mine=True,
        ).execute()
        if not ch_response.get("items"):
            return []
        uploads_id = (
            ch_response["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]
        )

        # プレイリストから動画 ID を取得
        pl_response = youtube.playlistItems().list(
            part="snippet",
            playlistId=uploads_id,
            maxResults=max_results,
        ).execute()
        video_ids = [
            item["snippet"]["resourceId"]["videoId"]
            for item in pl_response.get("items", [])
        ]
        if not video_ids:
            return []

        # 動画の詳細（snippet + statistics + status）を一括取得
        v_response = youtube.videos().list(
            part="snippet,statistics,status",
            id=",".join(video_ids),
        ).execute()

        videos = []
        for item in v_response.get("items", []):
            s = item.get("statistics", {})
            sn = item.get("snippet", {})
            st = item.get("status", {})
            raw_date = sn.get("publishedAt", "")
            published_at = raw_date[:10] if raw_date else None  # "2026-06-01T..." → "2026-06-01"
            videos.append({
                "id": item["id"],
                "title": sn.get("title"),
                "published_at": published_at,
                "view_count": int(s.get("viewCount", 0)),
                "like_count": int(s.get("likeCount", 0)),
                "comment_count": int(s.get("commentCount", 0)),
                "privacy": st.get("privacyStatus"),  # "public" / "unlisted" / "private"
                "thumbnail": f"https://i.ytimg.com/vi/{item['id']}/mqdefault.jpg",
            })
        return videos
    except Exception as e:
        print(f"[YouTube] get_recent_videos error: {type(e).__name__}: {e}")
        print(traceback.format_exc())
        return None


def get_video_analytics(user_id, days=28):
    creds = refresh_token_if_needed(user_id)
    if not creds:
        return None
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).date()
    try:
        youtube = _build_client(creds)

        ch_response = youtube.channels().list(
            part="contentDetails",
            mine=True,
        ).execute()
        if not ch_response.get("items"):
            return []
        uploads_id = (
            ch_response["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]
        )

        pl_response = youtube.playlistItems().list(
            part="snippet",
            playlistId=uploads_id,
            maxResults=50,  # API 上限。期間内動画が50本を超える場合はページネーション要検討
        ).execute()
        video_ids = [
            item["snippet"]["resourceId"]["videoId"]
            for item in pl_response.get("items", [])
        ]
        if not video_ids:
            return []

        v_response = youtube.videos().list(
            part="snippet,statistics",
            id=",".join(video_ids),
        ).execute()

        videos = []
        for item in v_response.get("items", []):
            s = item.get("statistics", {})
            sn = item.get("snippet", {})
            raw_date = sn.get("publishedAt", "")
            published_at = raw_date[:10] if raw_date else None
            if not published_at:
                continue
            if date_type.fromisoformat(published_at) < cutoff:
                continue
            videos.append({
                "title": sn.get("title"),
                "published_at": published_at,
                "view_count": int(s.get("viewCount", 0)),
                "like_count": int(s.get("likeCount", 0)),
            })

        videos.sort(key=lambda v: v["published_at"], reverse=True)
        return videos
    except Exception as e:
        print(f"[YouTube] get_video_analytics error: {type(e).__name__}: {e}")
        print(traceback.format_exc())
        return None
