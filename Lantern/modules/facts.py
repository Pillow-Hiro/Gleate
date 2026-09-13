# -*- coding: utf-8 -*-
"""記録から**数えた事実**だけを取り出す。ここに嘘は入らない。

## なぜ要るか（2026-09-13）

有料の振り返りは、記録の生テキストをモデルに渡して
「パターンを3つ」と頼んでいた。**数えるのも、選ぶのも、書くのも
モデルにやらせていた。**

言語モデルは数を数えられない。実際、抽出観点の筆頭は
「記録した時間帯の傾向」で、例は「今週、夜に書いた記録が3日ありました」
——**そもそも時刻を渡していなかった。**知りようのないことを頼み、
断定した言い方の見本まで見せていた。

同じ形の失敗を、頻出キーワードでもやっていた（`lib/wordDrift.js`）。

    数えるのはコード。言葉にするのはモデル。

ここが数えた事実を渡し、モデルは**どれを言うかと、どう問うか**だけを
受け持つ。数が合わなくなる道が無くなる。

## 語の出入りはここで数えない

「今月から出てきた語／先月まで出ていた語」は**端末の中で数えて
無料で出している**（`client/lib/wordDrift.js`）。同じものを2言語で持つと、
片方だけ直る。

ここが数えるのは**有料側にしか出せないもの**だけ——記録をまたいで
初めて見えることに絞る。持ち場を分ける（`modules/plan.py`）。

## 語の切り出しについて

`client/lib/wordDrift.js` と同じ考え方（漢字2字以上・カタカナ2字以上・
英数字）。**同じ規則を2つ持っているので、片方を変えたら両方を変えること。**
分けているのは用途が違うからで、揃えたいからではない——
あちらは画面に並べる語、こちらは記録をまたぐ一致の判定。
"""
import re
from collections import Counter

from modules.markdown import strip_markdown

# 拾う形。**2文字以上**（1文字は「日」「人」など、どの記録にも出る）
_KANJI = re.compile(r"[一-鿿々]{2,}")
_KATAKANA = re.compile(r"[ァ-ヶー]{2,}")
_LATIN = re.compile(r"[A-Za-z][A-Za-z0-9]{1,}")

# どの記録にも出るので、一致しても何も言えない語
_COMMON = {
    "今日", "昨日", "明日", "今回", "今週", "今月", "来週", "来月",
    "自分", "時間", "場合", "感じ", "状態", "部分", "内容", "必要",
    "結果", "以上", "以下", "最近", "午前", "午後", "本日",
}


def words(text):
    """文章から語を拾う。**同じ語が何度出ても、そのまま並べて返す**"""
    src = strip_markdown(text or "") or ""
    out = []
    for pattern in (_KANJI, _KATAKANA, _LATIN):
        for word in pattern.findall(src):
            if word not in _COMMON:
                out.append(word)
    return out


def _field(log, key):
    return strip_markdown(log.get(key) or "") or ""


def repeated_struggles(logs, min_count=2):
    """**困ったことに、複数の記録で出てきた語。**

    同じところで二度つまずいている、という事実。1件ごとの記録を
    読んでいても見えず、**まとめて見たときにだけ現れる。**

    数えるのは記録の数（`lib/wordDrift.js` と同じ考え方）。
    1件の中で何度書いても1つ。
    """
    counts = Counter()
    where = {}
    for log in logs or []:
        for word in set(words(_field(log, "struggled"))):
            counts[word] += 1
            where.setdefault(word, []).append(log.get("date"))
    return [
        {"word": word, "count": n, "dates": where[word]}
        for word, n in counts.most_common()
        if n >= min_count
    ]


def next_then_done(logs):
    """**「次にやること」に書いた語が、あとの「やったこと」に出たもの。**

    日付の順に見て、**先に書かれ、あとで現れた**ものだけを拾う。

    これは有料側にしか出せない。1件の記録の中では完結せず、
    日をまたいで並べたときにだけ見える。

    **できた／できなかったとは言わない。**出てきたという事実だけを返す。
    評価は書いた人がする（`CLAUDE.md`）。
    """
    ordered = sorted(
        [l for l in (logs or []) if l.get("date")], key=lambda l: l["date"]
    )
    promised = {}
    out = []
    for log in ordered:
        date = log["date"]
        for word in set(words(_field(log, "created"))):
            if word in promised and promised[word] < date:
                out.append({"word": word, "written": promised[word], "appeared": date})
                del promised[word]
        for word in set(words(_field(log, "next"))):
            promised.setdefault(word, date)
    return out


def _items(repeated, done):
    """**指せる事実**に番号を振る（2026-09-13）。

    観察が「どの事実に立っているか」を番号で返させるため。
    深掘りは、その番号の事実を広げる。

    日数や件数には番号を振らない——期間の説明であって、
    観察が立つ足場ではない。
    """
    items = []
    for r in repeated:
        items.append({"kind": "repeated_struggle", "word": r["word"],
                      "count": r["count"], "dates": list(r["dates"])})
    for d in done:
        items.append({"kind": "next_then_done", "word": d["word"],
                      "written": d["written"], "appeared": d["appeared"],
                      "dates": [d["written"], d["appeared"]]})
    for n, item in enumerate(items, 1):
        item["id"] = f"F{n}"
    return items


def find_item(facts, fid):
    """番号から事実を引く。**知らない番号なら None**——作られた番号を通さない"""
    if not isinstance(fid, str):
        return None
    for item in (facts or {}).get("items", []):
        if item.get("id") == fid:
            return item
    return None


def period_facts(logs, span_days=None):
    """その期間について、**数えて分かることだけ**を返す。

    `span_days` は期間の長さ。渡さなければ記録の幅から出す。
    """
    entries = [l for l in (logs or []) if l.get("date")]
    days = sorted({l["date"] for l in entries})
    repeated = repeated_struggles(entries)
    done = next_then_done(entries)
    return {
        "entries": len(entries),
        "days": len(days),
        "span_days": span_days,
        "first": days[0] if days else None,
        "last": days[-1] if days else None,
        "repeated_struggles": repeated,
        "next_then_done": done,
        "items": _items(repeated, done),
    }


def as_text(facts):
    """モデルに渡す形。**数字はここにしか無い、と分かる置き方にする。**

    箇条書きにしない——`tests/test_prompts.py` が列挙の指示を止める。
    事実は事実として並べ、選ぶのはモデルに任せる。
    """
    lines = []
    if facts.get("span_days"):
        lines.append(
            f"記録した日: {facts['days']}日 / {facts['span_days']}日"
        )
    else:
        lines.append(f"記録した日: {facts['days']}日")
    lines.append(f"記録の件数: {facts['entries']}件")

    # **番号を付けて並べる。**観察がどれに立っているかを、番号で返させる
    for item in facts.get("items", []):
        if item["kind"] == "repeated_struggle":
            body = (f"「{item['word']}」が困ったことに{item['count']}件の記録で出ています"
                    f"（{'、'.join(item['dates'])}）")
        else:
            body = (f"「{item['word']}」は{item['written']}の次にやることに書かれ、"
                    f"{item['appeared']}のやったことに出ています")
        lines.append(f"{item['id']}: {body}")
    return "\n".join(lines)
