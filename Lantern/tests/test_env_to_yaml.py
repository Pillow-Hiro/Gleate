# -*- coding: utf-8 -*-
"""`scripts/env_to_yaml.py` — 環境変数の写しを Cloud Run に渡せる形に直す。

2026-10-14、最初のデプロイが次で止まった。

    ERROR: argument --env-vars-file: Invalid YAML/JSON data in [env.yaml],
    expected map-like data.

Render の画面から写すと `KEY=値` になる。`gcloud` が求めるのはコロンで並べた YAML。
**値を画面に出さずに**直せること、記号の入った値で壊れないことを見る。
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts"))

from env_to_yaml import EXPECTED, main, parse_env, report, to_yaml  # noqa: E402


class TestParse:
    def test_イコールの形を読む(self):
        assert parse_env("SUPABASE_KEY=abc123") == {"SUPABASE_KEY": "abc123"}

    def test_コロンの形も読む(self):
        assert parse_env("APP_TIMEZONE: Asia/Tokyo") == {"APP_TIMEZONE": "Asia/Tokyo"}

    # `SUPABASE_URL=https://x` には `=` も `:` も入っている。**先に出る方で切る**
    def test_値の中のコロンで切らない(self):
        got = parse_env("SUPABASE_URL=https://abc.supabase.co")
        assert got == {"SUPABASE_URL": "https://abc.supabase.co"}

    def test_コロンの形で値にコロンが入っていても切らない(self):
        got = parse_env("YOUTUBE_REDIRECT_URI: https://api.golantern.app/api/youtube/callback")
        assert got == {"YOUTUBE_REDIRECT_URI": "https://api.golantern.app/api/youtube/callback"}

    def test_値の中のイコールを残す(self):
        assert parse_env("LANTERN_ENC_KEYS=a1b2==") == {"LANTERN_ENC_KEYS": "a1b2=="}

    @pytest.mark.parametrize("line", ['K="v"', "K='v'", "export K=v", "  K = v  "])
    def test_囲いと_export_と空白を外す(self, line):
        assert parse_env(line) == {"K": "v"}

    def test_空行とコメントを飛ばす(self):
        assert parse_env("\n# メモ\n\nK=v\n") == {"K": "v"}

    def test_キーに使えない行は飛ばす(self):
        assert parse_env("これは説明です。\nK=v") == {"K": "v"}

    # 写し間違いを直して貼り直したとき、**後に書いた方を使う**
    def test_同じキーは後が勝つ(self):
        assert parse_env("K=old\nK=new") == {"K": "new"}


class TestToYaml:
    def test_キー名の順に並べる(self):
        assert to_yaml({"B": "2", "A": "1"}) == 'A: "1"\nB: "2"\n'

    # YAML でそのまま置くと壊れる記号。**JSON の文字列にすれば読める**
    #
    # 読み直しは `json` で確かめる。PyYAML はこのリポジトリの依存に無く、
    # **JSON の文字列は YAML としても同じに読める**ので、これで性質は見られる
    @pytest.mark.parametrize("value", ["#1", "*star", "a: b", "{x}", "[y]", "@at", "日本語", 'q"uote'])
    def test_記号が入っていても読み直せる(self, value):
        import json

        line = to_yaml({"K": value}).rstrip("\n")
        key, _, encoded = line.partition(": ")
        assert key == "K" and json.loads(encoded) == value

    def test_空なら空(self):
        assert to_yaml({}) == ""


class TestReport:
    def test_足りない変数を名指しする(self):
        notes = report({"SUPABASE_URL": "x"})
        assert any("足りない変数" in n and "ANTHROPIC_API_KEY" in n for n in notes)

    def test_全部あれば何も言わない(self):
        assert report({k: "x" for k in EXPECTED}) == []

    # 改行を含む鍵は Secret Manager 行き（`docs/deploy-cloudrun.md`）
    def test_Apple_の鍵が混ざっていたら知らせる(self):
        full = {k: "x" for k in EXPECTED}
        full["APPLE_MUSIC_KEY"] = "-----BEGIN PRIVATE KEY-----\nabc\n"
        notes = report(full)
        assert any("Secret Manager" in n for n in notes)

    def test_値が空のものを知らせる(self):
        full = {k: "x" for k in EXPECTED}
        full["SUPABASE_KEY"] = ""
        assert any("値が空" in n and "SUPABASE_KEY" in n for n in report(full))


class TestMain:
    """**値を画面に出さない。**出すのはキー名と件数だけ"""

    def test_書き出して値は出さない(self, tmp_path, capsys):
        src = tmp_path / "env.yaml"
        src.write_text("SUPABASE_KEY=ひみつの値\nAPP_TIMEZONE=Asia/Tokyo\n", encoding="utf-8")
        dst = tmp_path / "out.yaml"
        assert main(["env_to_yaml.py", str(src), str(dst)]) == 0

        printed = capsys.readouterr().out
        assert "ひみつの値" not in printed
        assert "SUPABASE_KEY" in printed and "2 件" in printed
        assert dst.read_text(encoding="utf-8").startswith("APP_TIMEZONE: ")

    def test_ファイルが無ければ2(self, tmp_path, capsys):
        assert main(["env_to_yaml.py", str(tmp_path / "無い.yaml")]) == 2

    def test_読めなければ1(self, tmp_path, capsys):
        src = tmp_path / "env.yaml"
        src.write_text("説明だけが書かれている\n", encoding="utf-8")
        assert main(["env_to_yaml.py", str(src), str(tmp_path / "out.yaml")]) == 1
