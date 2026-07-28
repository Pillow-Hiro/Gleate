"""modules/ai.py のAI出力パースのテスト。

AIは指示してもコードブロックや前置きを付けてくることがある。
ここが失敗すると固定文言のフォールバックが返り、
画面上はAI生成と見分けがつかないまま静かに劣化する。
"""

import json

import pytest

from modules.ai import _parse_patterns_json, _fmt_logs


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

    def test_楽しかったことがあれば添える(self):
        result = _fmt_logs([{"date": "2026-07-28", "created": "曲を書いた", "enjoyable": "静かな朝"}])
        assert "（楽しかったこと: 静かな朝）" in result

    def test_困ったことがあれば添える(self):
        result = _fmt_logs([{"date": "2026-07-28", "created": "曲", "struggled": "サビ"}])
        assert "（困ったこと: サビ）" in result

    def test_空の項目は添えない(self):
        result = _fmt_logs([{"date": "2026-07-28", "created": "曲", "enjoyable": "", "struggled": ""}])
        assert "楽しかったこと" not in result
        assert "困ったこと" not in result

    def test_createdがなくても落ちない(self):
        assert _fmt_logs([{"date": "2026-07-28"}]) == "\n2026-07-28: "

    def test_複数件を改行で並べる(self):
        result = _fmt_logs([
            {"date": "2026-07-27", "created": "a"},
            {"date": "2026-07-28", "created": "b"},
        ])
        assert result == "\n2026-07-27: a\n2026-07-28: b"
