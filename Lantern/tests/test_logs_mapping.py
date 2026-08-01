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
    # 写真なしの記録。DB_ROW に写真カラムが無い場合の _from_db の出力に合わせる
    "photo_path": "",
    "photo_thumb_path": "",
}


class TestFromDb:
    def test_全カラムをアプリのフィールド名に変換する(self):
        assert _from_db(DB_ROW) == APP_LOG

    def test_空の行でも全キーが空文字で揃う(self):
        result = _from_db({})
        assert result == {
            "date": "", "created": "", "enjoyable": "",
            "struggled": "", "next": "", "saved_at": "", "ai_response": "",
            "photo_path": "", "photo_thumb_path": "",
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


class TestPhotoColumns:
    """写真カラムの扱い。

    /save は受け取ったデータから entry を作り直すため、_to_db が写真を
    書くようにするとテキスト編集だけで写真が消える。
    そのため _to_db は写真カラムを一切出力しない。
    """

    def test_from_dbは写真パスを変換する(self):
        row = {
            **DB_ROW,
            "photo_path": "u/2026-08-01.jpg",
            "photo_thumb_path": "u/2026-08-01_thumb.jpg",
        }
        result = _from_db(row)
        assert result["photo_path"] == "u/2026-08-01.jpg"
        assert result["photo_thumb_path"] == "u/2026-08-01_thumb.jpg"

    def test_写真カラムがNoneなら空文字になる(self):
        # None のまま返すとフロントで `photo_path &&` の判定が通ってしまう
        row = {**DB_ROW, "photo_path": None, "photo_thumb_path": None}
        result = _from_db(row)
        assert result["photo_path"] == ""
        assert result["photo_thumb_path"] == ""

    def test_写真カラムが無い行でも空文字になる(self):
        result = _from_db(DB_ROW)
        assert result["photo_path"] == ""
        assert result["photo_thumb_path"] == ""

    def test_to_dbは写真カラムを出力しない(self):
        # ここが崩れると、テキスト編集のたびに写真が消える
        row = _to_db(
            {**APP_LOG, "photo_path": "u/x.jpg", "photo_thumb_path": "u/x_thumb.jpg"},
            "abc-123",
        )
        assert "photo_path" not in row
        assert "photo_thumb_path" not in row

    def test_to_dbの出力キーは固定(self):
        assert set(_to_db(APP_LOG, "abc-123").keys()) == {
            "date", "content", "good_things", "struggles",
            "next_action", "lantern_message", "updated_at", "user_id",
        }

    def test_写真つきの記録を保存してもDBの写真カラムは変わらない(self):
        # /save 相当の往復。写真を持つアプリ側データを _to_db に通しても
        # 写真カラムが出力されないため、既存の写真は更新対象から外れる
        with_photo = {**APP_LOG, "photo_path": "u/x.jpg", "photo_thumb_path": "u/x_thumb.jpg"}
        assert _to_db(with_photo, "abc-123") == _to_db(APP_LOG, "abc-123")


class _RecordingRow(dict):
    """_from_db がどのカラムを読んだかを記録する dict。"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.accessed = set()

    def get(self, key, default=None):
        self.accessed.add(key)
        return super().get(key, default)


class TestDbSelectCoversFromDb:
    """_from_db が読むカラムが _DB_SELECT に入っているかを構造的に検証する。

    _DB_SELECT への追加を忘れると、DBに値があっても常に空で返る。
    例外は出ず「写真が消えた」ように見えるだけなので気づきにくい。
    """

    def test_from_dbが読むカラムはすべてDB_SELECTに含まれる(self):
        from modules.logs import _DB_SELECT

        row = _RecordingRow(DB_ROW)
        _from_db(row)

        selected = {c.strip() for c in _DB_SELECT.split(",")}
        missing = row.accessed - selected
        assert not missing, f"_DB_SELECT に無いカラムを読んでいる: {sorted(missing)}"

    def test_写真カラムがDB_SELECTに入っている(self):
        from modules.logs import _DB_SELECT

        selected = {c.strip() for c in _DB_SELECT.split(",")}
        assert "photo_path" in selected
        assert "photo_thumb_path" in selected


class TestDeleteLogRemovesPhoto:
    """記録を削除したら Storage の写真も消す。

    ON DELETE CASCADE はDBの行しか消さない。Storage を消さないと
    消したはずの写真が容量を食い続ける（孤児ファイル）。
    """

    def test_記録を削除するとStorageの写真も消す(self, monkeypatch):
        from modules import logs as logs_mod
        called = []
        monkeypatch.setattr(logs_mod, "supabase", None)
        monkeypatch.setattr(
            "modules.photos.delete_photo",
            lambda user_id, date: called.append((user_id, date)),
        )

        logs_mod.delete_log_by_date("2026-08-01", "abc-123")

        assert called == [("abc-123", "2026-08-01")]

    def test_user_idが無ければStorageには触らない(self, monkeypatch):
        # パスが組み立てられないため。呼ぶと ValueError になる
        from modules import logs as logs_mod
        called = []
        monkeypatch.setattr(logs_mod, "supabase", None)
        monkeypatch.setattr(
            "modules.photos.delete_photo",
            lambda user_id, date: called.append((user_id, date)),
        )

        logs_mod.delete_log_by_date("2026-08-01", None)

        assert called == []

    def test_写真の削除に失敗してもDB削除は続行する(self, monkeypatch):
        # 孤児ファイルは残るが、記録が消せないほうが困る
        from modules import logs as logs_mod
        deleted = []

        class _FakeQuery:
            def delete(self):
                return self

            def eq(self, *args):
                return self

            def execute(self):
                deleted.append(True)

        class _FakeSupabase:
            def table(self, name):
                return _FakeQuery()

        monkeypatch.setattr(logs_mod, "supabase", _FakeSupabase())
        monkeypatch.setattr(
            "modules.photos.delete_photo",
            lambda user_id, date: (_ for _ in ()).throw(RuntimeError("storage down")),
        )

        logs_mod.delete_log_by_date("2026-08-01", "abc-123")

        assert deleted == [True]
