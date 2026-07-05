import os
import secrets
import hashlib
import base64
import traceback
from datetime import datetime, timezone

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
        return
    payload = {
        "user_id": user_id,
        "access_token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_expiry": credentials.expiry.isoformat() if credentials.expiry else None,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        from googleapiclient.discovery import build
        youtube = build("youtube", "v3", credentials=credentials)
        response = youtube.channels().list(part="snippet", mine=True).execute()
        if response.get("items"):
            ch = response["items"][0]
            payload["channel_id"] = ch["id"]
            payload["channel_name"] = ch["snippet"]["title"]
    except Exception as e:
        print(f"[YouTube] channel fetch error: {e}")

    existing = db.table("youtube_tokens").select("id").eq("user_id", user_id).execute()
    if existing.data:
        db.table("youtube_tokens").update(payload).eq("user_id", user_id).execute()
    else:
        db.table("youtube_tokens").insert(payload).execute()


def get_tokens(user_id):
    db = _get_db()
    if not db:
        return None
    result = db.table("youtube_tokens").select("*").eq("user_id", user_id).execute()
    return result.data[0] if result.data else None


def refresh_token_if_needed(user_id):
    row = get_tokens(user_id)
    if not row or not row.get("refresh_token"):
        return None
    creds = Credentials(
        token=row["access_token"],
        refresh_token=row["refresh_token"],
        token_uri="https://oauth2.googleapis.com/token",
        client_id=YOUTUBE_CLIENT_ID,
        client_secret=YOUTUBE_CLIENT_SECRET,
        scopes=_SCOPES,
    )
    if creds.expired or not creds.valid:
        try:
            creds.refresh(Request())
            save_tokens(user_id, creds)
        except Exception as e:
            print(f"[YouTube] token refresh error: {e}")
            return None
    return creds


def _build_client(credentials):
    from googleapiclient.discovery import build
    return build("youtube", "v3", credentials=credentials)


def get_channel_stats(user_id):
    creds = refresh_token_if_needed(user_id)
    if not creds:
        return None
    try:
        youtube = _build_client(creds)
        response = youtube.channels().list(
            part="statistics,snippet",
            mine=True,
        ).execute()
        if not response.get("items"):
            return None
        ch = response["items"][0]
        stats = ch.get("statistics", {})
        snippet = ch.get("snippet", {})
        return {
            "channel_id": ch["id"],
            "channel_name": snippet.get("title"),
            "thumbnail": snippet.get("thumbnails", {}).get("default", {}).get("url"),
            "subscriber_count": int(stats.get("subscriberCount", 0)),
            "view_count": int(stats.get("viewCount", 0)),
            "video_count": int(stats.get("videoCount", 0)),
        }
    except Exception as e:
        print(f"[YouTube] get_channel_stats error: {type(e).__name__}: {e}")
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

        # 動画の詳細（snippet + statistics）を一括取得
        v_response = youtube.videos().list(
            part="snippet,statistics",
            id=",".join(video_ids),
        ).execute()

        videos = []
        for item in v_response.get("items", []):
            s = item.get("statistics", {})
            sn = item.get("snippet", {})
            raw_date = sn.get("publishedAt", "")
            published_at = raw_date[:10] if raw_date else None  # "2026-06-01T..." → "2026-06-01"
            videos.append({
                "id": item["id"],
                "title": sn.get("title"),
                "published_at": published_at,
                "thumbnail": sn.get("thumbnails", {}).get("medium", {}).get("url"),
                "view_count": int(s.get("viewCount", 0)),
                "like_count": int(s.get("likeCount", 0)),
                "comment_count": int(s.get("commentCount", 0)),
            })
        return videos
    except Exception as e:
        print(f"[YouTube] get_recent_videos error: {type(e).__name__}: {e}")
        print(traceback.format_exc())
        return None
