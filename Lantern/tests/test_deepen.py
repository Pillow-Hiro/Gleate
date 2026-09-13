# -*- coding: utf-8 -*-
"""`modules/deepen.py` — モデルの読みを、実在する記録に照らして通す。

作者から「単語だけで推測するの？全くの見当外れになって、危険じゃない？」。
深掘りは3か月分の本文を読ませ、**返ってきた日付と引用を記録に照らす。**
ここを通ったものだけが画面に出る。
"""
from modules.deepen import MAX_READINGS, MAX_RECORDS, empty, ground


def log(id, date, created="", struggled="", nxt=""):
    return {"id": id, "date": date, "created": created, "struggled": struggled, "next": nxt}


LOGS = [
    log("a", "2026-09-02", created="台本を書いた。", struggled="音響の調整が難しい"),
    log("b", "2026-09-05", created="収録した。", struggled="音が合わない"),
    log("c", "2026-09-05", created="日程の調整をした。"),
    log("d", "2026-09-11", created="配色を直した。", struggled="音響の調整にまた手間取った"),
]


def model(records, readings, question="何を合わせようとしていたのでしょう。", found=True):
    return {"found": found, "records": records, "readings": readings, "question": question}


class TestRecords:
    def test_引用が本当にあればそのまま出す(self):
        got = ground(model([{"date": "2026-09-02", "quote": "音響の調整が難しい"}],
                           [{"text": "候補", "dates": ["2026-09-02"]}]), LOGS)
        assert got["records"] == [{"id": "a", "date": "2026-09-02", "excerpt": "音響の調整が難しい"}]

    # **作られた引用を出さない。**記録の書き出しに差し替える
    def test_記録に無い引用は書き出しに差し替える(self):
        got = ground(model([{"date": "2026-09-02", "quote": "音響は才能の問題だ"}],
                           [{"text": "候補", "dates": ["2026-09-02"]}]), LOGS)
        assert got["records"][0]["excerpt"] == "台本を書いた。"

    def test_期間に無い日付は捨てる(self):
        got = ground(model([{"date": "2026-06-01", "quote": "x"},
                            {"date": "2026-09-11", "quote": "音響の調整にまた手間取った"}],
                           [{"text": "候補", "dates": ["2026-09-11"]}]), LOGS)
        assert [r["date"] for r in got["records"]] == ["2026-09-11"]

    # 1日に何件でも書ける。**同じ日のどの記録かは、引用で決める**
    def test_同じ日の記録は引用で見分ける(self):
        got = ground(model([{"date": "2026-09-05", "quote": "音が合わない"}],
                           [{"text": "候補", "dates": ["2026-09-05"]}]), LOGS)
        assert got["records"][0]["id"] == "b"

    def test_日付の順に並べる(self):
        got = ground(model([{"date": "2026-09-11", "quote": "音響の調整にまた手間取った"},
                            {"date": "2026-09-02", "quote": "音響の調整が難しい"}],
                           [{"text": "候補", "dates": ["2026-09-02"]}]), LOGS)
        assert [r["date"] for r in got["records"]] == ["2026-09-02", "2026-09-11"]

    def test_同じ記録は二度出さない(self):
        got = ground(model([{"date": "2026-09-02", "quote": "音響の調整が難しい"},
                            {"date": "2026-09-02", "quote": "音響の調整が難しい"}],
                           [{"text": "候補", "dates": ["2026-09-02"]}]), LOGS)
        assert len(got["records"]) == 1

    def test_上限を守る(self):
        many = [log(str(i), f"2026-09-{i + 1:02d}", created=f"記録{i}") for i in range(12)]
        recs = [{"date": l["date"], "quote": l["created"]} for l in many]
        got = ground(model(recs, [{"text": "候補", "dates": [many[0]["date"]]}]), many)
        assert len(got["records"]) == MAX_RECORDS


class TestReadings:
    # **見立ては、出した記録のどれかに立っていなければ捨てる**
    def test_根拠の記録が無い見立ては捨てる(self):
        got = ground(model([{"date": "2026-09-02", "quote": "音響の調整が難しい"}],
                           [{"text": "根拠なし", "dates": ["2026-09-30"]},
                            {"text": "根拠あり", "dates": ["2026-09-02"]}]), LOGS)
        assert [r["text"] for r in got["readings"]] == ["根拠あり"]

    def test_見立ては多くて2つ(self):
        reads = [{"text": f"候補{i}", "dates": ["2026-09-02"]} for i in range(4)]
        got = ground(model([{"date": "2026-09-02", "quote": "音響の調整が難しい"}], reads), LOGS)
        assert len(got["readings"]) == MAX_READINGS

    def test_空の見立てしか無ければ何も出さない(self):
        got = ground(model([{"date": "2026-09-02", "quote": "音響の調整が難しい"}],
                           [{"text": "  ", "dates": ["2026-09-02"]}]), LOGS)
        assert got == empty()


class TestNotFound:
    # **同じ話に見える記録が無ければ、何も作らない**
    def test_モデルが見つからないと言えば空(self):
        assert ground(model([], [], found=False), LOGS) == empty()

    def test_記録が1つも残らなければ空(self):
        got = ground(model([{"date": "2026-01-01", "quote": "x"}],
                           [{"text": "候補", "dates": ["2026-01-01"]}]), LOGS)
        assert got == empty()

    def test_読めない形は空(self):
        assert ground(None, LOGS) == empty()
        assert ground("text", LOGS) == empty()

    def test_空を共有しない(self):
        a = empty()
        a["records"].append("x")
        assert empty()["records"] == []

    def test_空の問いは無しにする(self):
        got = ground(model([{"date": "2026-09-02", "quote": "音響の調整が難しい"}],
                           [{"text": "候補", "dates": ["2026-09-02"]}], question="  "), LOGS)
        assert got["question"] is None


class TestPrompt:
    def test_語ではなく書かれた文で判断させる(self):
        from modules.ai import _DEEPEN_SYSTEM

        assert "書かれた文で判断" in _DEEPEN_SYSTEM
        assert '"quote"' in _DEEPEN_SYSTEM and '"found"' in _DEEPEN_SYSTEM

    def test_見立ては候補で2つまで(self):
        from modules.ai import _DEEPEN_SYSTEM

        assert "多くて2つ" in _DEEPEN_SYSTEM

    # 2026-09-13 に本物で試したら「その日の手は音に触れていません」と書いた。
    # 記録には「音響の調整が難しい」とあった。**書かれていないことを無かったことにしていた**
    def test_書かれていないことを無かったことにさせない(self):
        from modules.ai import _DEEPEN_SYSTEM

        assert "無かったことのように言わない" in _DEEPEN_SYSTEM
