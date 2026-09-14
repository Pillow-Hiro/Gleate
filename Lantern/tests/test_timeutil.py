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

    # 2026-09-14。先週の記録が今週の記録に重ねて渡っていた
    def test_今週の振り返りに先週の記録を重ねて渡さない(self, monkeypatch):
        from flask import g
        import main

        monkeypatch.setattr(
            main, "review_windows",
            lambda t: (("2026-09-08", "2026-09-14"), ("2026-09-01", "2026-09-07")),
        )
        monkeypatch.setattr(main, "spend_ai_budget", lambda uid: True)
        monkeypatch.setattr(main, "load_goals", lambda: [])
        monkeypatch.setattr(main, "load_logs", lambda uid: [
            {"date": "2026-09-07", "created": "先週のこと"},
            {"date": "2026-09-09", "created": "今週のこと"},
        ])

        seen = {}

        def _fake_review(period_logs, goals, last_week_logs=None):
            seen["period"] = [l["date"] for l in period_logs]
            seen["previous"] = [l["date"] for l in last_week_logs or []]
            return '{"patterns": []}'

        monkeypatch.setattr(main, "get_weekly_review", _fake_review)

        with main.app.test_request_context(
            "/api/review/generate", method="POST", json={"type": "weekly"}
        ):
            g.user_id = "abc-123"
            main.generate_review.__wrapped__()

        assert seen == {"period": ["2026-09-09"], "previous": ["2026-09-07"]}


class TestReviewWindows:
    """振り返りの期間と、比べる前の期間（2026-09-14）。

    今週は「7日前から」、先週は「月曜から日曜」と別の数え方で切っていて、
    **月曜には先週がまるごと今週に入っていた。**
    """

    @staticmethod
    def _jst_noon(y, m, d):
        return datetime(y, m, d, 3, 0, tzinfo=timezone.utc)  # JST 12:00

    def test_作者が見た月曜の窓(self):
        assert date(2026, 9, 14).weekday() == 0
        assert timeutil.review_windows("weekly", now=self._jst_noon(2026, 9, 14)) == (
            ("2026-09-08", "2026-09-14"), ("2026-09-01", "2026-09-07"),
        )

    @pytest.mark.parametrize("day", range(14, 21))  # 2026-09-14（月）から20日（日）まで
    def test_どの曜日でも週は重ならず隣り合う(self, day):
        (start, end), (p_start, p_end) = timeutil.review_windows(
            "weekly", now=self._jst_noon(2026, 9, day)
        )
        s, e, ps, pe = map(date.fromisoformat, (start, end, p_start, p_end))
        assert (s - pe).days == 1
        assert (e - s).days == 6 and (pe - ps).days == 6

    def test_月は先月まるごとと比べる(self):
        assert timeutil.review_windows("monthly", now=self._jst_noon(2026, 9, 14)) == (
            ("2026-09-01", "2026-09-14"), ("2026-08-01", "2026-08-31"),
        )

    def test_1月の前は前の年の12月(self):
        _, prev = timeutil.review_windows("monthly", now=self._jst_noon(2027, 1, 5))
        assert prev == ("2026-12-01", "2026-12-31")

    def test_月のはじめの日も重ならない(self):
        assert timeutil.review_windows("monthly", now=self._jst_noon(2028, 3, 1)) == (
            ("2028-03-01", "2028-03-01"), ("2028-02-01", "2028-02-29"),
        )


class TestNowUtcIso:
    def test_タイムゾーン付きのUTCを返す(self):
        # saved_at は timestamptz に入る。オフセットが無いと
        # DB 側の解釈任せになるため、明示して曖昧さを消す
        value = timeutil.now_utc_iso()
        assert value.endswith("+00:00")
        parsed = datetime.fromisoformat(value)
        assert parsed.tzinfo is not None
        assert parsed.utcoffset().total_seconds() == 0
