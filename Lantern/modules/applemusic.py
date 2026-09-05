"""Apple Music（MusicKit）の開発者トークンを作る。

2026-09-05・作者の指示で 9月のビルドに組み込む。

## なぜサーバーで作るのか

MusicKit は **ES256 で署名した JWT**（開発者トークン）を求める。
署名には Apple から降ろした秘密鍵（`.p8`）が要る。

**端末で作らない。** 作るなら秘密鍵をアプリに埋め込むことになり、
配布物から取り出せる。取り出されれば、こちらの開発者名義で
Apple Music の API を叩かれる。

だからここで作り、認証済みの利用者にだけ渡す。
**秘密鍵はサーバーから出ない。**

## 必要なもの

| 環境変数 | 中身 |
|---|---|
| `APPLE_MUSIC_KEY_ID` | 鍵の ID（10文字）。JWT の `kid` に入る |
| `APPLE_MUSIC_TEAM_ID` | Team ID（10文字）。JWT の `iss` に入る |
| `APPLE_MUSIC_KEY` | `.p8` の中身そのもの（PEM） |

`APPLE_MUSIC_KEY` は改行を含む。環境変数に入れるときは `\\n` と
書いてよい——読むときに戻す（`_pem`）。

**どれか一つでも無ければ、この仕組みは黙って止まる。**
鍵の無い環境（ローカルの検査、まだ設定していない本番）でも
アプリは動く必要がある。`modules/crypto.py` と同じ構え。

## 有効期限

Apple の上限は **6ヶ月**。それより短くする理由は薄いが、
**長すぎると漏れたときに閉じられない期間が延びる。**
30日にして、切れる前に作り直す。作るのは一瞬（署名だけ）。
"""

import os
import time

import jwt
import requests

# Apple の上限は 15777000 秒（約6ヶ月）。**そこまで延ばさない**
TOKEN_TTL = 30 * 24 * 60 * 60

# 期限のどれくらい手前で作り直すか。
# ぎりぎりに配ると、受け取った端末が使う頃には切れていることがある
RENEW_BEFORE = 60 * 60

_cached = None
_cached_until = 0


def _pem():
    """`.p8` の中身。環境変数に `\\n` と書かれていても戻す。"""
    raw = os.environ.get("APPLE_MUSIC_KEY", "")
    return raw.replace("\\n", "\n").strip()


def is_enabled():
    """鍵が揃っているか。**揃っていなければ黙って止まる**"""
    return bool(
        os.environ.get("APPLE_MUSIC_KEY_ID")
        and os.environ.get("APPLE_MUSIC_TEAM_ID")
        and _pem()
    )


def developer_token(now=None):
    """開発者トークンを返す。作れなければ `None`。

    **同じものを配り続ける。** 署名は一瞬だが、利用者ごとに違う
    トークンを作る理由が無い（アプリ全体に1つ）。期限が近づいたら作り直す。

    `now` は検査のための注入点。呼ぶ側は渡さない。
    """
    global _cached, _cached_until

    if not is_enabled():
        return None

    at = int(now if now is not None else time.time())
    if _cached and at < _cached_until - RENEW_BEFORE:
        return _cached

    try:
        token = jwt.encode(
            {
                "iss": os.environ["APPLE_MUSIC_TEAM_ID"],
                "iat": at,
                "exp": at + TOKEN_TTL,
            },
            _pem(),
            algorithm="ES256",
            headers={"kid": os.environ["APPLE_MUSIC_KEY_ID"], "alg": "ES256"},
        )
    except Exception as e:
        # **鍵が読めなくてもアプリは動く。** 音楽が繋がらないだけ
        print(f"[AppleMusic] 開発者トークンを作れなかった: {type(e).__name__}: {e}")
        return None

    _cached = token
    _cached_until = at + TOKEN_TTL
    return token


def token_response(now=None):
    """画面へ返す形。**期限も一緒に渡す**——端末が作り直す時期を測れる。"""
    token = developer_token(now)
    if not token:
        return None
    return {"token": token, "expires_at": _cached_until}


# ── 曲を探す ────────────────────────────────────────────────
#
# **こちらで代わりに叩く。**（2026-09-05）
#
# 端末から直に叩かせると、開発者トークンを配ることになる。
# 配っても即座に危ないわけではない（Web の再生機は埋め込んでいる）が、
# **出さずに済むなら出さない。**
#
# 代わりに、探した言葉がこのサーバーを通る。**記録そのものではないが、
# 通る以上は残さない**——ログにも書かない。
#
# `storefront` は国。既定は日本。同じ曲でも国で id が変わる。

SEARCH_URL = "https://api.music.apple.com/v1/catalog/{storefront}/search"
SEARCH_TIMEOUT = 8


def search(term, storefront="jp", limit=8):
    """曲を探して、添えられる形にして返す。

    戻すのは `[{title, artist, url}]`。**URL は本物の Apple Music のもの**で、
    そのまま `lib/attachLink.js` が読める形（`music.apple.com/...`）。

    取れなければ空。**探せないことでアプリを止めない。**
    """
    token = developer_token()
    word = (term or "").strip()
    if not token or not word:
        return []

    try:
        res = requests.get(
            SEARCH_URL.format(storefront=storefront),
            params={"term": word, "types": "songs", "limit": max(1, min(int(limit), 25))},
            headers={"Authorization": f"Bearer {token}"},
            timeout=SEARCH_TIMEOUT,
        )
        if res.status_code != 200:
            print(f"[AppleMusic] 検索に失敗: HTTP {res.status_code}")
            return []
        data = res.json()
    except Exception as e:
        print(f"[AppleMusic] 検索に失敗: {type(e).__name__}: {e}")
        return []

    songs = ((data.get("results") or {}).get("songs") or {}).get("data") or []
    out = []
    for song in songs:
        attrs = song.get("attributes") or {}
        url = attrs.get("url") or ""
        if not url:
            continue
        out.append({
            "title": attrs.get("name") or "",
            "artist": attrs.get("artistName") or "",
            "url": url,
        })
    return out


# ── Apple が受け付けるか ──────────────────────────────────────
#
# **署名が通ることと、Apple が受け付けることは別**（2026-09-05）。
#
# 鍵が MusicKit 用に作られていない、Media ID が紐付いていない——
# どちらでも JWT は作れてしまう。**落ちるのは Apple に出したとき。**
# ビルドの前にそこを見たい。
#
# 叩くのはいちばん小さいもの（国の情報）。**利用者の言葉を送らない。**
# 結果は少しのあいだ覚える。確認のたびに Apple を叩かない。

VERIFY_URL = "https://api.music.apple.com/v1/storefronts/jp"
VERIFY_TTL = 10 * 60

_verified = None
_verified_at = 0


def verify(now=None):
    """Apple が受け付けるか。`ok` / `rejected` / `error` / `bad_key` / `unset`。

    **値は返さない。** 返すのは状態を表す語だけ。
    """
    global _verified, _verified_at

    if not is_enabled():
        return "unset"
    token = developer_token(now)
    if not token:
        return "bad_key"

    at = int(now if now is not None else time.time())
    if _verified and at - _verified_at < VERIFY_TTL:
        return _verified

    try:
        res = requests.get(
            VERIFY_URL,
            headers={"Authorization": f"Bearer {token}"},
            timeout=SEARCH_TIMEOUT,
        )
        if res.status_code == 200:
            state = "ok"
        elif res.status_code in (401, 403):
            # **鍵は作れたが、Apple が認めていない。**
            # MusicKit を有効にしていない鍵か、Media ID が紐付いていない
            state = "rejected"
            print(f"[AppleMusic] Apple が受け付けなかった: HTTP {res.status_code}")
        else:
            state = "error"
            print(f"[AppleMusic] 確認に失敗: HTTP {res.status_code}")
    except Exception as e:
        print(f"[AppleMusic] 確認に失敗: {type(e).__name__}: {e}")
        return "error"

    _verified = state
    _verified_at = at
    return state


def _reset_for_tests():
    """検査のあいだだけ覚えを捨てる。**本番から呼ばない**"""
    global _cached, _cached_until, _verified, _verified_at
    _cached = None
    _cached_until = 0
    _verified = None
    _verified_at = 0
