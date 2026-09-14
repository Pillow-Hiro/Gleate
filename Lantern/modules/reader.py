# -*- coding: utf-8 -*-
"""今週の振り返りを、**決まった手順で読む**（2026-09-14・作者との壁打ち）。

    番号を振る → つなぐ（モデル）→ 記録に照らす → 確かめる（別の呼び出し）→ 選ぶか、黙る

モデルが受け持つのは「つなぐ」と「確かめる」だけ。**それ以外はここ**——
番号、引用が本当に記録にあるか、日付が合っているか、どれを出すか、黙るか。

## なぜ手順にしたか

作者から「今週の振り返りの見立てが間違っている状態で深堀をしても的外れな回答をする」
「やっぱりGleate専用のAIエージェントを作成した方がいい」。

それまでは1回で「観察を1つ返せ」と頼んでいた。**読み違えても、確かめる手段が無かった。**
作者の記録で数えると（2026-09-14）、30件・883文字、1件あたり20文字ほど。
7日ごとに区切った44通りのうち14通りは、テスト以外の記録が1件以下。
**1件から観察を1つ作らせていた。**数えた事実（`facts.py`）が出たのは44通りのうち2回。

## 道具で記録を探すエージェントにしなかった

記録が全部1回に収まる量なので、探すものが無い（作者の判断）。
往復と費用が増えるだけ。1回に収まらなくなったら考え直す。

## 見る範囲は今週と、その前の週だけ

作者の判断。「今日と今週のことは無料。積み重ねを掘るのは有料」
（`modules/plan.py`）の線と、無料と有料で同じことを言わない、を守る。

## 黙る

並べて言えることが無い週は、何も出さない。**無理に作った観察より、黙るほうがいい**
（AI憲法「必要以上に話さない」）。
"""
import re
import unicodedata

from modules.markdown import strip_markdown

# 確かめに回す候補の数。多いほど確かめの呼び出しが重くなる
MAX_CANDIDATES = 3

_FIELDS = (
    ("created", None),
    ("enjoyable", "よかったこと"),
    ("struggled", "困ったこと"),
    ("next", "次にやること"),
)


def _values(log):
    out = []
    for key, label_ in _FIELDS:
        value = (strip_markdown(log.get(key) or "") or "").strip()
        if value:
            out.append((label_, value))
    return out


def _line(log):
    """モデルに見せる1行。`ai._fmt_logs` と同じ書き方"""
    return "".join(
        value if label_ is None else f"（{label_}: {value}）"
        for label_, value in _values(log)
    ).replace("\n", " ")


def _md(date):
    """`2026-09-04` → `9月4日`"""
    _, m, d = date.split("-")
    return f"{int(m)}月{int(d)}日"


def label(period_logs, previous_logs):
    """記録に番号を振る。**W は今週、P はその前の週。**どちらも日付の古い順。

    中身の無い記録（写真だけなど）には振らない。
    """
    entries = []
    for prefix, logs in (("W", period_logs), ("P", previous_logs)):
        usable = sorted(
            [l for l in (logs or []) if l.get("date") and _values(l)],
            key=lambda l: (l["date"], str(l.get("id"))),
        )
        for n, log in enumerate(usable, 1):
            entries.append({
                "ref": f"{prefix}{n}",
                "id": log.get("id"),
                "date": log["date"],
                "this_week": prefix == "W",
                "line": _line(log),
                "body": "\n".join(value for _, value in _values(log)),
            })
    return entries


def can_speak(entries):
    """**並べられるものがあるか。**無ければモデルを呼ばずに黙る。

    今週の記録が1つも無い、または全部で1件しか無いときは、並べようがない。
    """
    return any(e["this_week"] for e in entries) and len(entries) >= 2


def as_text(entries):
    week = [e for e in entries if e["this_week"]]
    prev = [e for e in entries if not e["this_week"]]
    lines = ["【今週の記録】"]
    lines += [f"{e['ref']}（{_md(e['date'])}）: {e['line']}" for e in week]
    if prev:
        lines += ["", "【その前の週の記録】"]
        lines += [f"{e['ref']}（{_md(e['date'])}）: {e['line']}" for e in prev]
    return "\n".join(lines)


def _squash(text):
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", text or ""))


def _quoted(quote, body):
    """引用が**その記録の中に本当にあるか。**空白と全角半角の違いだけは許す"""
    q = _squash(quote).strip("「」『』\"'")
    return len(q) >= 2 and q in _squash(body)


_IN_QUOTES = re.compile(r"「[^」]*」")
_MONTH_DAY = re.compile(r"(\d{1,2})月(\d{1,2})日")
# 「9日の記録」「4日と」のような日だけの書き方。「1日中」「7日間」は日付ではない
_DAY_ONLY = re.compile(r"(?<![月\d])(\d{1,2})日(?=[のとにはも、])")


def _dates_match(observation, used):
    """観察の文に書かれた日付が、**使った記録の日付だけか。**

    文の中の日付は信用しない（`ai._attach_fact`）。月次が
    「その間の9月11日」と、期間の最後の日を途中のように書いたことがある。
    「」の中は本人の言葉なので見ない。
    """
    text = _IN_QUOTES.sub("", unicodedata.normalize("NFKC", observation))
    cited = {(int(u["date"][5:7]), int(u["date"][8:10])) for u in used}
    for m, d in _MONTH_DAY.findall(text):
        if (int(m), int(d)) not in cited:
            return False
    days = {d for _, d in cited}
    for d in _DAY_ONLY.findall(_MONTH_DAY.sub("", text)):
        if int(d) not in days:
            return False
    return True


def ground(raw, entries):
    """モデルの候補を、**記録に照らして通す。**1つでも合わなければ、その候補ごと捨てる。

    - 番号が実在する
    - 引用がその記録の中に本当にある
    - 2つ以上の記録を使っている（1つの記録の言い換えにしない）
    - 今週の記録を使っている
    - 文の中の日付が、使った記録の日付と合っている

    **一部だけ合わない候補も捨てる。**合わない記録を外すと、
    観察の文が立っていた足場が消えたまま残る。
    """
    by_ref = {e["ref"]: e for e in entries}
    out = []
    candidates = raw.get("candidates") if isinstance(raw, dict) else None
    for cand in candidates or []:
        if not isinstance(cand, dict):
            continue
        observation = str(cand.get("observation") or "").strip()
        records = cand.get("records") if isinstance(cand.get("records"), list) else []
        if not observation or not records:
            continue
        used, refs, broken = [], set(), False
        for r in records:
            entry = by_ref.get(str((r or {}).get("ref") or "").strip()) if isinstance(r, dict) else None
            if not entry or not _quoted(str(r.get("quote") or ""), entry["body"]):
                broken = True
                break
            if entry["ref"] not in refs:
                refs.add(entry["ref"])
                used.append(entry)
        if broken or len(used) < 2 or not any(u["this_week"] for u in used):
            continue
        if not _dates_match(observation, used):
            continue
        # 問いは「。」で終える。**「？」の問いは答えを迫る形なので落とす**（観察は残す）
        question = str(cand.get("question") or "").strip()
        if "？" in question or "?" in question:
            question = ""
        out.append({"observation": observation, "question": question or None, "records": used})
        if len(out) == MAX_CANDIDATES:
            break
    return out


def check_text(candidates):
    """確かめる側に渡す形。**使った記録は全文で渡す**——引用だけだと前後が読めない"""
    blocks = []
    for i, c in enumerate(candidates):
        lines = [f"【候補{i}】", f"観察: {c['observation']}", f"問い: {c['question'] or 'なし'}", "使った記録:"]
        lines += [f"{_md(r['date'])}: {r['line']}" for r in c["records"]]
        blocks.append("\n".join(lines))
    return "\n\n".join(blocks)


def choose(candidates, verdicts):
    """確かめを通った候補のうち、**モデルが確かだと並べた順で最初のもの。**無ければ None"""
    passed = set()
    items = verdicts.get("verdicts") if isinstance(verdicts, dict) else None
    for v in items or []:
        if not isinstance(v, dict):
            continue
        index = v.get("index")
        if isinstance(index, int) and not isinstance(index, bool) and v.get("pass") is True:
            passed.add(index)
    for i, cand in enumerate(candidates):
        if i in passed:
            return cand
    return None


def to_patterns(chosen):
    """画面が読む形（`ReviewSection.jsx`）。**黙るときは空。**

    根拠の日付は `fact.dates` に置く——画面はここから日付の丸を出す。
    日付も記録の番号も、モデルの文からではなく照らした記録から付ける。
    """
    if not chosen:
        return {"patterns": []}
    pattern = {
        "observation": chosen["observation"],
        "fact": {
            "kind": "records",
            "dates": sorted({r["date"] for r in chosen["records"]}),
            "ids": [r["id"] for r in chosen["records"]],
        },
    }
    if chosen.get("question"):
        pattern["question"] = chosen["question"]
    return {"patterns": [pattern]}
