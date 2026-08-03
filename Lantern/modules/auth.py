import os
import jwt
from jwt import PyJWKClient
from functools import wraps
from flask import request, jsonify, g

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
_JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json" if SUPABASE_URL else None
_jwks_client = PyJWKClient(_JWKS_URL, cache_keys=True) if _JWKS_URL else None

# JWKS が配るのは非対称鍵（Supabase は ES256）。ここに HS256 を混ぜてはいけない。
# HS256 は共有秘密鍵方式なので、公開鍵を秘密鍵として署名させる
# アルゴリズム混同攻撃の入口になる。
# 現状の PyJWT は鍵オブジェクトを HMAC 秘密鍵として使うことを拒否するため
# 実際には防がれているが、ライブラリの実装に依存しない形にしておく。
_ALGORITHMS = ["ES256", "RS256"]


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Unauthorized"}), 401
        token = auth_header.split(" ", 1)[1]
        if not _jwks_client:
            print("[Auth] JWKS client not initialized (SUPABASE_URL missing)", flush=True)
            return jsonify({"error": "Unauthorized"}), 401
        try:
            signing_key = _jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token, signing_key.key,
                algorithms=_ALGORITHMS,
                options={"verify_aud": False},
            )
            g.user_id = payload.get("sub")
            if not g.user_id:
                return jsonify({"error": "Unauthorized"}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except Exception as e:
            print(f"[Auth] JWT verification failed: {type(e).__name__}: {e}", flush=True)
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated
