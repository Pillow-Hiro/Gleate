# -*- coding: utf-8 -*-
"""`modules/reader.py` — 今週の振り返りを、決まった手順で読む。

モデルが返した候補は、**記録に照らして通ったものだけ**が確かめに回り、
確かめを通ったものだけが画面に出る。どれも通らなければ黙る。
"""
import json

import pytest

from modules import reader
from modules.reader import MAX_CANDIDATES, can_speak, choose, ground, label, to_patterns


def log(id, date, created="", struggled="", nxt=""):
    return {"id": id, "date": date, "created": created, "struggled": struggled, "next": nxt}


WEEK = [
    log("w2", "2026-09-11", created="収録で声の出し方に迷った"),
    log("w1", "2026-09-09", created="台本を直した。", struggled="声の出し方が決まらない"),
]
PREV = [log("p1", "2026-09-02", created="配色を直した。")]


def entries():
    return label(WEEK, PREV)


def cand(observation, refs_quotes, question="どこで手が止まるのでしょう。"):
    return {"observation": observation, "question": question,
            "records": [{"ref": r, "quote": q} for r, q in refs_quotes]}


VOICE = [("W1", "声の出し方が決まらない"), ("W2", "収録で声の出し方に迷った")]
GOOD = "9月9日にも9月11日にも、声の出し方のことが書かれています。"


class TestLabel:
    def test_今週はW_前の週はPで古い順(self):
        assert [(e["ref"], e["date"]) for e in entries()] == [
            ("W1", "2026-09-09"), ("W2", "2026-09-11"), ("P1", "2026-09-02"),
        ]

    def test_中身の無い記録には番号を振らない(self):
        assert label([log("x", "2026-09-10")], []) == []

    def test_番号と日付を添えて渡す(self):
        text = reader.as_text(entries())
        assert "W1（9月9日）: 台本を直した。（困ったこと: 声の出し方が決まらない）" in text
        assert "【その前の週の記録】" in text and "P1（9月2日）" in text


class TestCanSpeak:
    def test_今週の記録が無ければ黙る(self):
        assert not can_speak(label([], PREV + [log("p2", "2026-09-03", created="続き")]))

    def test_全部で1件なら黙る(self):
        assert not can_speak(label([WEEK[0]], []))

    def test_今週1件と前の週1件なら読む(self):
        assert can_speak(label([WEEK[0]], PREV))


class TestGround:
    def test_記録に照らして合えば通す(self):
        got = ground({"candidates": [cand(GOOD, VOICE)]}, entries())
        assert len(got) == 1
        assert [r["date"] for r in got[0]["records"]] == ["2026-09-09", "2026-09-11"]

    def test_空白やかぎ括弧の違いは許す(self):
        got = ground({"candidates": [cand(GOOD, [("W1", "「声の出し方が 決まらない」"), VOICE[1]])]}, entries())
        assert len(got) == 1

    # **作られた引用を通さない**
    def test_記録に無い引用があれば候補ごと捨てる(self):
        got = ground({"candidates": [cand(GOOD, [("W1", "声は才能の問題だ"), VOICE[1]])]}, entries())
        assert got == []

    def test_無い番号があれば捨てる(self):
        assert ground({"candidates": [cand(GOOD, [("W9", "声の出し方"), VOICE[1]])]}, entries()) == []

    # 1つの記録の言い換えは、並べて見えたことではない
    def test_記録1つだけの候補は捨てる(self):
        assert ground({"candidates": [cand("9月9日の記録に声のことがあります。", VOICE[:1])]}, entries()) == []

    def test_同じ記録を2回数えない(self):
        assert ground({"candidates": [cand("9月9日の記録です。", [VOICE[0], VOICE[0]])]}, entries()) == []

    def test_今週の記録を使っていなければ捨てる(self):
        both_prev = label([WEEK[0]], PREV + [log("p2", "2026-09-03", created="配色の続きを直した")])
        got = ground({"candidates": [cand("配色のことが続いています。", [("P1", "配色を直した"), ("P2", "配色の続き")])]}, both_prev)
        assert got == []

    # 文の中の日付は信用しない
    def test_使っていない日付を書いた候補は捨てる(self):
        assert ground({"candidates": [cand("9月3日にも9月11日にも声のことがあります。", VOICE)]}, entries()) == []

    def test_日だけの書き方も確かめる(self):
        assert ground({"candidates": [cand("3日と11日の記録に声のことがあります。", VOICE)]}, entries()) == []
        assert len(ground({"candidates": [cand("9日と11日の記録に声のことがあります。", VOICE)]}, entries())) == 1

    def test_1日中や7日間は日付として読まない(self):
        got = ground({"candidates": [cand("9月9日は1日中、9月11日も、声の出し方のことが書かれています。", VOICE)]}, entries())
        assert len(got) == 1

    def test_かぎ括弧の中は本人の言葉なので日付を見ない(self):
        got = ground({"candidates": [cand("「3日で終える」とは別に、9月9日と9月11日に声のことがあります。", VOICE)]}, entries())
        assert len(got) == 1

    def test_答えを迫る問いは落とし観察は残す(self):
        got = ground({"candidates": [cand(GOOD, VOICE, question="どこで止まるのでしょう？")]}, entries())
        assert got[0]["question"] is None

    def test_候補は多くてMAX_CANDIDATESまで(self):
        got = ground({"candidates": [cand(GOOD, VOICE)] * 5}, entries())
        assert len(got) == MAX_CANDIDATES

    @pytest.mark.parametrize("raw", [None, "text", {}, {"candidates": "x"}, {"candidates": [1, None, {}]}])
    def test_読めない形は空(self, raw):
        assert ground(raw, entries()) == []


class TestChoose:
    def test_通った中でモデルが確かだと並べた順の最初(self):
        cands = ["a", "b", "c"]
        verdicts = {"verdicts": [{"index": 2, "pass": True}, {"index": 1, "pass": True}, {"index": 0, "pass": False}]}
        assert choose(cands, verdicts) == "b"

    def test_どれも通らなければNone(self):
        assert choose(["a"], {"verdicts": [{"index": 0, "pass": False}]}) is None

    # 「true」という文字や、真偽値の番号は通さない
    @pytest.mark.parametrize("v", [{"index": 0, "pass": "true"}, {"index": True, "pass": True}, {"index": "0", "pass": True}])
    def test_形の崩れた判定は通さない(self, v):
        assert choose(["a", "b"], {"verdicts": [v]}) is None


class TestToPatterns:
    def test_画面が読む形にする(self):
        chosen = ground({"candidates": [cand(GOOD, list(reversed(VOICE)))]}, entries())[0]
        got = to_patterns(chosen)
        assert got == {"patterns": [{
            "observation": GOOD,
            "question": "どこで手が止まるのでしょう。",
            "fact": {"kind": "records", "dates": ["2026-09-09", "2026-09-11"], "ids": ["w2", "w1"]},
        }]}

    def test_問いが無ければ鍵を置かない(self):
        chosen = ground({"candidates": [cand(GOOD, VOICE, question="")]}, entries())[0]
        assert "question" not in to_patterns(chosen)["patterns"][0]

    def test_黙るときは空(self):
        assert to_patterns(None) == {"patterns": []}


class TestReadWeeklyReview:
    """手順が、この順で呼ばれていること。**モデルは差し替える**"""

    def fake(self, monkeypatch, replies):
        from modules import ai

        seen = []

        def _call(system_prompt, user_message, **kw):
            seen.append((system_prompt, kw))
            return replies.pop(0)

        monkeypatch.setattr(ai, "call_claude", _call)
        return ai, seen

    def test_並べるものが無ければ呼ばずに黙る(self, monkeypatch):
        ai, seen = self.fake(monkeypatch, [])
        assert json.loads(ai.read_weekly_review([WEEK[0]], [])) == {"patterns": []}
        assert seen == []

    def test_確かめを通った候補だけを出す(self, monkeypatch):
        from modules.ai import _WEEKLY_CHECK_SYSTEM, _WEEKLY_READ_SYSTEM

        shaky = cand("9月9日と9月11日で、声への向き合い方が変わっています。", VOICE)
        ai, seen = self.fake(monkeypatch, [
            json.dumps({"candidates": [shaky, cand(GOOD, VOICE)]}),
            json.dumps({"verdicts": [{"index": 0, "pass": False, "reason": "意味づけ"},
                                     {"index": 1, "pass": True, "reason": ""}]}),
        ])
        got = json.loads(ai.read_weekly_review(WEEK, PREV))
        assert got["patterns"][0]["observation"] == GOOD
        assert [s for s, _ in seen] == [_WEEKLY_READ_SYSTEM, _WEEKLY_CHECK_SYSTEM]
        assert all(kw.get("schema") for _, kw in seen)

    def test_どれも通らなければ黙る(self, monkeypatch):
        ai, _ = self.fake(monkeypatch, [
            json.dumps({"candidates": [cand(GOOD, VOICE)]}),
            json.dumps({"verdicts": [{"index": 0, "pass": False, "reason": "要約"}]}),
        ])
        assert json.loads(ai.read_weekly_review(WEEK, PREV)) == {"patterns": []}

    def test_照らして何も残らなければ確かめを呼ばない(self, monkeypatch):
        ai, seen = self.fake(monkeypatch, [json.dumps({"candidates": [cand(GOOD, [("W1", "作られた引用"), VOICE[1]])]})])
        assert json.loads(ai.read_weekly_review(WEEK, PREV)) == {"patterns": []}
        assert len(seen) == 1

    # **読めなかったことと、黙ったことを分ける**
    @pytest.mark.parametrize("replies", [[None], ["{壊れた"], [json.dumps({"candidates": [cand(GOOD, VOICE)]}), None]])
    def test_読めなかったときはNone(self, monkeypatch, replies):
        ai, _ = self.fake(monkeypatch, replies)
        assert ai.read_weekly_review(WEEK, PREV) is None


class TestCallClaudeOptions:
    """構造化出力と、物差しの聞き耳（`modules/ai.py` の `call_claude`）"""

    def fake_client(self, monkeypatch):
        from modules import ai

        sent = {}

        class Block:
            text = "{}"

        class Message:
            content = [Block()]
            model = "claude-sonnet-5"
            usage = None
            stop_reason = "end_turn"

        class Client:
            def __init__(self, **kw):
                self.messages = self

            def create(self, **kw):
                sent.update(kw)
                return Message()

        monkeypatch.setenv("ANTHROPIC_API_KEY", "x")
        monkeypatch.setattr(ai.anthropic, "Anthropic", Client)
        return ai, sent

    def test_形を渡すと構造化出力を頼む(self, monkeypatch):
        ai, sent = self.fake_client(monkeypatch)
        heard = []
        monkeypatch.setattr(ai, "RESPONSE_HOOK", lambda s, u, m: heard.append(m.model))
        assert ai.call_claude("sys", "user", schema={"type": "object"}, effort="medium") == "{}"
        assert sent["output_config"] == {
            "format": {"type": "json_schema", "schema": {"type": "object"}}, "effort": "medium",
        }
        assert heard == ["claude-sonnet-5"]

    def test_渡さなければ今までと同じ(self, monkeypatch):
        ai, sent = self.fake_client(monkeypatch)
        ai.call_claude("sys", "user")
        assert "output_config" not in sent


class TestPrompts:
    def test_無理に作らせない(self):
        from modules.ai import _WEEKLY_READ_SYSTEM

        assert "無理に作らない" in _WEEKLY_READ_SYSTEM
        assert "書かれた文で読む" in _WEEKLY_READ_SYSTEM

    def test_確かめは迷ったら落とす(self):
        from modules.ai import _WEEKLY_CHECK_SYSTEM

        assert "迷ったら false" in _WEEKLY_CHECK_SYSTEM
