"""/save が書き込む行数を固定するテスト。

以前は load_logs で全件を取り、1件だけ差し替えて save_logs(logs) に
全件を渡していた。さらに AI 応答を入れるためもう一度全件を書いていた。
save_logs は1行ごとに SELECT + UPDATE するため、記録19件の時点で
1回の保存に80往復かかっていた。100件あたりで Render の30秒制限を超え、
保存そのものが失敗するようになる。

「活動を継続できた日数」を指標に置くアプリが、継続すると壊れる構造だった。
書き込む行数が記録件数に依存しないことを、ここで固定する。
"""

import pytest
from flask import g

import main
from modules import logs as logs_mod


def _fake_log(date, ai_response="以前の灯り"):
    return {
        "date": date, "created": "何か書いた", "enjoyable": "", "struggled": "",
        "next": "", "saved_at": "2026-07-01T00:00:00+00:00",
        "ai_response": ai_response, "photo_path": "", "photo_thumb_path": "",
    }


@pytest.fixture
def upserted(monkeypatch):
    """_upsert_one に渡された行を記録する。DBには繋がない。"""
    rows = []
    monkeypatch.setattr(logs_mod, "supabase", object())
    monkeypatch.setattr(logs_mod, "_upsert_one",
                        lambda row, create=False: rows.append(row))
    monkeypatch.setattr(main, "get_ai_response", lambda *a, **k: "新しい灯り")
    monkeypatch.setattr(main, "load_goals", lambda: {})
    return rows


def _save(existing_logs, payload):
    with main.app.test_request_context("/save", method="POST", json=payload):
        g.user_id = "abc-123"
        return main.save.__wrapped__()


class TestSaveWritesOnlyTargetRow:
    @pytest.mark.parametrize("existing_count", [0, 1, 19, 200])
    def test_書き込む行数は記録件数に依存しない(self, monkeypatch, upserted, existing_count):
        logs = [_fake_log(f"2026-01-{i % 28 + 1:02d}") for i in range(existing_count)]
        monkeypatch.setattr(main, "load_logs", lambda uid: list(logs))

        _save(logs, {"date": "2026-08-03", "created": "今日のこと"})

        # 何件持っていても、書くのは対象の1日だけ
        assert {r["date"] for r in upserted} == {"2026-08-03"}
        assert len(upserted) <= 2, f"{len(upserted)}行も書いている"

    def test_既存の他の日を書き換えない(self, monkeypatch, upserted):
        logs = [_fake_log("2026-08-01"), _fake_log("2026-08-02")]
        monkeypatch.setattr(main, "load_logs", lambda uid: list(logs))

        _save(logs, {"date": "2026-08-03", "created": "今日のこと"})

        assert "2026-08-01" not in {r["date"] for r in upserted}
        assert "2026-08-02" not in {r["date"] for r in upserted}

    def test_既存の日を編集しても1日分しか書かない(self, monkeypatch, upserted):
        logs = [_fake_log("2026-08-01"), _fake_log("2026-08-02")]
        monkeypatch.setattr(main, "load_logs", lambda uid: list(logs))

        _save(logs, {"date": "2026-08-02", "created": "書き直した"})

        assert {r["date"] for r in upserted} == {"2026-08-02"}


class TestAiResponseIsNotLost:
    """AI生成が落ちても、既にある灯りを消さない。"""

    def test_生成に失敗しても既存の灯りが残る(self, monkeypatch, upserted):
        logs = [_fake_log("2026-08-02", ai_response="消えては困る灯り")]
        monkeypatch.setattr(main, "load_logs", lambda uid: list(logs))

        def _boom(*a, **k):
            raise RuntimeError("Anthropic down")

        monkeypatch.setattr(main, "get_ai_response", _boom)

        _save(logs, {"date": "2026-08-02", "created": "本文だけ直した"})

        # 本文は保存されている
        assert upserted, "本文の保存まで失敗している"
        assert upserted[-1]["content"] == "本文だけ直した"
        # 既存の灯りが空で上書きされていない
        assert upserted[-1]["lantern_message"] == "消えては困る灯り"

    def test_生成が成功したら新しい灯りで上書きする(self, monkeypatch, upserted):
        logs = [_fake_log("2026-08-02", ai_response="古い灯り")]
        monkeypatch.setattr(main, "load_logs", lambda uid: list(logs))

        _save(logs, {"date": "2026-08-02", "created": "本文"})

        assert upserted[-1]["lantern_message"] == "新しい灯り"


class TestSaveUsesLocalDate:
    """日付未指定のときサーバーのUTC日付を使わない。"""

    def test_日付未指定ならJSTの今日になる(self, monkeypatch, upserted):
        monkeypatch.setattr(main, "load_logs", lambda uid: [])
        monkeypatch.setattr(main, "today_str", lambda: "2026-08-03")

        _save([], {"created": "日付を送らなかった"})

        assert upserted[0]["date"] == "2026-08-03"
