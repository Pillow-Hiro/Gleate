"""記録の本文を暗号化する。**AES-256-GCM。**

## 何から守るか（2026-09-02）

**データベースだけが漏れたとき**に効く。

- Supabase の管理画面を開いても平文が並ばない
- DB のダンプが流出しても読めない
- RLS の漏れや anon 鍵の露出があっても中身は暗号文
- Supabase 社側の事故

## 何から守らないか

**サーバーごと取られたときは守れない。** 鍵は `SUPABASE_KEY` と
同じ環境変数に並ぶ。片方を取れる相手は、たいてい両方取れる。

**Anthropic に渡る経路も平文のまま。** AI が動く以上そこは変えられない。

だから `PRIVACY.md` の「技術的に読めない仕組みにはなっていません」は
**残す。** 鍵を持つのは提供者であり、復号を1回書けば読める。
消したら嘘になる。

## 鍵の置き方

環境変数 `LANTERN_ENC_KEYS` に `<id>:<base64の32バイト>` を並べる。

    LANTERN_ENC_KEYS=1:AbC...=            （1本）
    LANTERN_ENC_KEYS=1:AbC...=,2:XyZ...=  （入れ替え中）

**暗号化には最後のものを使う。** 復号は封筒に書かれた id で引く。
**入れ替えの仕組みを最初から入れておく。** 後から足すと、
それまでの暗号文をどの鍵で読むか分からなくなる。

## 鍵が無いときは素通しする

**環境変数が無ければ、平文のまま読み書きする。**
サーバーの配備と鍵の設定は別の作業で、順番が前後する。
素通しにしておけば、どちらが先でも壊れない。

## 封筒の形

    v1.<鍵ID>.<base64url(nonce ‖ 暗号文)>

`.` は base64 の字ではないので、区切りとして安全。
頭の `v1.` の有無で、平文か暗号文かを見分ける
（**移行中は混ざる**。両方読めること）。

## 復号に失敗したら投げる

**空文字を返さない。** 空を返すと、その記録を開いて保存した人が
**中身を空で上書きする。**読めないことより、消える方が悪い。

投げると `load_logs` の except が拾って空の一覧になる
（記録は消えていない。控えもクライアントに残っている）。
"""

import base64
import os

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

_PREFIX = "v1"
_NONCE_BYTES = 12


class DecryptError(Exception):
    """復号できなかった。**握り潰さない**（上の「投げる」を参照）。"""


def _load_keys():
    """環境変数から鍵を読む。**戻り値は `(dict, 有効なID)`。**

    毎回読むのは、環境変数を差し替えたときに再起動だけで効かせるため。
    件数が1〜2本なので、この読み直しは測れるほどの負荷にならない。
    """
    raw = (os.environ.get("LANTERN_ENC_KEYS") or "").strip()
    if not raw:
        return {}, None

    keys = {}
    active = None
    for part in raw.split(","):
        part = part.strip()
        if not part or ":" not in part:
            continue
        key_id, b64 = part.split(":", 1)
        key_id = key_id.strip()
        try:
            material = base64.b64decode(b64.strip())
        except Exception:
            print(f"[Crypto] 鍵を読めない（id={key_id}）")
            continue
        if len(material) != 32:
            print(f"[Crypto] 鍵の長さが32バイトでない（id={key_id}）")
            continue
        keys[key_id] = material
        active = key_id  # **最後のものが有効**
    return keys, active


def is_enabled():
    """暗号化が効く状態か。**鍵が1本も無ければ素通し。**"""
    keys, active = _load_keys()
    return bool(keys and active)


def is_encrypted(value):
    """封筒に入っているか。移行中は平文と混ざる。"""
    return isinstance(value, str) and value.startswith(_PREFIX + ".")


def encrypt(text, aad=""):
    """暗号化する。**鍵が無ければそのまま返す。**

    `aad` は付帯データ。`user_id` を渡しておくと、
    暗号文を別の利用者の行へ移し替えても復号できなくなる。
    """
    if not isinstance(text, str) or text == "":
        return text
    if is_encrypted(text):
        return text  # 二重に包まない

    keys, active = _load_keys()
    if not active:
        return text

    nonce = os.urandom(_NONCE_BYTES)
    sealed = AESGCM(keys[active]).encrypt(nonce, text.encode("utf-8"), aad.encode("utf-8"))
    body = base64.urlsafe_b64encode(nonce + sealed).decode("ascii")
    return f"{_PREFIX}.{active}.{body}"


def decrypt(value, aad=""):
    """復号する。**封筒でなければそのまま返す**（移行中の平文）。"""
    if not is_encrypted(value):
        return value

    try:
        _, key_id, body = value.split(".", 2)
    except ValueError:
        raise DecryptError("封筒の形が違う")

    keys, _ = _load_keys()
    material = keys.get(key_id)
    if not material:
        # **鍵を外した・入れ替えを間違えた。** ここで空を返すと上書きされる
        raise DecryptError(f"この暗号文の鍵が無い（id={key_id}）")

    try:
        raw = base64.urlsafe_b64decode(body.encode("ascii"))
        nonce, sealed = raw[:_NONCE_BYTES], raw[_NONCE_BYTES:]
        return AESGCM(material).decrypt(nonce, sealed, aad.encode("utf-8")).decode("utf-8")
    except InvalidTag:
        raise DecryptError("鍵が違うか、暗号文が壊れている")
    except Exception as e:
        raise DecryptError(f"復号に失敗（{type(e).__name__}）")
