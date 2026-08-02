"""アプリの日付基準のテスト。

Render は UTC で動くが、利用者は JST にいる。
サーバーが naive な datetime.now() から日付を作ると、
JST 00:00〜09:00 の9時間だけ日付が1日前になる。

実害が出るのは「今日の灯り」で、早朝に開くと前日の灯りが返り、
参照する「昨日の記録」も1日ずれる。
「昨日の記録を読んで、今朝そっと置く一言」という設計が、
朝いちばんに開いたときだけ崩れていた。
"""

import importlib
from datetime import date, datetime, timezone

import pytest

from modules import timeutil


# UTC 2026-08-02 18:45 = JST 2026-08-03 03:45（日付が変わる）
UTC_LATE_NIGHT_JST = datetime(2026, 8, 2, 18, 45, tzinfo=timezone.utc)
# UTC 2026-08-02 23:59 = JST 2026-08-03 08:59（境界の直前）
UTC_JUST_BEFORE_9AM_JST = datetime(2026, 8, 2, 23, 59, tzinfo=timezone.utc)
# UTC 2026-08-03 01:00 = JST 2026-08-03 10:00（ずれない時間帯）
UTC_DAYTIME = datetime(2026, 8, 3, 1, 0, tzinfo=timezone.utc)


class TestAppTimezone:
    def test_既定はAsia_Tokyo(self):
        assert str(timeutil.APP_TZ) == "Asia/Tokyo"

    def test_環境変数で上書きできる(self, monkeypatch):
        monkeypatch.setenv("APP_TIMEZONE", "UTC")
        reloaded = importlib.reload(timeutil)
        try:
            assert str(reloaded.APP_TZ) == "UTC"
        finally:
            monkeypatch.delenv("APP_TIMEZONE", raising=False)
            importlib.reload(timeutil)


class TestTodayStr:
    def test_UTCの夜はJSTでは翌日になる(self):
        assert timeutil.today_str(now=UTC_LATE_NIGHT_JST) == "2026-08-03"

    def test_JST9時直前もすでに翌日(self):
        assert timeutil.today_str(now=UTC_JUST_BEFORE_9AM_JST) == "2026-08-03"

    def test_昼間はUTCと同じ日付(self):
        assert timeutil.today_str(now=UTC_DAYTIME) == "2026-08-03"

    def test_従来の実装とずれることを示す(self):
        # これが直したかった差。naive な strftime は UTC の日付を返す
        assert UTC_LATE_NIGHT_JST.strftime("%Y-%m-%d") == "2026-08-02"
        assert timeutil.today_str(now=UTC_LATE_NIGHT_JST) == "2026-08-03"

    def test_引数なしでも文字列を返す(self):
        result = timeutil.today_str()
        assert len(result) == 10 and result[4] == "-" and result[7] == "-"


class TestTodayDate:
    def test_dateを返す(self):
        assert timeutil.today_date(now=UTC_LATE_NIGHT_JST) == date(2026, 8, 3)

    def test_naiveな日時はUTCとみなす(self):
        # 呼び出し側が naive を渡しても JST 換算がずれないようにする
        naive = datetime(2026, 8, 2, 18, 45)
        assert timeutil.today_date(now=naive) == date(2026, 8, 3)


class TestDaysAgoStr:
    def test_昨日はJST基準で1日前(self):
        # JST では 8/3 未明。昨日は 8/2（UTC基準だと 8/1 になってしまう）
        assert timeutil.days_ago_str(1, now=UTC_LATE_NIGHT_JST) == "2026-08-02"

    def test_7日前(self):
        assert timeutil.days_ago_str(7, now=UTC_LATE_NIGHT_JST) == "2026-07-27"

    def test_0日前は今日(self):
        assert timeutil.days_ago_str(0, now=UTC_LATE_NIGHT_JST) == "2026-08-03"

    def test_月をまたぐ(self):
        assert timeutil.days_ago_str(3, now=UTC_LATE_NIGHT_JST) == "2026-07-31"


class TestRoutesActuallyUseIt:
    """ヘルパーが正しくても、呼び出し側が使っていなければ意味がない。

    以前 `_attach_photo_urls` で、関数単体のテストはあるのに
    呼び出していることの確認が無く、変異テストが生存した前例がある。
    同じ穴を空けないよう、ルートが timeutil 経由で日付を決めていることを固定する。
    """

    def test_今日の灯りはJSTの日付でキャッシュを引く(self, monkeypatch):
        from flask import g
        import main

        # 実在しない日付を返させる。実日付を書くと、たまたま
        # サーバーのUTC日付と一致した日にテストが素通りする
        # （最初この書き方をして変異テストが生存した）。
        SENTINEL = "1999-12-31"

        asked = {}
        monkeypatch.setattr(main, "today_str", lambda: SENTINEL)
        monkeypatch.setattr(main, "days_ago_str", lambda n: "1999-12-30")
        monkeypatch.setattr(
            main, "load_daily_quote",
            lambda uid, date: asked.setdefault("date", date) and None or "灯り",
        )

        with main.app.test_request_context("/api/daily/quote"):
            g.user_id = "abc-123"
            main.daily_quote.__wrapped__()

        assert asked["date"] == SENTINEL, (
            f"today_str() ではなくサーバー日付を使っている（{asked['date']}）"
        )

    def test_今日の灯りはJSTの昨日を参照する(self, monkeypatch):
        from flask import g
        import main

        seen = {}
        monkeypatch.setattr(main, "today_str", lambda: "2026-08-03")
        monkeypatch.setattr(main, "days_ago_str", lambda n: f"days_ago_{n}")
        monkeypatch.setattr(main, "load_daily_quote", lambda uid, date: None)
        monkeypatch.setattr(main, "save_daily_quote", lambda *a, **k: None)
        monkeypatch.setattr(
            main, "load_logs",
            lambda uid: [{"date": "days_ago_1", "created": "昨日のこと"}],
        )

        def _fake_quote(yesterday_log=None):
            seen["log"] = yesterday_log
            return "今朝の一言", "ai"

        monkeypatch.setattr("modules.ai.get_daily_quote", _fake_quote)

        with main.app.test_request_context("/api/daily/quote"):
            g.user_id = "abc-123"
            main.daily_quote.__wrapped__()

        assert seen["log"] is not None, "days_ago_str(1) で昨日を引けていない"
        assert seen["log"]["created"] == "昨日のこと"


class TestNowUtcIso:
    def test_タイムゾーン付きのUTCを返す(self):
        # saved_at は timestamptz に入る。オフセットが無いと
        # DB 側の解釈任せになるため、明示して曖昧さを消す
        value = timeutil.now_utc_iso()
        assert value.endswith("+00:00")
        parsed = datetime.fromisoformat(value)
        assert parsed.tzinfo is not None
        assert parsed.utcoffset().total_seconds() == 0
