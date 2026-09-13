# -*- coding: utf-8 -*-
"""深掘り——ひとつの観察を、この3か月の記録に戻して深める（2026-09-13）。

## 語ではなく、記録で読む

はじめは観察が指す**語**（「音響」）を足場にして、同じ語の出る記録を
数え、そこから見立てを作るつもりだった。作者から
「**単語だけで推測するの？全くの見当外れになって、危険じゃない？
記録単位で推測した方がいいと思うよ**」。

危なかった理由は2つ。

- 語の切り出しは粗い。「音が合わない」は1文字ずつに分かれて拾えず、
  「調整」は音の調整も日程の調整も同じ語として並ぶ。
  **同じ話の記録が落ち、違う話の記録が混ざる。**
- 語から意味を組み立てると、本人が書いていない話ができる。
  憲法の「経験を勝手に物語化しない」に正面から触れる。

だから深掘りでは**3か月分の記録の本文をそのまま読ませる。**
語で絞らない。どの記録が同じ話かは、書かれた文でモデルに判断させる。

## 読むのはモデル、確かめるのはここ

モデルが返した日付と抜き出しを、**実在する記録に照らして通す。**

- 期間の中に無い日付の記録は捨てる
- 抜き出した文がその日の記録に本当に含まれていれば、そのまま出す。
  含まれていなければ、その記録の書き出しに差し替える（作られた引用を出さない）
- 見立ては、**出した記録のどれかに立っていなければ捨てる**
- 見立ては多くて2つ。1つに決めない（`CLAUDE.md`「深掘りでは Gleate の見立てを置いてよい」）
- 同じ話の記録が1つも残らなければ、**何も作らない**

## 数える／読むの線

語を数えるだけのために3か月分を送るのはやめた（`client/lib/wordDrift.js`）。
ここで送るのは、**読むことはコードにできない**から。押したときだけ、有料で。
"""
from modules.markdown import strip_markdown

# さかのぼる日数（作者の判断「3か月でいい」）
DEEPEN_DAYS = 90

# 画面に並べる記録の上限
MAX_RECORDS = 8

# 見立ての候補の上限。**1つに決めない。でも並べすぎない**
MAX_READINGS = 2

# 抜き出しの長さ。長い文は、記録を開けば全部読める
EXCERPT_CHARS = 60

_FIELDS = ("created", "enjoyable", "struggled", "next")


def empty():
    """見つからなかったときの形。**呼ぶたびに新しく作る**（共有して書き換えない）"""
    return {"found": False, "records": [], "readings": [], "question": None}


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


def ground(data, logs):
    """モデルの返事を、実在する記録に照らして通す。

    `data` はモデルが返した JSON（辞書）。`logs` は期間の中の記録。
    返すのは画面にそのまま出せる形。**ここを通ったものだけが画面に出る。**
    """
    if not isinstance(data, dict) or data.get("found") is False:
        return empty()

    by_date = {}
    for log in logs or []:
        if log.get("date"):
            by_date.setdefault(log["date"], []).append(log)

    records = []
    seen = set()
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
        records.append({"id": chosen.get("id"), "date": date, "excerpt": excerpt})
        if len(records) >= MAX_RECORDS:
            break

    shown = {r["date"] for r in records}
    readings = []
    for reading in data.get("readings") or []:
        if not isinstance(reading, dict):
            continue
        text = str(reading.get("text") or "").strip()
        dates = [d for d in (reading.get("dates") or []) if isinstance(d, str) and d in shown]
        if not text or not dates:
            continue
        readings.append({"text": text, "dates": sorted(set(dates))})
        if len(readings) >= MAX_READINGS:
            break

    if not records or not readings:
        return empty()

    question = str(data.get("question") or "").strip() or None
    records.sort(key=lambda r: r["date"])
    return {"found": True, "records": records, "readings": readings, "question": question}
