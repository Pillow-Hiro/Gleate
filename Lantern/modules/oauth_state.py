"""OAuth の state に user_id とクライアント種別を載せる。

外部サービスへのリダイレクトURIは Flask のままにし、コールバック側で
Web（Vercel）へ戻すかネイティブアプリ（lantern://）へ戻すかを切り替える。
これにより各サービスの管理画面でリダイレクトURIを増やさずに済む。

YouTube と Twitch で同じ仕組みを使うためここに置いている。
片方だけ直して他方が古いまま、という事故を避ける。

## 署名する（2026-08-15）

**それまで `user_id|platform` を素で載せていた。**
コールバックは認証を通らない（外部サービスから来るため）ので、
**state がそのまま本人性の証明になっていた。**

素のままだと、user_id を知っている者が

    /api/youtube/callback?code=<自分の認可コード>&state=<他人のID>|web

を叩ける。**他人のアカウントに自分の YouTube を繋げられる。**
逆に、細工したリンクを踏ませれば**他人の YouTube トークンを
自分のアカウントに保存させる**こともできる。OAuth の state は
本来これを防ぐためのもので、署名の無い state は役目を果たしていない。

`tests/test_route_auth.py` は公開ルートの理由に
「stateで本人性を確認する」と書いていたが、**確認できていなかった。**

いまは HMAC で署名し、**発行から10分**だけ有効にする。
鍵は `OAUTH_STATE_SECRET`。無ければ `SUPABASE_KEY` から導出する
（どちらもサーバーにしか無い）。**環境変数を足す前に配備しても壊れない。**
"""

import hashlib
import hmac
import os
import time

_STATE_SEPARATOR = "|"

# 発行から使えるまでの猶予。同意画面を読む時間があればよい。
# 長くすると、盗んだ state を使い回せる時間が延びる。
STATE_TTL_SECONDS = 600


def _secret():
    explicit = os.environ.get("OAUTH_STATE_SECRET", "")
    if explicit:
        return explicit.encode()
    # 環境変数を足し忘れても署名は続ける。**素の state には戻さない。**
    # SUPABASE_KEY はサーバーにしか無く、クライアントへ配っていない。
    fallback = os.environ.get("SUPABASE_KEY", "")
    return hashlib.sha256(("lantern-oauth-state:" + fallback).encode()).digest()


def _sign(body):
    return hmac.new(_secret(), body.encode(), hashlib.sha256).hexdigest()[:32]


def build_state(user_id, platform="web"):
    """`user_id|platform|発行時刻|署名` を作る。"""
    body = f"{user_id}{_STATE_SEPARATOR}{platform}{_STATE_SEPARATOR}{int(time.time())}"
    return f"{body}{_STATE_SEPARATOR}{_sign(body)}"


def parse_state(state, now=None):
    """state を (user_id, platform) に分解する。

    **署名が合わない・古い・形が違うものは拒む。** その場合 user_id は None。
    呼び出し側は user_id が無ければエラー画面へ戻す作りになっている。

    署名の無い古い形式は**受け付けない。** 受け付けると、
    署名を外すだけで元の穴に戻れてしまう。
    """
    if not state:
        return None, "web"

    parts = state.split(_STATE_SEPARATOR)
    if len(parts) != 4:
        return None, "web"

    user_id, platform, issued, signature = parts
    body = f"{user_id}{_STATE_SEPARATOR}{platform}{_STATE_SEPARATOR}{issued}"

    # 比較は定数時間で行う。速さの差から署名を1文字ずつ当てられないように
    if not hmac.compare_digest(signature, _sign(body)):
        return None, "web"

    try:
        issued_at = int(issued)
    except ValueError:
        return None, "web"

    current = int(now if now is not None else time.time())
    # 未来の時刻も拒む。時計のずれの範囲（60秒）だけ許す
    if issued_at - current > 60 or current - issued_at > STATE_TTL_SECONDS:
        return None, "web"

    return (user_id or None), (platform or "web")
