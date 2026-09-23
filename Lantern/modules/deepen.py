# -*- coding: utf-8 -*-
"""深掘り——ひとつの記録を、これまでの記録に戻して**見立てを1つ立てる**（2026-09-13 / 2026-09-24）。

## 主役は見立て。記録はその根拠（2026-09-24・作者の判断）

作者から「**記録を並べるのがメインになっている。記録を並べるのはサブで、
本質はその記録を読んで、深い見立てを建てることだ**」。

それまでは、同じ話の記録を最大8件並べ、見立ての候補を2つ置いて選ばせていた。
選んでも**選んだ事実が残るだけ**で何も起きず、作者から「見立てを最大2つ出している
意味がよくわからない」。**見立ては1つ。**記録は、その見立てが立っている所を示すために、
多くて3件だけ小さく添える。

## 語ではなく、記録で読む（2026-09-13 から変わらない）

はじめは観察が指す**語**（「音響」）を足場にして、同じ語の出る記録を数えるつもりだった。
作者から「**単語だけで推測するの？全くの見当外れになって、危険じゃない？
記録単位で推測した方がいいと思うよ**」。

危なかった理由は2つ。

- 語の切り出しは粗い。「音が合わない」は1文字ずつに分かれて拾えず、
  「調整」は音の調整も日程の調整も同じ語として並ぶ。
  **同じ話の記録が落ち、違う話の記録が混ざる。**
- 語から意味を組み立てると、本人が書いていない話ができる。
  憲法の「経験を勝手に物語化しない」に正面から触れる。

だから深掘りでは**記録の本文をそのまま読ませる。**語で絞らない。

## 90日で切るのをやめた（2026-09-24）

それまでは直近90日だけを読んでいた。作者から「**90日前以前の記録もスルーしている**」。
積み重ねを掘るための機能なのに、古いものから捨てていた。

**新しい順に `MAX_CHARS` 文字まで、全期間から読む。**切るのは日付ではなく量で、
理由は費用（2026-09-24 に実測: 記録2万文字で1回 約21円、4万文字で約40円）。
待ち時間は記録の量ではほとんど変わらない（どの量でも6〜8秒）。

## 読むのはモデル、確かめるのはここ

モデルが返した日付と抜き出しを、**実在する記録に照らして通す。**

- 期間の中に無い日付の記録は捨てる
- 抜き出した文がその日の記録に本当に含まれていれば、そのまま出す。
  含まれていなければ、その記録の書き出しに差し替える（作られた引用を出さない）
- 見立ての中の「」は、**本人の言葉そのままでなければ捨てる**（`modules/reader.py`）
- 見立ては、**2件以上の記録に立っていなければ捨てる。**1件を言い直すだけなら見立てではない
- 決めつけ（「〜な人です」）と禁止ワードは捨てる
- 同じ話の記録が1つも残らなければ、**何も作らない**
"""
from modules import reader
from modules.markdown import strip_markdown

# 読む記録の上限（新しい順・空白込みの文字数）。**日付ではなく量で切る**
MAX_CHARS = 20000

# 画面に添える記録の上限。**主役は見立て**なので、根拠を示すぶんだけ
MAX_RECORDS = 3

# 見立てが立っていなければならない記録の数。
# **1件しか無いものは、その記録の言い直しにしかならない**
MIN_RECORDS = 2

# 抜き出しの長さ。長い文は、記録を開けば全部読める
EXCERPT_CHARS = 40

# 決めつけ。問いの形でも、人を断じる文は出さない（`CLAUDE.md`）
ASSERTIONS = ("な人です", "な人でしょう", "タイプです", "性格です", "傾向があります",
              "に違いありません", "なのは明らか")

_FIELDS = ("created", "enjoyable", "struggled", "next")


def empty():
    """見つからなかったときの形。**呼ぶたびに新しく作る**（共有して書き換えない）"""
    return {"found": False, "reading": None, "records": [], "question": None}


def _squash(text):
    return " ".join(str(text or "").split())


def _text_of(log):
    return _squash(" ".join(strip_markdown(log.get(k) or "") or "" for k in _FIELDS))


def _clip(text):
    text = _squash(text)
    return text if len(text) <= EXCERPT_CHARS else text[:EXCERPT_CHARS] + "…"


def _head(log):
    for k in _FIELDS:
        t = strip_markdown(log.get(k) or "") or ""
        if t.strip():
            return _clip(t)
    return ""


def recent(logs, max_chars=MAX_CHARS):
    """**新しい順に `max_chars` 文字まで。**返すのは古い順（読ませる順）。

    全部を読ませると、書く量の多い人で1回40円を超える（2026-09-24 の実測）。
    日付で切ると「90日前は無かったこと」になるので、切るのは量にする。
    """
    picked, size = [], 0
    for log in sorted(logs or [], key=lambda l: l.get("date", ""), reverse=True):
        body = _text_of(log)
        if not body:
            continue
        picked.append(log)
        size += len(body)
        if size >= max_chars:
            break
    return sorted(picked, key=lambda l: l.get("date", ""))


def _reading_ok(text, records):
    """見立てを出してよいか。**本人の言葉と、根拠の数で決める**"""
    if not text or len(records) < MIN_RECORDS:
        return False
    if reader.banned(text) or any(word in text for word in ASSERTIONS):
        return False
    return reader.quotes_real(text, [r["body"] for r in records])


def ground(data, logs):
    """モデルの返事を、実在する記録に照らして通す。

    `data` はモデルが返した JSON（辞書）。`logs` は読ませた記録。
    返すのは画面にそのまま出せる形。**ここを通ったものだけが画面に出る。**
    """
    if not isinstance(data, dict) or data.get("found") is False:
        return empty()

    by_date = {}
    for log in logs or []:
        if log.get("date"):
            by_date.setdefault(log["date"], []).append(log)

    records, seen = [], set()
    for r in data.get("records") or []:
        if not isinstance(r, dict):
            continue
        date = r.get("date")
        candidates = by_date.get(date) if isinstance(date, str) else None
        if not candidates:
            continue

        # **1日に何件でも書ける。**同じ日のどの記録かは、引用で決める
        quote = _squash(r.get("quote"))
        chosen, excerpt = None, None
        if len(quote) >= 2:
            for log in candidates:
                if quote in _text_of(log):
                    chosen, excerpt = log, _clip(quote)
                    break
        if chosen is None:
            chosen, excerpt = candidates[0], _head(candidates[0])

        key = chosen.get("id") or (date, excerpt)
        if key in seen:
            continue
        seen.add(key)
        records.append({"id": chosen.get("id"), "date": date, "excerpt": excerpt,
                        "body": _text_of(chosen)})
        if len(records) >= MAX_RECORDS:
            break

    reading = str(data.get("reading") or "").strip()
    if not _reading_ok(reading, records):
        return empty()

    question = str(data.get("question") or "").strip()
    if question and not reader.is_question(question):
        question = ""
    records.sort(key=lambda r: r["date"])
    return {
        "found": True,
        "reading": reading,
        # `body` は照らすためだけに持っていた。**画面には出さない**
        "records": [{k: r[k] for k in ("id", "date", "excerpt")} for r in records],
        "question": question or None,
    }
