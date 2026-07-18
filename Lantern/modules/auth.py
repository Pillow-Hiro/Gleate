import os
import jwt
from functools import wraps
from flask import request, jsonify, g

SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Unauthorized"}), 401
        token = auth[7:]
        if not SUPABASE_JWT_SECRET:
            # JWT Secret 未設定時は Supabase GoTrue にフォールバック
            user = _verify_via_gotrue(token)
            if not user:
                return jsonify({"error": "Unauthorized"}), 401
            g.user_id = str(user.id)
            return f(*args, **kwargs)
        try:
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            user_id = payload.get("sub")
            if not user_id:
                return jsonify({"error": "Unauthorized"}), 401
            g.user_id = str(user_id)
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        except Exception:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated


def _verify_via_gotrue(token):
    """JWT Secret 未設定時の GoTrue フォールバック（後方互換）"""
    _url = os.environ.get("SUPABASE_URL", "")
    _key = os.environ.get("SUPABASE_KEY", "")
    if not (_url and _key):
        return None
    try:
        from supabase import create_client
        client = create_client(_url, _key)
        response = client.auth.get_user(token)
        return response.user
    except Exception:
        return None
