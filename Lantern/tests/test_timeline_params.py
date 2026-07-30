"""/api/timeline-reflection のパラメータ処理のテスト。

months_ago は Journal の振り返りタブの期間タブ（1・3・6・12ヶ月前）から渡る。
上限を超えた値や数値でない値で500を返さないことを固定する。
"""

import pytest

from main import _clamp_months_ago, _MONTHS_AGO_MIN, _MONTHS_AGO_MAX


class TestClampMonthsAgo:
    @pytest.mark.parametrize("raw,expected", [
        ("1", 1),
        ("3", 3),
        ("6", 6),
        ("12", 12),
    ])
    def test_振り返りタブが渡す4つの期間はそのまま通る(self, raw, expected):
        assert _clamp_months_ago(raw) == expected

    def test_上限は12(self):
        # 6 でクランプしていたため 12ヶ月前が使えなかった。上限を広げた回帰テスト
        assert _clamp_months_ago("12") == 12

    @pytest.mark.parametrize("raw", ["13", "100", "999999"])
    def test_上限を超えたら12に丸める(self, raw):
        assert _clamp_months_ago(raw) == 12

    @pytest.mark.parametrize("raw", ["0", "-1", "-100"])
    def test_下限を下回ったら1に丸める(self, raw):
        assert _clamp_months_ago(raw) == 1

    @pytest.mark.parametrize("raw", [None, "", "abc", "3.5", "1;DROP TABLE", [], {}, "１２ヶ月"])
    def test_数値として読めない値は1にする(self, raw):
        # 例外を投げず既定値に落とす契約。ここが崩れると500になる
        assert _clamp_months_ago(raw) == 1

    def test_全角数字は数値として解釈される(self):
        # int() は Unicode の十進数字を受け付けるため int("１２") == 12 になる。
        # 意図した挙動ではないが害もない（12として扱われる）ので、そのまま固定する。
        assert _clamp_months_ago("１２") == 12
        assert _clamp_months_ago("３") == 3

    def test_intをそのまま渡しても動く(self):
        assert _clamp_months_ago(3) == 3

    def test_定数と整合している(self):
        assert _MONTHS_AGO_MIN == 1
        assert _MONTHS_AGO_MAX == 12
        assert _clamp_months_ago(_MONTHS_AGO_MAX + 1) == _MONTHS_AGO_MAX
        assert _clamp_months_ago(_MONTHS_AGO_MIN - 1) == _MONTHS_AGO_MIN


class TestRouteStillGuarded:
    def test_認証なしでは401(self):
        from main import app
        assert app.test_client().get("/api/timeline-reflection?months_ago=12").status_code == 401
