# -*- coding: utf-8 -*-
"""`modules/reader.py` — 今週の振り返りを、決まった手順で読み、問いを1つ置く。

モデルが返した問いの候補は、**記録に照らして通ったものだけ**が確かめに回り、
確かめを通ったもののうち、いちばん考えたくなるものが画面に出る。
どれも通らなければ、落ちた理由を渡して1回だけ作り直す。
"""
import json

import pytest

from modules import reader
from modules.reader import (
    MAX_CANDIDATES, can_ask, choose, ground, label, rejections, retry_note, to_patterns,
)


def log(id, date, created="", struggled="", nxt=""):
    return {"id": id, "date": date, "created": created, "struggled": struggled, "next": nxt}


WEEK = [
    log("w2", "2026-09-11", created="収録で声の出し方に迷った"),
    log("w1", "2026-09-09", created="台本を直した。", struggled="声の出し方が決まらない"),
]
PREV = [log("p1", "2026-09-02", created="配色を直した。")]


def entries():
    return label(WEEK, PREV)


def cand(question, refs_quotes, hint=""):
    return {"question": question, "hint": hint,
            "records": [{"ref": r, "quote": q} for r, q in refs_quotes]}


VOICE = [("W1", "声の出し方が決まらない")]
ASK = "「声の出し方が決まらない」とき、決めようとしているのは声のどこでしょう。"


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


class TestCanAsk:
    # 作者「黙るのもダメ」
    def test_今週の記録が1件だけでも問いを作る(self):
        assert can_ask(label([WEEK[0]], []))

    def test_今週の記録が無ければ作らない(self):
        assert not can_ask(label([], PREV))


class TestGround:
    def test_記録に照らして合えば通す(self):
        kept, dropped = ground({"candidates": [cand(ASK, VOICE)]}, entries())
        assert [c["question"] for c in kept] == [ASK] and dropped == []
        assert [r["date"] for r in kept[0]["records"]] == ["2026-09-09"]

    # **作られた引用を通さない**。落ちた理由は作り直しに渡す
    def test_記録に無い引用は理由つきで落とす(self):
        kept, dropped = ground({"candidates": [cand(ASK, [("W1", "声は才能の問題だ")])]}, entries())
        assert kept == []
        assert dropped == [{"question": ASK, "reason": "きっかけにした記録の引用が、記録に無い"}]

    def test_無い番号は落とす(self):
        assert ground({"candidates": [cand(ASK, [("W9", "声の出し方")])]}, entries())[0] == []

    def test_きっかけの記録が無ければ落とす(self):
        assert ground({"candidates": [cand(ASK, [])]}, entries())[0] == []

    def test_今週の記録から起こしていなければ落とす(self):
        kept, dropped = ground({"candidates": [cand("「配色を直した」あと、何が残っているのでしょう。", [("P1", "配色を直した")])]}, entries())
        assert kept == [] and dropped[0]["reason"] == "今週の記録から起こしていない"

    @pytest.mark.parametrize("question", ["声のどこを決めようとしているのでしょう？", "声のどこを決めようとしているのでしょう"])
    def test_問いは句点で終え_疑問符を使わない(self, question):
        assert ground({"candidates": [cand(question, VOICE)]}, entries())[0] == []

    def test_問いの中のかぎ括弧が記録に無ければ落とす(self):
        kept, dropped = ground({"candidates": [cand("「声は才能だ」と感じるのは、どんなときでしょう。", VOICE)]}, entries())
        assert kept == [] and dropped[0]["reason"] == "問いの中の「」か日付が、記録と合わない"

    def test_空白の違いは許す(self):
        assert len(ground({"candidates": [cand("「声の出し方が 決まらない」とき、決めようとしているのは声のどこでしょう。", VOICE)]}, entries())[0]) == 1

    def test_使っていない日付を書いた問いは落とす(self):
        assert ground({"candidates": [cand("9月3日の声は、どこが決まらなかったのでしょう。", VOICE)]}, entries())[0] == []

    def test_1日中や7日間は日付として読まない(self):
        assert len(ground({"candidates": [cand("1日中考えても決まらないのは、声のどこでしょう。", VOICE)]}, entries())[0]) == 1

    # 手がかりは添えもの。**手がかりだけが合わなければ、問いは残す**
    @pytest.mark.parametrize("hint", ["「声は才能だ」とも書かれています。", "9月3日にも声のことがあります。", "声のどこでしょう？"])
    def test_合わない手がかりは外して問いは残す(self, hint):
        kept, _ = ground({"candidates": [cand(ASK, VOICE, hint=hint)]}, entries())
        assert kept[0]["hint"] is None

    def test_合う手がかりは残す(self):
        hint = "9月11日の記録にも、声の出し方のことが出ています。"
        kept, _ = ground({"candidates": [cand(ASK, VOICE + [("W2", "収録で声の出し方に迷った")], hint=hint)]}, entries())
        assert kept[0]["hint"] == hint

    # 2026-09-15 の試し。手がかりに「W6の中で…」と、渡すための番号をそのまま書いた
    def test_記録の番号が入った問いは落とす(self):
        kept, dropped = ground({"candidates": [cand("W1の「声の出し方が決まらない」は、声のどこでしょう。", VOICE)]}, entries())
        assert kept == [] and dropped[0]["reason"] == "問いに記録の番号（W1 など）が入っている"

    def test_記録の番号が入った手がかりは外す(self):
        from modules.ai import _WEEKLY_ASK_SYSTEM

        kept, _ = ground({"candidates": [cand(ASK, VOICE, hint="W6の中で、声の出し方という言葉も並んでいます。")]}, entries())
        assert kept[0]["hint"] is None
        assert "記録の番号（W1 など）は、問いにも手がかりにも書かない" in _WEEKLY_ASK_SYSTEM

    def test_かぎ括弧の中の英数字は番号として読まない(self):
        with_code = label([log("w1", "2026-09-09", created="W3Cの仕様を読んだ")], [])
        kept, _ = ground({"candidates": [cand("「W3Cの仕様を読んだ」あと、手元に残ったのは何でしょう。", [("W1", "W3Cの仕様を読んだ")])]}, with_code)
        assert len(kept) == 1

    # 2026-09-15 の試し。引用に、渡した行の項目名ごと写してきた
    def test_引用に写った項目名は外して照らす(self):
        kept, _ = ground({"candidates": [cand(ASK, [("W1", "困ったこと: 声の出し方が決まらない")])]}, entries())
        assert len(kept) == 1

    # 同じ試しで、記録を言い直す文を問いの前に置いた
    def test_問いが2文なら落とす(self):
        q = "声の出し方が決まらないと書いています。決めようとしているのは声のどこでしょう。"
        kept, dropped = ground({"candidates": [cand(q, VOICE)]}, entries())
        assert kept == [] and dropped[0]["reason"] == "問いが1文になっていない"

    def test_禁止ワードの入った問いは落とす(self):
        q = "声の出し方が決まったら、次の一歩はどこになるでしょう。"
        kept, dropped = ground({"candidates": [cand(q, VOICE)]}, entries())
        assert kept == [] and dropped[0]["reason"] == "問いに禁止ワードが入っている"

    # 同じ試しで、手がかりが「〜という角度から見てみてください。」になった
    def test_禁止ワードの入った手がかりは外す(self):
        kept, _ = ground({"candidates": [cand(ASK, VOICE, hint="声のどこで迷うかを見てみてください。")]}, entries())
        assert kept[0]["hint"] is None

    # **本人の言葉は数えない。**記録に「成長」と書く人はいる
    def test_かぎ括弧の中の本人の言葉は禁止ワードとして数えない(self):
        with_word = label([log("w1", "2026-09-09", created="成長を感じた一日だった。")], [])
        q = "「成長を感じた」とき、何と比べていたのでしょう。"
        kept, _ = ground({"candidates": [cand(q, [("W1", "成長を感じた一日だった")])]}, with_word)
        assert len(kept) == 1

    def test_候補は多くてMAX_CANDIDATESまで(self):
        assert len(ground({"candidates": [cand(ASK, VOICE)] * 5}, entries())[0]) == MAX_CANDIDATES

    @pytest.mark.parametrize("raw", [None, "text", {}, {"candidates": "x"}, {"candidates": [1, None, {}]}])
    def test_読めない形は空(self, raw):
        assert ground(raw, entries()) == ([], [])


class TestChoose:
    def test_通った中で考えたくなる度合いがいちばん高いもの(self):
        verdicts = {"verdicts": [{"index": 0, "pass": True, "strength": 2},
                                 {"index": 1, "pass": True, "strength": 3},
                                 {"index": 2, "pass": False, "strength": 3}]}
        assert choose(["a", "b", "c"], verdicts) == "b"

    def test_同じ度合いならモデルが並べた順で先のもの(self):
        verdicts = {"verdicts": [{"index": 1, "pass": True, "strength": 2}, {"index": 0, "pass": True, "strength": 2}]}
        assert choose(["a", "b"], verdicts) == "a"

    def test_度合いが読めなければ1とみなす(self):
        verdicts = {"verdicts": [{"index": 0, "pass": True, "strength": "高い"}, {"index": 1, "pass": True, "strength": 2}]}
        assert choose(["a", "b"], verdicts) == "b"

    def test_どれも通らなければNone(self):
        assert choose(["a"], {"verdicts": [{"index": 0, "pass": False, "strength": 3}]}) is None

    # 「true」という文字や、真偽値の番号は通さない
    @pytest.mark.parametrize("v", [{"index": 0, "pass": "true"}, {"index": True, "pass": True}, {"index": "0", "pass": True}])
    def test_形の崩れた判定は通さない(self, v):
        assert choose(["a", "b"], {"verdicts": [v]}) is None


class TestRetry:
    def test_落ちた問いと理由を渡す(self):
        cands = [{"question": "問い1。"}, {"question": "問い2。"}]
        got = rejections(cands, {"verdicts": [{"index": 0, "pass": False, "reason": "一般的"}]})
        assert got == [{"question": "問い1。", "reason": "一般的"},
                       {"question": "問い2。", "reason": "確かめを通らなかった"}]
        note = retry_note(got)
        assert "【前に作った問いは" in note and "- 問い1。（一般的）" in note

    def test_落ちたものが無ければ何も添えない(self):
        assert retry_note([]) == ""


class TestToPatterns:
    def test_問いを主役にした形にする(self):
        kept, _ = ground({"candidates": [cand(ASK, [("W2", "収録で声の出し方に迷った")] + VOICE, hint="9月11日の記録にも出ています。")]}, entries())
        assert to_patterns(kept[0]) == {"patterns": [{
            "question": ASK,
            "hint": "9月11日の記録にも出ています。",
            "fact": {"kind": "records", "dates": ["2026-09-09", "2026-09-11"], "ids": ["w2", "w1"]},
        }]}

    def test_手がかりが無ければ鍵を置かない(self):
        kept, _ = ground({"candidates": [cand(ASK, VOICE)]}, entries())
        assert "hint" not in to_patterns(kept[0])["patterns"][0]

    def test_黙るときは空(self):
        assert to_patterns(None) == {"patterns": []}


class TestReadWeeklyReview:
    """手順が、この順で呼ばれていること。**モデルは差し替える**"""

    def fake(self, monkeypatch, replies):
        from modules import ai

        seen = []

        def _call(system_prompt, user_message, **kw):
            seen.append((system_prompt, user_message, kw))
            return replies.pop(0)

        monkeypatch.setattr(ai, "call_claude", _call)
        return ai, seen

    @staticmethod
    def asks(*cands):
        return json.dumps({"candidates": list(cands)})

    @staticmethod
    def verdicts(*items):
        return json.dumps({"verdicts": [{"index": i, "pass": p, "strength": s, "reason": "r"} for i, p, s in items]})

    def test_今週の記録が無ければ呼ばずに空(self, monkeypatch):
        ai, seen = self.fake(monkeypatch, [])
        assert json.loads(ai.read_weekly_review([], PREV)) == {"patterns": []}
        assert seen == []

    def test_いちばん考えたくなる問いを出す(self, monkeypatch):
        from modules.ai import _WEEKLY_ASK_CHECK_SYSTEM, _WEEKLY_ASK_SYSTEM

        weak = cand("「声の出し方が決まらない」のは、なぜでしょう。", VOICE)
        ai, seen = self.fake(monkeypatch, [self.asks(weak, cand(ASK, VOICE)),
                                           self.verdicts((0, True, 1), (1, True, 3))])
        got = json.loads(ai.read_weekly_review([WEEK[1]], []))
        assert got["patterns"][0]["question"] == ASK
        assert [s for s, _, _ in seen] == [_WEEKLY_ASK_SYSTEM, _WEEKLY_ASK_CHECK_SYSTEM]
        assert all(kw.get("schema") for _, _, kw in seen)

    # 作者「黙るのもダメ」。**落ちた理由を渡して1回だけ作り直す**
    def test_どれも通らなければ理由を渡して作り直す(self, monkeypatch):
        first = cand("今週はどんな一週間でしたか。", VOICE)
        ai, seen = self.fake(monkeypatch, [self.asks(first), self.verdicts((0, False, 1)),
                                           self.asks(cand(ASK, VOICE)), self.verdicts((0, True, 2))])
        got = json.loads(ai.read_weekly_review(WEEK, PREV))
        assert got["patterns"][0]["question"] == ASK
        assert len(seen) == 4
        assert "今週はどんな一週間でしたか。" in seen[2][1] and "【前に作った問いは" in seen[2][1]

    def test_照らして全部落ちたら確かめずに作り直す(self, monkeypatch):
        ai, seen = self.fake(monkeypatch, [self.asks(cand(ASK, [("W1", "作られた引用")])),
                                           self.asks(cand(ASK, VOICE)), self.verdicts((0, True, 2))])
        assert json.loads(ai.read_weekly_review(WEEK, PREV))["patterns"][0]["question"] == ASK
        assert len(seen) == 3 and "きっかけにした記録の引用が、記録に無い" in seen[1][1]

    def test_作り直しても通らなければ黙る(self, monkeypatch):
        ai, seen = self.fake(monkeypatch, [self.asks(cand(ASK, VOICE)), self.verdicts((0, False, 1)),
                                           self.asks(cand(ASK, VOICE)), self.verdicts((0, False, 1))])
        assert json.loads(ai.read_weekly_review(WEEK, PREV)) == {"patterns": []}
        assert len(seen) == 4

    # 1回目が長くかかったら、作り直さない（待ち時間を延ばさない）
    def test_時間がかかったら作り直さない(self, monkeypatch):
        ai, seen = self.fake(monkeypatch, [self.asks(cand(ASK, VOICE)), self.verdicts((0, False, 1))])
        monkeypatch.setattr(ai, "_RETRY_BEFORE_SECONDS", -1)
        assert json.loads(ai.read_weekly_review(WEEK, PREV)) == {"patterns": []}
        assert len(seen) == 2

    # **読めなかったことと、黙ったことを分ける**
    @pytest.mark.parametrize("replies", [[None], ["{壊れた"], [json.dumps({"candidates": [cand(ASK, VOICE)]}), None]])
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
    # 作者「知ってることの言い直し」
    def test_書いてあることを訊かせない(self):
        from modules.ai import _WEEKLY_ASK_SYSTEM

        assert "記録にもう書いてあることを訊かない" in _WEEKLY_ASK_SYSTEM
        assert "記録を言い直さない" in _WEEKLY_ASK_SYSTEM

    def test_どの週にも言える問いにさせない(self):
        from modules.ai import _WEEKLY_ASK_CHECK_SYSTEM, _WEEKLY_ASK_SYSTEM

        assert "どの週の誰にでも言える問い" in _WEEKLY_ASK_SYSTEM
        assert "どの週の誰にでも言える" in _WEEKLY_ASK_CHECK_SYSTEM

    def test_確かめは迷ったら落とし_度合いを付ける(self):
        from modules.ai import _WEEKLY_ASK_CHECK_SYSTEM

        assert "迷ったら false" in _WEEKLY_ASK_CHECK_SYSTEM
        assert "strength" in _WEEKLY_ASK_CHECK_SYSTEM

    def test_言い換えをかぎ括弧に入れさせない(self):
        from modules.ai import _WEEKLY_ASK_SYSTEM

        assert "言い換えたものを「」に入れない" in _WEEKLY_ASK_SYSTEM
