"""modules/ai.py のAI出力パースのテスト。

AIは指示してもコードブロックや前置きを付けてくることがある。
ここが失敗すると固定文言のフォールバックが返り、
画面上はAI生成と見分けがつかないまま静かに劣化する。
"""

import json

import pytest

from modules.ai import (
    _MONTHLY_SYSTEM,
    _WEEKLY_SYSTEM,
    _drop_blank_questions,
    _first_pattern,
    _fmt_logs,
    _parse_patterns_json,
)


FALLBACK = '{"patterns": []}'


class TestParsePatternsJson:
    def test_素のJSONはそのまま通す(self):
        raw = '{"patterns": [{"observation": "夜に記録した日が3日ありました。"}]}'
        assert json.loads(_parse_patterns_json(raw)) == json.loads(raw)

    def test_jsonつきコードブロックを剥がす(self):
        raw = '```json\n{"patterns": []}\n```'
        assert json.loads(_parse_patterns_json(raw)) == {"patterns": []}

    def test_言語指定なしのコードブロックも剥がす(self):
        raw = '```\n{"patterns": [{"observation": "a"}]}\n```'
        assert json.loads(_parse_patterns_json(raw)) == {"patterns": [{"observation": "a"}]}

    def test_前後に文章が付いていてもJSON部分を救い出す(self):
        raw = 'こちらが結果です。\n{"patterns": [{"observation": "a"}]}\nご確認ください。'
        assert json.loads(_parse_patterns_json(raw)) == {"patterns": [{"observation": "a"}]}

    def test_改行を含むJSONを扱える(self):
        raw = '説明\n{\n  "patterns": [\n    {"observation": "a"}\n  ]\n}'
        assert json.loads(_parse_patterns_json(raw)) == {"patterns": [{"observation": "a"}]}

    @pytest.mark.parametrize("raw", ["", None])
    def test_空入力はフォールバック(self, raw):
        assert _parse_patterns_json(raw) == FALLBACK

    def test_JSONでない文字列はフォールバック(self):
        assert _parse_patterns_json("パターンは見つかりませんでした。") == FALLBACK

    def test_壊れたJSONはフォールバック(self):
        assert _parse_patterns_json('{"patterns": [') == FALLBACK

    def test_フォールバック自体が正しいJSON(self):
        # 呼び出し元は戻り値を json.loads する。ここが壊れると500になる
        assert json.loads(FALLBACK) == {"patterns": []}

    def test_解析に失敗したらログを残す(self, capsys):
        # 静かに劣化させないための保険。ログがないと本番で気づけない
        _parse_patterns_json("これはJSONではない")
        assert "JSON解析に失敗" in capsys.readouterr().out

    def test_解析に成功したときはログを出さない(self, capsys):
        _parse_patterns_json('{"patterns": []}')
        assert "JSON解析に失敗" not in capsys.readouterr().out


class TestFmtLogs:
    def test_記録なしなら空文字(self):
        assert _fmt_logs([]) == ""

    def test_日付と本文を並べる(self):
        result = _fmt_logs([{"date": "2026-07-28", "created": "曲を書いた"}])
        assert result == "\n2026-07-28: 曲を書いた"

    def test_よかったことがあれば添える(self):
        result = _fmt_logs([{"date": "2026-07-28", "created": "曲を書いた", "enjoyable": "静かな朝"}])
        assert "（よかったこと: 静かな朝）" in result

    def test_困ったことがあれば添える(self):
        result = _fmt_logs([{"date": "2026-07-28", "created": "曲", "struggled": "サビ"}])
        assert "（困ったこと: サビ）" in result

    def test_空の項目は添えない(self):
        result = _fmt_logs([{"date": "2026-07-28", "created": "曲", "enjoyable": "", "struggled": ""}])
        assert "よかったこと" not in result
        assert "困ったこと" not in result

    def test_createdがなくても落ちない(self):
        # 写真記録の追加（2026-08-01）で挙動を変えた。
        # 本文が空の記録はAIに渡さずスキップする（旧: "\n2026-07-28: " を返していた）
        assert _fmt_logs([{"date": "2026-07-28"}]) == ""

    def test_複数件を改行で並べる(self):
        result = _fmt_logs([
            {"date": "2026-07-27", "created": "a"},
            {"date": "2026-07-28", "created": "b"},
        ])
        assert result == "\n2026-07-27: a\n2026-07-28: b"


class TestFmtLogsSkipsEmpty:
    """写真だけの記録は本文が空になる。

    中身の無い行をAIに渡すと「2026-08-01: 」という無意味な入力になるため
    スキップする。
    """

    def test_全項目が空の記録はスキップする(self):
        logs = [
            {"date": "2026-08-01", "created": "", "enjoyable": "", "struggled": "", "next": ""},
            {"date": "2026-08-02", "created": "曲を書いた"},
        ]
        assert _fmt_logs(logs) == "\n2026-08-02: 曲を書いた"

    def test_全部が空の記録だけなら空文字(self):
        assert _fmt_logs([{"date": "2026-08-01", "created": ""}]) == ""

    def test_createdが空でも他が埋まっていれば残す(self):
        result = _fmt_logs([{"date": "2026-08-01", "created": "", "enjoyable": "静かな朝"}])
        assert "2026-08-01" in result
        assert "静かな朝" in result

    def test_nextだけでも残す(self):
        result = _fmt_logs([{"date": "2026-08-01", "next": "明日サビを直す"}])
        assert "2026-08-01" in result

    def test_写真パスがあっても本文が空ならスキップする(self):
        # 写真はAIに渡さない方針。写真の有無で判定を変えない
        logs = [{"date": "2026-08-01", "created": "", "photo_path": "u/x.jpg"}]
        assert _fmt_logs(logs) == ""


class TestOneObservation:
    """観察は1つ（2026-09-13・作者の判断）。

    それまで「最大3つ」だったが、3の理由は記録に無く、違う話を3つ
    求めると埋め草が出た。**受け取る側でも1つに切る。**
    """

    def test_二つ目以降を捨てる(self):
        raw = json.dumps({"patterns": [{"observation": "a"}, {"observation": "b"}, {"observation": "c"}]})
        assert json.loads(_first_pattern(raw)) == {"patterns": [{"observation": "a"}]}

    def test_空はそのまま(self):
        assert json.loads(_first_pattern('{"patterns": []}')) == {"patterns": []}

    def test_読めないものは触らない(self):
        assert _first_pattern("not json") == "not json"

    @pytest.mark.parametrize("prompt", [_WEEKLY_SYSTEM, _MONTHLY_SYSTEM])
    def test_プロンプトが3つを頼んでいない(self, prompt):
        assert "最大3" not in prompt
        assert "1つだけ" in prompt


class TestDropBlankQuestions:
    """「問いを省いてよい」と許すと、鍵を消さず空文字で返ってくる。"""

    def test_空の問いは鍵ごと落とす(self):
        raw = json.dumps({"patterns": [{"observation": "a", "question": ""}]}, ensure_ascii=False)
        assert json.loads(_drop_blank_questions(raw)) == {"patterns": [{"observation": "a"}]}

    def test_中身のある問いは残す(self):
        raw = json.dumps({"patterns": [{"observation": "a", "question": "q。"}]}, ensure_ascii=False)
        assert json.loads(_drop_blank_questions(raw))["patterns"][0]["question"] == "q。"
