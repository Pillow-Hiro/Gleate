"""modules/logs.py のカラム名変換のテスト。

Supabase のカラム名とアプリ内のフィールド名が異なるため、
ここがずれると保存はできても読み出しで内容が消える。
画面上は「記録が空になった」ように見えるだけで例外は出ないため、
テストで固定しておく価値が高い。

  Supabase: content / good_things / struggles / next_action / lantern_message / updated_at
  App:      created / enjoyable   / struggled / next        / ai_response     / saved_at
"""

from datetime import datetime

import pytest

from modules.logs import (
    _from_db,
    _to_db,
    get_week_str,
    get_month_str,
    get_month_display_str,
    get_week_display_str,
    get_current_weekly_goal,
    get_current_monthly_goal,
)


DB_ROW = {
    "date": "2026-07-28",
    "content": "曲を1つ書いた",
    "good_things": "静かな朝だった",
    "struggles": "サビが決まらない",
    "next_action": "明日サビを直す",
    "lantern_message": "昨日の記録が、ここに残っています。",
    "updated_at": "2026-07-28T21:30:00",
    "user_id": "abc-123",
}

APP_LOG = {
    "date": "2026-07-28",
    "created": "曲を1つ書いた",
    "enjoyable": "静かな朝だった",
    "struggled": "サビが決まらない",
    "next": "明日サビを直す",
    "ai_response": "昨日の記録が、ここに残っています。",
    "saved_at": "2026-07-28T21:30:00",
}


class TestFromDb:
    def test_全カラムをアプリのフィールド名に変換する(self):
        assert _from_db(DB_ROW) == APP_LOG

    def test_空の行でも全キーが空文字で揃う(self):
        result = _from_db({})
        assert result == {
            "date": "", "created": "", "enjoyable": "",
            "struggled": "", "next": "", "saved_at": "", "ai_response": "",
        }

    def test_updated_atがNoneなら空文字にする(self):
        # None のまま返すと日付比較で TypeError になる
        assert _from_db({**DB_ROW, "updated_at": None})["saved_at"] == ""

    def test_dateはstrに正規化される(self):
        # Supabase が date 型を返した場合でも文字列比較できるようにする
        from datetime import date as date_type
        assert _from_db({"date": date_type(2026, 7, 28)})["date"] == "2026-07-28"

    def test_user_idはアプリ側に持ち込まない(self):
        assert "user_id" not in _from_db(DB_ROW)


class TestToDb:
    def test_全フィールドをSupabaseのカラム名に変換する(self):
        row = _to_db(APP_LOG, "abc-123")
        assert row == DB_ROW

    def test_user_id未指定ならNoneが入る(self):
        assert _to_db(APP_LOG)["user_id"] is None

    def test_saved_atがなければ現在時刻を入れる(self):
        row = _to_db({k: v for k, v in APP_LOG.items() if k != "saved_at"})
        # ISO形式としてパースできること（例外が出なければよい）
        datetime.fromisoformat(row["updated_at"])

    def test_saved_atが空文字でも現在時刻で埋める(self):
        row = _to_db({**APP_LOG, "saved_at": ""})
        datetime.fromisoformat(row["updated_at"])

    def test_欠けたフィールドは空文字になる(self):
        row = _to_db({"date": "2026-07-28"})
        assert row["content"] == ""
        assert row["good_things"] == ""
        assert row["struggles"] == ""
        assert row["next_action"] == ""


class TestRoundTrip:
    def test_アプリからDBへ戻して内容が保たれる(self):
        assert _from_db(_to_db(APP_LOG, "abc-123")) == APP_LOG

    def test_DBからアプリへ戻して内容が保たれる(self):
        assert _to_db(_from_db(DB_ROW), "abc-123") == DB_ROW

    def test_日本語や改行を含んでも壊れない(self):
        log = {**APP_LOG, "created": "1行目\n2行目\t「引用」😀"}
        assert _from_db(_to_db(log, "abc-123"))["created"] == log["created"]


class TestPeriodStrings:
    def test_週の文字列は年とISO週番号(self):
        assert get_week_str() == datetime.now().strftime("%Y-W%W")

    def test_月の文字列はYYYY_MM(self):
        assert get_month_str() == datetime.now().strftime("%Y-%m")

    def test_表示用の月は日本語(self):
        now = datetime.now()
        assert get_month_display_str() == f"{now.year}年{now.month}月"

    def test_表示用の週は日曜始まりの範囲(self):
        result = get_week_display_str()
        assert "〜" in result
        assert result.startswith(str(datetime.now().year))


class TestCurrentGoals:
    def test_今週の目標がなければ空文字(self):
        assert get_current_weekly_goal({}) == ""
        assert get_current_weekly_goal({"weekly_goals": []}) == ""

    def test_今週の目標を取り出す(self):
        goals = {"weekly_goals": [{"week": get_week_str(), "goal": "1曲仕上げる"}]}
        assert get_current_weekly_goal(goals) == "1曲仕上げる"

    def test_別の週の目標は拾わない(self):
        goals = {"weekly_goals": [{"week": "1999-W01", "goal": "古い目標"}]}
        assert get_current_weekly_goal(goals) == ""

    def test_同じ週が複数あれば後から追加された方を返す(self):
        week = get_week_str()
        goals = {"weekly_goals": [
            {"week": week, "goal": "古い"},
            {"week": week, "goal": "新しい"},
        ]}
        assert get_current_weekly_goal(goals) == "新しい"

    def test_今月の目標を取り出す(self):
        goals = {"monthly_goals": [{"month": get_month_str(), "goal": "アルバムを作る"}]}
        assert get_current_monthly_goal(goals) == "アルバムを作る"

    def test_今月の目標がなければ空文字(self):
        assert get_current_monthly_goal({}) == ""
        assert get_current_monthly_goal({"monthly_goals": [{"month": "1999-01", "goal": "x"}]}) == ""
