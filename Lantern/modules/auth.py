import os
import jwt
from functools import wraps
from flask import request, jsonify, g
from jwt import PyJWKClient

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")  # 旧HS256鍵向けフォールバック用（移行期間中のみ使用）

# SupabaseのJWKS(公開鍵)を使ってローカルでJWTを検証する。
# 鍵がローテーションされてもkidに応じて自動で新しい公開鍵を取得するため、
# シークレットのハードコードや手動更新は不要。
_jwks_client = PyJWKClient(f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json") if SUPABASE_URL else None


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Unauthorized"}), 401
        token = auth[7:]

        user_id = _verify_locally(token)
        if not user_id:
            # ローカル検証で解決できない場合のみ GoTrue に問い合わせるフォールバック
            user = _verify_via_gotrue(token)
            if not user:
                return jsonify({"error": "Unauthorized"}), 401
            user_id = user.id

        g.user_id = str(user_id)
        return f(*args, **kwargs)
    return decorated


def _verify_locally(token):
    """JWKS(ES256/RS256)、次いで旧HS256シークレットの順でローカル検証を試みる"""
    try:
        if _jwks_client:
            signing_key = _jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256", "RS256"],
                options={"verify_aud": False},
            )
            return payload.get("sub")
    except jwt.ExpiredSignatureError:
        return None
    except Exception as e:
        print(f"[Auth] JWKS verify failed, will try fallback: {type(e).__name__}: {e}")

    if SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            return payload.get("sub")
        except Exception:
            return None
    return None


def _verify_via_gotrue(token):
    """ローカル検証がどちらも失敗した場合の最終フォールバック（後方互換）"""
    _key = os.environ.get("SUPABASE_KEY", "")
    if not (SUPABASE_URL and _key):
        return None
    try:
        from supabase import create_client
        client = create_client(SUPABASE_URL, _key)
        response = client.auth.get_user(token)
        return response.user
    except Exception:
        return None
