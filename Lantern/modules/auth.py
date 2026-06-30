import os
from functools import wraps
from flask import request, jsonify, g
from supabase import create_client

_url = os.environ.get("SUPABASE_URL", "")
_key = os.environ.get("SUPABASE_KEY", "")
_supabase = create_client(_url, _key) if _url and _key else None


def get_user_from_token(token):
    if not _supabase:
        return None
    try:
        response = _supabase.auth.get_user(token)
        return response.user
    except Exception:
        return None


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Unauthorized"}), 401
        token = auth[7:]
        user = get_user_from_token(token)
        if not user:
            return jsonify({"error": "Invalid token"}), 401
        g.user_id = str(user.id)
        return f(*args, **kwargs)
    return decorated
