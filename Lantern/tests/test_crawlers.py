# -*- coding: utf-8 -*-
"""検索エンジンへの案内（2026-10-16）。

Search Console から「ページがインデックスに登録されない」と来た。調べると、

- `api.golantern.app` まで巡回されていた（ドメイン全体を登録したため）。
  APIはページを配る場所ではないので、404 と転送ばかりが報告される
- Web 側は `robots.txt` も `sitemap.xml` も**実体が無かった。**Vercel は
  どのURLでもアプリの殻を返すので、置いたつもりで置けていなかった

APIは「見なくていい」と伝え、Webは案内板を実体として置く。
Web 側は `scripts/build_legal.py` が法務ページと一緒に作る——**一覧を2か所に置かない。**
"""
import io
import os

import pytest

import main

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(*parts):
    return io.open(os.path.join(ROOT, *parts), encoding="utf-8").read()


class TestApi:
    def test_APIは巡回しなくてよいと伝える(self):
        res = main.app.test_client().get("/robots.txt")
        assert res.status_code == 200
        assert res.mimetype == "text/plain"
        assert "Disallow: /" in res.get_data(as_text=True)


class TestWeb:
    """`client/public/` に置いたものが、生成物と一致しているか"""

    def _legal(self):
        import sys

        sys.path.insert(0, os.path.join(ROOT, "scripts"))
        import build_legal

        return build_legal

    def test_生成物が最新である(self):
        legal = self._legal()
        assert read("client", "public", "robots.txt") == legal.robots()
        assert read("client", "public", "sitemap.xml") == legal.sitemap(), (
            "ページを足して sitemap.xml を作り直していない。"
            "python scripts/build_legal.py を実行すること"
        )

    def test_案内にsitemapの場所を書く(self):
        assert "Sitemap: https://www.golantern.app/sitemap.xml" in read("client", "public", "robots.txt")

    # **実体のあるページだけを載せる。**アプリの中はログインが要る
    @pytest.mark.parametrize("page", ["", "about.html", "privacy.html", "terms.html", "tokushoho.html"])
    def test_公開ページがすべて載っている(self, page):
        assert f"<loc>https://www.golantern.app/{page}</loc>" in read("client", "public", "sitemap.xml")

    def test_アプリの中は載せない(self):
        body = read("client", "public", "sitemap.xml")
        for inside in ("/journal", "/login", "/deepen", "/write"):
            assert inside not in body

    def test_載せたページが実在する(self):
        legal = self._legal()
        for _, target, _ in legal.DOCS:
            assert os.path.exists(os.path.join(ROOT, "client", "public", target)), target
