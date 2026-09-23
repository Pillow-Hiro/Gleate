# -*- coding: utf-8 -*-
"""`modules/deepen.py` — モデルの見立てを、実在する記録に照らして通す。

作者から「単語だけで推測するの？全くの見当外れになって、危険じゃない？」。
深掘りは記録の本文を読ませ、**返ってきた日付と引用を記録に照らす。**
ここを通ったものだけが画面に出る。

2026-09-24、作者から「**記録を並べるのはサブで、本質はその記録を読んで、
深い見立てを建てること**」。見立ては1つ、記録は根拠として多くて3件。
"""
from modules.deepen import MAX_RECORDS, MIN_RECORDS, empty, ground, recent


def log(id, date, created="", struggled="", nxt=""):
    return {"id": id, "date": date, "created": created, "struggled": struggled, "next": nxt}


LOGS = [
    log("a", "2026-09-02", created="台本を書いた。", struggled="音響の調整が難しい"),
    log("b", "2026-09-05", created="収録した。", struggled="音が合わない"),
    log("c", "2026-09-05", created="日程の調整をした。"),
    log("d", "2026-09-11", created="配色を直した。", struggled="音響の調整にまた手間取った"),
]

READING = "音そのものより、合わせる手間のほうに言葉が向いているのかもしれません。"
TWO = [{"date": "2026-09-02", "quote": "音響の調整が難しい"},
       {"date": "2026-09-11", "quote": "音響の調整にまた手間取った"}]


def model(records, reading=READING, question="何を合わせようとしていたのでしょう。", found=True):
    return {"found": found, "reading": reading, "records": records, "question": question}


class TestRecords:
    def test_引用が本当にあればそのまま出す(self):
        got = ground(model(TWO), LOGS)
        assert got["records"][0] == {"id": "a", "date": "2026-09-02", "excerpt": "音響の調整が難しい"}

    # **作られた引用を出さない。**記録の書き出しに差し替える
    def test_記録に無い引用は書き出しに差し替える(self):
        got = ground(model([{"date": "2026-09-02", "quote": "音響は才能の問題だ"}] + TWO[1:]), LOGS)
        assert got["records"][0]["excerpt"] == "台本を書いた。"

    def test_渡していない日付は捨てる(self):
        got = ground(model([{"date": "2026-06-01", "quote": "x"}] + TWO), LOGS)
        assert [r["date"] for r in got["records"]] == ["2026-09-02", "2026-09-11"]

    # 1日に何件でも書ける。**同じ日のどの記録かは、引用で決める**
    def test_同じ日の記録は引用で見分ける(self):
        got = ground(model([{"date": "2026-09-05", "quote": "音が合わない"}] + TWO), LOGS)
        assert [r["id"] for r in got["records"]] == ["a", "b", "d"]

    def test_同じ記録は二度出さない(self):
        got = ground(model(TWO + [TWO[0]]), LOGS)
        assert len(got["records"]) == 2

    def test_上限を守る(self):
        many = [log(str(i), f"2026-09-{i + 1:02d}", created=f"記録{i}") for i in range(12)]
        recs = [{"date": l["date"], "quote": l["created"]} for l in many]
        got = ground(model(recs), many)
        assert len(got["records"]) == MAX_RECORDS

    # 照らすためだけに持っていた本文は、**画面には出さない**
    def test_記録の本文は返さない(self):
        assert set(ground(model(TWO), LOGS)["records"][0]) == {"id", "date", "excerpt"}


class TestReading:
    def test_二件に立っていれば出す(self):
        assert ground(model(TWO), LOGS)["reading"] == READING

    # **1件しか無い見立ては、その記録の言い直し**（2026-09-24）
    def test_一件しか残らなければ出さない(self):
        assert MIN_RECORDS == 2
        assert ground(model(TWO[:1]), LOGS) == empty()

    def test_空の見立ては出さない(self):
        assert ground(model(TWO, reading="  "), LOGS) == empty()

    # かぎ括弧は本人の言葉の印。**言い換えを入れたら作られた引用**（`modules/reader.py`）
    def test_言い換えをかぎ括弧に入れた見立ては捨てる(self):
        got = ground(model(TWO, reading="「音の調整で苦労している」と書かれています。"), LOGS)
        assert got == empty()

    def test_そのまま写した引用は通す(self):
        got = ground(model(TWO, reading="「音響の調整が難しい」と書いた日があります。"), LOGS)
        assert got["found"] is True

    def test_人を断じる見立ては捨てる(self):
        assert ground(model(TWO, reading="完璧主義な傾向があります。"), LOGS) == empty()

    def test_禁止ワードの入った見立ては捨てる(self):
        assert ground(model(TWO, reading="一歩ずつ進んでいるのかもしれません。"), LOGS) == empty()


class TestQuestion:
    def test_空の問いは無しにする(self):
        assert ground(model(TWO, question="  "), LOGS)["question"] is None

    # 「？」は答えを迫る形（`LANTERN_IDENTITY`）
    def test_問いの形でなければ落とす(self):
        assert ground(model(TWO, question="何を合わせようとしていた？"), LOGS)["question"] is None


class TestRecent:
    """読むのは新しい順に量で切る（2026-09-24・作者「90日前以前の記録もスルーしている」）"""

    def test_新しい順に量で切り_古い順で返す(self):
        many = [log(str(i), f"2026-09-{i + 1:02d}", created="あ" * 10) for i in range(9)]
        got = recent(many, max_chars=25)
        assert [l["id"] for l in got] == ["6", "7", "8"]

    def test_中身の無い記録は読ませない(self):
        assert recent([log("x", "2026-09-01"), LOGS[0]]) == [LOGS[0]]

    def test_全部入るなら全部返す(self):
        assert len(recent(LOGS)) == len(LOGS)


class TestNotFound:
    # **同じ話に見える記録が無ければ、何も作らない**
    def test_モデルが見つからないと言えば空(self):
        assert ground(model([], found=False), LOGS) == empty()

    def test_記録が1つも残らなければ空(self):
        assert ground(model([{"date": "2026-01-01", "quote": "x"}]), LOGS) == empty()

    def test_読めない形は空(self):
        assert ground(None, LOGS) == empty()
        assert ground("text", LOGS) == empty()

    def test_空を共有しない(self):
        a = empty()
        a["records"].append("x")
        assert empty()["records"] == []


class TestPrompt:
    def test_語ではなく書かれた文で判断させる(self):
        from modules.ai import _DEEPEN_SYSTEM

        assert "書かれた文で判断" in _DEEPEN_SYSTEM
        assert '"quote"' in _DEEPEN_SYSTEM and '"found"' in _DEEPEN_SYSTEM

    # 作者「見立てを最大2つ出している意味がよくわからない」
    def test_見立ては1つで3行(self):
        from modules.ai import _DEEPEN_SYSTEM

        assert "3行（2〜4文）に収める" in _DEEPEN_SYSTEM
        assert "2件以上の記録にまたがって" in _DEEPEN_SYSTEM

    # 2026-09-13 に本物で試したら「その日の手は音に触れていません」と書いた。
    # 記録には「音響の調整が難しい」とあった。**書かれていないことを無かったことにしていた**
    def test_書かれていないことを無かったことにさせない(self):
        from modules.ai import _DEEPEN_SYSTEM

        assert "無かったことのように言わない" in _DEEPEN_SYSTEM

    # 作者「45秒は長すぎる。遅くとも10秒以内にしてください」
    def test_十秒で返す(self):
        from modules import ai

        assert ai._DEEPEN_TIMEOUT_SECONDS <= 10

    def test_考える深さを下げて呼ぶ(self, monkeypatch):
        from modules import ai

        seen = {}

        def _call(system_prompt, user_message, **kw):
            seen.update(kw)
            return None

        monkeypatch.setattr(ai, "call_claude", _call)
        assert ai.generate_deepen("観察", None, LOGS) is None
        assert seen["effort"] == "low" and seen["retries"] == 0
        assert seen["timeout"] == ai._DEEPEN_TIMEOUT_SECONDS
        assert seen["model"] == ai._MODEL_DEEP and seen["schema"]["required"]
