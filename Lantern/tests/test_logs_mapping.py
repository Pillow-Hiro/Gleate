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
    "favorite": False,
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
    "favorite": False,
}


class TestFromDb:
    def test_全カラムをアプリのフィールド名に変換する(self):
        assert _from_db(DB_ROW) == APP_LOG

    def test_空の行でも全キーが空文字で揃う(self):
        result = _from_db({})
        assert result == {
            "date": "", "created": "", "enjoyable": "",
            "struggled": "", "next": "", "saved_at": "", "ai_response": "",
            # お気に入りだけ真偽値。未設定は False（付いていない）
            "favorite": False,
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


# `_to_db` が書かない列。**ここに入れたら、記録を保存するたびに上書きされる。**
# 写真は 2026-08-06 に、お気に入りは 2026-08-13 に外した。
WRITE_EXCLUDED = {"favorite"}
DB_ROW_WRITABLE = {k: v for k, v in DB_ROW.items() if k not in WRITE_EXCLUDED}


class TestToDb:
    def test_全フィールドをSupabaseのカラム名に変換する(self):
        row = _to_db(APP_LOG, "abc-123")
        assert row == DB_ROW_WRITABLE

    def test_お気に入りを書かない(self):
        """**記録の保存でお気に入りを触らない。**

        記録フォームは favorite を送らない。`_to_db` がこの列を出すと、
        既定値（False）で上書きされ、**編集するたびに星が外れる。**
        付け外しは `set_favorite()` がその列だけを書く。
        """
        row = _to_db({**APP_LOG, "favorite": True}, "abc-123")
        assert "favorite" not in row

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
        # お気に入りは `_to_db` が書かない列なので、往復の対象外
        assert _to_db(_from_db(DB_ROW), "abc-123") == DB_ROW_WRITABLE

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


class TestNoPhotoColumns:
    """写真カラムを読み書きしないこと。

    2026-08-06 に写真を端末の中だけに置く方針へ変えた。
    保存されていれば、サーバーの鍵を持つ開発者が中身を見られるため。

    **DBの列はまだ残っている。** 読み書きを再開すると、
    端末とサーバーの二重管理になり、消したはずの写真がサーバーに残る。
    列を落とすまではここで止める。
    """

    PHOTO_KEYS = ("photo_path", "photo_thumb_path")

    def test_from_dbは写真カラムを返さない(self):
        row = {
            **DB_ROW,
            "photo_path": "u/2026-08-01.jpg",
            "photo_thumb_path": "u/2026-08-01_thumb.jpg",
        }
        result = _from_db(row)
        for key in self.PHOTO_KEYS:
            assert key not in result, f"{key} を返している"

    def test_to_dbは写真カラムを出力しない(self):
        row = _to_db(
            {**APP_LOG, "photo_path": "u/x.jpg", "photo_thumb_path": "u/x_thumb.jpg"},
            "abc-123",
        )
        for key in self.PHOTO_KEYS:
            assert key not in row, f"{key} を書こうとしている"

    def test_to_dbの出力キーは固定(self):
        assert set(_to_db(APP_LOG, "abc-123").keys()) == {
            "date", "content", "good_things", "struggles",
            "next_action", "lantern_message", "updated_at", "user_id",
        }

    def test_DB_SELECTに写真カラムを含めない(self):
        from modules.logs import _DB_SELECT

        selected = {c.strip() for c in _DB_SELECT.split(",")}
        for key in self.PHOTO_KEYS:
            assert key not in selected, f"{key} を選択している"

    def test_写真キーを持つデータを渡しても出力は変わらない(self):
        with_photo = {**APP_LOG, "photo_path": "u/x.jpg", "photo_thumb_path": "u/x_thumb.jpg"}
        assert _to_db(with_photo, "abc-123") == _to_db(APP_LOG, "abc-123")


class TestTextOnlyNullRow:
    """テキスト列が NULL の行。

    写真だけの記録を作っていた時期の行が残っている。
    _from_db が None をそのまま返すとクライアントに `created: null` が渡り、
    `.trim()` で落ちる。`row.get("content", "")` は
    「キーがある＋値が None」では既定値を返さない。
    """

    NULL_ROW = {
        "id": 1,
        "date": "2026-08-01",
        "content": None,
        "good_things": None,
        "struggles": None,
        "next_action": None,
        "lantern_message": None,
        "updated_at": "2026-08-01T10:00:00",
        "user_id": "abc-123",
    }

    def test_テキスト列がNULLでも全て空文字で返す(self):
        result = _from_db(self.NULL_ROW)
        for key in ("created", "enjoyable", "struggled", "next", "ai_response"):
            assert result[key] == "", f"{key} が {result[key]!r} になっている"

    def test_値は必ず文字列(self):
        # フロントは .trim() や .toLowerCase() を呼ぶ。None が混ざると落ちる。
        # **`favorite` だけは真偽値。** 文字列にすると "" が真になり、
        # 付いていない記録に星が立つ
        result = _from_db(self.NULL_ROW)
        for key, value in result.items():
            if key == "favorite":
                assert isinstance(value, bool), "favorite は真偽値であること"
                continue
            assert isinstance(value, str), f"{key} が {type(value).__name__} になっている"

    def test_dateがNoneでも文字列のNoneにしない(self):
        # str(None) は "None" という文字列になり、日付比較を静かに壊す
        assert _from_db({**self.NULL_ROW, "date": None})["date"] == ""


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

class TestDeleteLogDoesNotTouchStorage:
    """記録の削除で Storage に触らないこと。

    以前は Storage の写真も消していた。写真を端末に移したので、
    サーバーは写真の存在を知らない。端末側 lib/photoStore.js の
    remove() が受け持つ。
    """

    def test_写真モジュールを参照していない(self):
        import inspect

        from modules import logs

        src = inspect.getsource(logs)
        assert "modules.photos" not in src, "削除済みのモジュールを参照している"
        assert "delete_photo" not in src


class TestFavoriteColumnIsOptional:
    """`favorite` 列が無くても記録を返せるか。

    列を足す SQL は人の手で流す。サーバーの配備が先に済むと、
    `select` が落ちて**記録が1件も出ない画面**になる。
    2026-08-13 に列を足したとき、この順番の危険に気づいた。

    落ちたらテストではなく `load_logs` の方を直すこと。
    """

    def test_列が無いときは外して読み直す(self, monkeypatch):
        from modules import logs as logs_mod

        tried = []

        class _Q:
            def __init__(self, select):
                self.select_str = select

            def eq(self, *a, **k):
                return self

            def order(self, *a, **k):
                return self

            def execute(self):
                tried.append(self.select_str)
                if "favorite" in self.select_str:
                    raise RuntimeError('column logs.favorite does not exist')
                return type("R", (), {"data": [dict(DB_ROW)]})()

        class _Table:
            def select(self, s):
                return _Q(s)

        monkeypatch.setattr(logs_mod, "supabase", type("S", (), {"table": lambda self, n: _Table()})())

        rows = logs_mod.load_logs("abc-123")
        assert len(tried) == 2, "1回目で落ちたら、列を外してもう一度読むこと"
        assert "favorite" in tried[0] and "favorite" not in tried[1]
        assert len(rows) == 1
        # 列が無いので False になる。**落ちないことが目的**
        assert rows[0]["favorite"] is False

    def test_列があれば1回で読む(self, monkeypatch):
        from modules import logs as logs_mod

        tried = []

        class _Q:
            def __init__(self, select):
                self.select_str = select

            def eq(self, *a, **k):
                return self

            def order(self, *a, **k):
                return self

            def execute(self):
                tried.append(self.select_str)
                return type("R", (), {"data": [dict(DB_ROW, favorite=True)]})()

        class _Table:
            def select(self, s):
                return _Q(s)

        monkeypatch.setattr(logs_mod, "supabase", type("S", (), {"table": lambda self, n: _Table()})())

        rows = logs_mod.load_logs("abc-123")
        assert len(tried) == 1
        assert rows[0]["favorite"] is True
