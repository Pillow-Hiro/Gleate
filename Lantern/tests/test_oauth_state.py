"""OAuth の state の署名。

2026-08-15 まで `user_id|platform` を素で載せていた。
コールバックは認証を通らないので、**state がそのまま本人性の証明**だった。
署名が無ければ、user_id を知っている者が他人のアカウントへ
自分の連携を繋げられる（またはその逆）。

ここが緩むと、その穴に戻る。
"""

import time

import pytest

from modules.oauth_state import (
    STATE_TTL_SECONDS,
    build_state,
    parse_state,
)


class Test署名した状態:
    def test_作って読むと元に戻る(self):
        state = build_state("user-1", "native")
        assert parse_state(state) == ("user-1", "native")

    def test_既定はweb(self):
        assert parse_state(build_state("user-1"))[1] == "web"

    def test_署名が本文に含まれない(self):
        # 署名は本文の後ろに1つだけ付く
        assert build_state("user-1", "web").count("|") == 3


class Test拒むもの:
    def test_署名の無い古い形式は拒む(self):
        # **これを受け付けると、署名を外すだけで元の穴に戻れる**
        assert parse_state("user-1|web") == (None, "web")

    def test_user_idを差し替えたら拒む(self):
        state = build_state("user-1", "web")
        _, platform, issued, sig = state.split("|")
        forged = f"victim|{platform}|{issued}|{sig}"
        assert parse_state(forged)[0] is None

    def test_署名を書き換えたら拒む(self):
        state = build_state("user-1", "web")
        assert parse_state(state[:-1] + ("0" if state[-1] != "0" else "1"))[0] is None

    def test_空とゴミは拒む(self):
        for bad in ("", None, "|||", "a|b|c", "a|b|c|d|e"):
            assert parse_state(bad)[0] is None

    def test_発行時刻が数字でなければ拒む(self):
        state = build_state("user-1", "web")
        user, platform, _, sig = state.split("|")
        assert parse_state(f"{user}|{platform}|xxx|{sig}")[0] is None


class Test有効期限:
    def test_期限内は通る(self):
        state = build_state("user-1", "web")
        assert parse_state(state, now=time.time() + STATE_TTL_SECONDS - 5)[0] == "user-1"

    def test_期限を過ぎたら拒む(self):
        state = build_state("user-1", "web")
        assert parse_state(state, now=time.time() + STATE_TTL_SECONDS + 5)[0] is None

    def test_未来の時刻は拒む(self):
        # 時計のずれ（60秒）までは許す
        state = build_state("user-1", "web")
        assert parse_state(state, now=time.time() - 30)[0] == "user-1"
        assert parse_state(state, now=time.time() - 600)[0] is None
