# -*- coding: utf-8 -*-
"""起動画面の口（`/api/splash/content`）— **認証が要らないので、呼ぶ回数に蓋をする。**

2026-10-16、Search Console の指摘を調べている途中で見つけた。
写真は6時間持っていたのに、**一言は毎回 AI を呼んでいた。**
この口は認証が無く `@require_ai_budget` も通らないので、連打されれば
叩かれただけ課金される（1回0.1円でも、1万回で1,000円を超える）。
"""
import time

import pytest

import main


@pytest.fixture
def client(monkeypatch):
    # 写真は取りに行かせない（外に出ない）
    main._splash_photo_cache.update({"photo_url": "u", "photographer": "p", "cached_at": time.time()})
    for kind in main._splash_quote_cache:
        main._splash_quote_cache[kind] = {"quote": None, "cached_at": 0}
    return main.app.test_client()


@pytest.fixture
def counted(monkeypatch):
    """AI を何回呼んだか数える。**本物は呼ばない**"""
    calls = []

    def fake(quote_type="snoopy"):
        calls.append(quote_type)
        return f"{quote_type}の一言。"

    monkeypatch.setattr("modules.ai.get_splash_quote", fake)
    return calls


class TestQuoteCache:
    def test_同じ種類なら二度目は呼ばない(self, client, counted, monkeypatch):
        monkeypatch.setattr(main.random, "choice", lambda seq: "zen")
        first = client.get("/api/splash/content").get_json()
        second = client.get("/api/splash/content").get_json()
        assert first["quote"] == second["quote"] == "zenの一言。"
        assert counted == ["zen"]

    def test_種類ごとに持つ(self, client, counted, monkeypatch):
        kinds = iter(("zen", "snoopy", "zen", "snoopy"))
        monkeypatch.setattr(main.random, "choice", lambda seq: next(kinds))
        got = [client.get("/api/splash/content").get_json()["quote"] for _ in range(4)]
        assert got == ["zenの一言。", "snoopyの一言。", "zenの一言。", "snoopyの一言。"]
        assert counted == ["zen", "snoopy"]

    def test_持っている時間を過ぎたら呼び直す(self, client, counted, monkeypatch):
        monkeypatch.setattr(main.random, "choice", lambda seq: "zen")
        client.get("/api/splash/content")
        old = time.time() - main._SPLASH_CACHE_SECONDS - 1
        main._splash_quote_cache["zen"]["cached_at"] = old
        client.get("/api/splash/content")
        assert counted == ["zen", "zen"]

    # **連打されても、呼ぶのは種類ごとに1回まで**
    def test_連打しても呼ぶのは二回まで(self, client, counted, monkeypatch):
        kinds = iter(["zen", "snoopy"] * 25)
        monkeypatch.setattr(main.random, "choice", lambda seq: next(kinds))
        for _ in range(50):
            assert client.get("/api/splash/content").status_code == 200
        assert len(counted) == 2
