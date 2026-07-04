import os
import traceback
from datetime import datetime, timezone

from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

YOUTUBE_CLIENT_ID = os.environ.get("YOUTUBE_CLIENT_ID")
YOUTUBE_CLIENT_SECRET = os.environ.get("YOUTUBE_CLIENT_SECRET")
REDIRECT_URI = os.environ.get("YOUTUBE_REDIRECT_URI", "http://localhost:5173/youtube/callback")
_SCOPES = ["https://www.googleapis.com/auth/youtube.readonly"]


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


def get_auth_url(user_id):
    flow = _make_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        state=user_id,
        prompt="consent",
    )
    return auth_url


def exchange_code_for_token(code, request_url=None):
    print(f"[YouTube] exchange_code_for_token: REDIRECT_URI={REDIRECT_URI} request_url={request_url}")
    try:
        flow = _make_flow()
        if request_url:
            flow.fetch_token(authorization_response=request_url)
        else:
            flow.fetch_token(code=code)
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
