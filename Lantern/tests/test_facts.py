# -*- coding: utf-8 -*-
"""`modules/facts.py` — 数えた事実が、本当に合っているか。

## なぜこの検査が要るか（2026-09-13）

有料の振り返りは、記録の生テキストを渡して「パターンを3つ」と
頼んでいた。**数えるのも選ぶのも書くのもモデル**で、実際には
渡していない時刻について「夜に3日書きました」と言わせていた。

数えるのをコードへ移した以上、**数が合うことはここで示す。**
モデルの側では示せない。
"""
from modules.facts import (
    as_text,
    find_item,
    next_then_done,
    period_facts,
    repeated_struggles,
    words,
)


def log(date, created="", struggled="", nxt=""):
    return {"date": date, "created": created, "struggled": struggled, "next": nxt}


class TestWords:
    def test_漢字とカタカナと英数字を拾う(self):
        got = set(words("台本をレコーディングしてOBSで確認"))
        assert "台本" in got
        assert "レコーディング" in got
        assert "OBS" in got

    def test_一文字は拾わない(self):
        # 「日」「人」はどの記録にも出る。一致しても何も言えない
        assert "日" not in words("今日は良い日")

    def test_どこにでも出る語は落とす(self):
        assert "自分" not in words("自分の時間を作る")

    def test_空でも落ちない(self):
        assert words(None) == []
        assert words("") == []


class TestRepeatedStruggles:
    def test_複数の記録に出た語だけ返す(self):
        logs = [
            log("2026-09-03", struggled="音が合わない"),
            log("2026-09-21", struggled="音の調整が難しい"),
            log("2026-09-22", struggled="配色で迷う"),
        ]
        got = {i["word"]: i["count"] for i in repeated_struggles(logs)}
        assert got.get("配色") is None
        assert got.get("音") is None  # 一文字は拾わない

    def test_同じ語が二件に出れば返る(self):
        logs = [
            log("2026-09-03", struggled="配色で迷う"),
            log("2026-09-21", struggled="配色を直す"),
        ]
        got = repeated_struggles(logs)
        assert [(i["word"], i["count"]) for i in got] == [("配色", 2)]

    # **1件の中で何度書いても1つ。**`lib/wordDrift.js` と同じ考え方
    def test_一件の中の繰り返しは数えない(self):
        logs = [log("2026-09-03", struggled="配色 配色 配色")]
        assert repeated_struggles(logs) == []

    def test_日付も返す(self):
        logs = [
            log("2026-09-03", struggled="配色で迷う"),
            log("2026-09-05", struggled="配色を変えた"),
        ]
        got = repeated_struggles(logs)[0]
        assert got["dates"] == ["2026-09-03", "2026-09-05"]


class TestNextThenDone:
    def test_先に書かれあとで現れたものを拾う(self):
        logs = [
            log("2026-09-01", nxt="音の調整をする"),
            log("2026-09-05", created="音の調整をした"),
        ]
        got = next_then_done(logs)
        assert got and got[0]["written"] == "2026-09-01"
        assert got[0]["appeared"] == "2026-09-05"

    # **順番が逆なら拾わない。**先にやってから書いたのは別のこと
    def test_同じ日や前の日のものは拾わない(self):
        logs = [
            log("2026-09-05", created="音の調整をした"),
            log("2026-09-06", nxt="音の調整をする"),
        ]
        assert next_then_done(logs) == []

    def test_並び順が乱れていても日付で判断する(self):
        logs = [
            log("2026-09-05", created="収録した"),
            log("2026-09-01", nxt="収録する"),
        ]
        got = next_then_done(logs)
        assert got and got[0]["written"] == "2026-09-01"

    def test_書いただけなら拾わない(self):
        assert next_then_done([log("2026-09-01", nxt="収録する")]) == []


class TestPeriodFacts:
    def test_日数と件数を数える(self):
        logs = [
            log("2026-09-01", created="あ"),
            log("2026-09-01", created="い"),
            log("2026-09-03", created="う"),
        ]
        got = period_facts(logs, 7)
        assert got["entries"] == 3
        assert got["days"] == 2  # 同じ日の2件は1日
        assert got["span_days"] == 7

    def test_記録が無くても落ちない(self):
        got = period_facts([], 7)
        assert got["entries"] == 0 and got["days"] == 0
        assert got["first"] is None

    def test_日付の無い記録は数えない(self):
        assert period_facts([{"created": "あ"}], 7)["entries"] == 0


class TestAsText:
    def test_数が文に出る(self):
        text = as_text(period_facts([log("2026-09-01", created="台本")], 7))
        assert "1日 / 7日" in text
        assert "1件" in text

    # **モデルに渡すのは平文。**箇条書きにすると列挙を促してしまう
    def test_箇条書きにしない(self):
        text = as_text(period_facts([log("2026-09-01", created="台本")], 7))
        assert not any(line.startswith(("-", "・", "*")) for line in text.split("\n"))


class TestTimeOfDayIsNotThere:
    """**時刻は渡していない。**渡していないものを数えていないこと。

    2026-09-13 まで、プロンプトは「記録した時間帯の傾向」を筆頭の
    観察点にしていた。`_fmt_logs` は時刻を渡していないので、
    あれは数えたものではなく、それらしく作られた数だった。
    """

    def test_事実に時刻が混ざらない(self):
        logs = [{"date": "2026-09-01", "created": "台本", "saved_at": "2026-09-01T23:10:00Z"}]
        text = as_text(period_facts(logs, 7))
        assert "夜" not in text
        assert "時" not in text


class TestItems:
    """**指せる事実に番号を振る**（2026-09-13）。

    観察に「どの事実に立っているか」を番号で返させ、語・日付・件数は
    サーバーが数えたものから付ける。深掘りはこの事実を広げる。
    """

    def _logs(self):
        return [
            log("2026-09-01", struggled="配色で迷う", nxt="収録する"),
            log("2026-09-05", struggled="配色を直す", created="収録した"),
        ]

    def test_指せる事実に番号が付く(self):
        items = period_facts(self._logs(), 7)["items"]
        assert [i["id"] for i in items] == ["F1", "F2"]
        assert (items[0]["kind"], items[0]["word"]) == ("repeated_struggle", "配色")
        assert (items[1]["kind"], items[1]["word"]) == ("next_then_done", "収録")

    def test_どちらの事実も日付を持つ(self):
        items = period_facts(self._logs(), 7)["items"]
        assert items[0]["dates"] == ["2026-09-01", "2026-09-05"]
        assert items[1]["dates"] == ["2026-09-01", "2026-09-05"]

    def test_文に番号が出る(self):
        text = as_text(period_facts(self._logs(), 7))
        assert "F1: 「配色」" in text
        assert "F2: 「収録」" in text

    def test_番号で事実を引ける(self):
        assert find_item(period_facts(self._logs(), 7), "F2")["word"] == "収録"

    # **作られた番号を通さない**
    def test_知らない番号は引けない(self):
        facts = period_facts(self._logs(), 7)
        assert find_item(facts, "F9") is None
        assert find_item(facts, None) is None
        assert find_item(facts, {"id": "F1"}) is None

    def test_指せる事実が無ければ番号も無い(self):
        assert period_facts([log("2026-09-01", created="台本")], 7)["items"] == []
