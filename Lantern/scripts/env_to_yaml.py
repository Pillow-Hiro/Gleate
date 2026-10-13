# -*- coding: utf-8 -*-
"""環境変数の写しを、Cloud Run に渡せる形に直す（2026-10-14）。

    python3 scripts/env_to_yaml.py env.yaml env.cloudrun.yaml

Render の画面から写すと `KEY=値` の形（`.env` と同じ）になりやすい。
`gcloud run deploy --env-vars-file` が求めるのは**キーと値をコロンで並べた
一枚の YAML** なので、そのままだと次の一言で止まる。

    ERROR: argument --env-vars-file: Invalid YAML/JSON data in [env.yaml],
    expected map-like data.

**値は画面に出さない。**出すのはキーの名前と件数、そして足りないものだけ。
鍵が端末の履歴や画面の記録に残らないようにする。

値は JSON の文字列として囲む（`"..."`）。**JSON の文字列は YAML として読める**ので、
`#` や `*` や `:` が入っていても壊れない。
"""
import io
import json
import os
import sys

# 本番で要る変数（`docs/deploy-cloudrun.md` の表と同じ）。
# **足りないものを見つけるためだけに使う。**余分なものは消さない——
# こちらが知らない変数を足していることもある。
EXPECTED = (
    "SUPABASE_URL", "SUPABASE_KEY",
    "ANTHROPIC_API_KEY",
    "LANTERN_ENC_KEYS",
    "OAUTH_STATE_SECRET",
    "YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REDIRECT_URI",
    "TWITCH_CLIENT_ID", "TWITCH_CLIENT_SECRET", "TWITCH_REDIRECT_URI",
    "REVENUECAT_WEBHOOK_SECRET",
    "UNSPLASH_ACCESS_KEY",
    "APPLE_MUSIC_KEY_ID", "APPLE_MUSIC_TEAM_ID",
    "FRONTEND_ORIGIN",
    "APP_TIMEZONE",
)

# 改行を含むので、こちらは Secret Manager に入れる（`docs/deploy-cloudrun.md`）
SECRET_ONLY = ("APPLE_MUSIC_KEY",)


def _split(line):
    """`KEY=値` と `KEY: 値` の両方を読む。**先に出てくる区切りを使う。**

    `SUPABASE_URL=https://x.supabase.co` には `=` も `:` も入っている。
    位置を見ないと、URL の途中で切ってしまう。
    """
    eq, colon = line.find("="), line.find(":")
    if eq != -1 and (colon == -1 or eq < colon):
        return line.split("=", 1)
    if colon != -1:
        return line.split(":", 1)
    return None


def _unquote(value):
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        return value[1:-1]
    return value


def parse_env(text):
    """写しを読んで `{キー: 値}` にする。**後に書いたものが勝つ**（写し間違いの直しが効く）"""
    out = {}
    for raw in (text or "").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export "):].strip()
        parts = _split(line)
        if not parts:
            continue
        key = parts[0].strip()
        if not key or not key.replace("_", "").isalnum():
            continue
        out[key] = _unquote(parts[1])
    return out


def to_yaml(pairs):
    """キーの名前の順に並べた YAML。**値は JSON で囲む**ので記号で壊れない"""
    lines = [f"{key}: {json.dumps(pairs[key], ensure_ascii=False)}"
             for key in sorted(pairs)]
    return "\n".join(lines) + "\n" if lines else ""


def report(pairs):
    """直す前に知らせること。**値は入れない**"""
    notes = []
    missing = [k for k in EXPECTED if k not in pairs]
    if missing:
        notes.append("足りない変数: " + " ".join(missing))
    for key in SECRET_ONLY:
        if key in pairs:
            notes.append(f"{key} は Secret Manager に入れるもの。この表からは外すこと")
    multiline = sorted(k for k, v in pairs.items() if "\n" in v or "\\n" in v)
    if multiline:
        notes.append("改行が入っている値: " + " ".join(multiline) + "（Secret Manager 向き）")
    empty = sorted(k for k, v in pairs.items() if not v)
    if empty:
        notes.append("値が空: " + " ".join(empty))
    return notes


def main(argv):
    src = argv[1] if len(argv) > 1 else "env.yaml"
    dst = argv[2] if len(argv) > 2 else "env.cloudrun.yaml"
    if not os.path.exists(src):
        print(f"{src} が無い。Render から写したファイルの名前を渡すこと。")
        return 2

    pairs = parse_env(io.open(src, encoding="utf-8").read())
    if not pairs:
        print(f"{src} からキーを読めなかった。`KEY=値` か `KEY: 値` の行があるか確かめること。")
        return 1

    io.open(dst, "w", encoding="utf-8", newline="\n").write(to_yaml(pairs))
    print(f"{len(pairs)} 件を {dst} に書いた。**値は出さない。**")
    print("キー: " + " ".join(sorted(pairs)))
    for note in report(pairs):
        print("・" + note)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
