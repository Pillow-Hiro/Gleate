# -*- coding: utf-8 -*-
"""今週の振り返りを、**決まった手順で読み、問いを1つ置く**（2026-09-15・作者との壁打ち）。

    番号を振る → 問いの候補を作る（モデル）→ 記録に照らす → 確かめる（別の呼び出し）
    → いちばん考えたくなるものを選ぶ → どれも通らなければ、落ちた理由を渡して1回だけ作り直す

モデルが受け持つのは「作る」と「確かめる」だけ。**それ以外はここ**——
番号、引用が本当に記録にあるか、日付が合っているか、どれを出すか。

## 観察を並べる版は、作者が20週すべて「ダメ」とした

2026-09-14 に、観察を1つ返すいまの作りと、記録どうしを並べて確かめてから出す作り（v1）を、
作者の記録20週で伏せて比べた。**作者の答えは「全部だめ」。**

ダメな点は「知ってることの言い直し」「問いが無い・弱い」「黙るのもダメ」。
v1 は「9月4日の記録では『…』、9月9日の記録では『…』と書かれています」ばかりになり、
20週のうち10週で黙っていた。**書いた本人に、本人の文を返していた。**

作者の判断で、**問いを主役にする。**記録を並べ直すのをやめ、今週の記録から
考えたくなる問いを1つ置く。手がかりを1文添えてよい。

## なぜ手順にしたか（2026-09-14 から変わらない）

作者から「今週の振り返りの見立てが間違っている状態で深堀をしても的外れな回答をする」。
1回で頼むと、読み違えても確かめる手段が無い。作者の記録は3か月で30件・883文字、
1件あたり20文字ほどなので、記録を探す道具は要らない（作者の判断）。

## 見る範囲は今週と、その前の週だけ

作者の判断。「今日と今週のことは無料。積み重ねを掘るのは有料」（`modules/plan.py`）。

## 黙らない

今週の記録が1件でもあれば、問いを作る（作者「黙るのもダメ」）。
どの候補も確かめを通らなければ、落ちた理由を渡して1回だけ作り直す。
それでも通らなければ、そのときだけ黙る。
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


def can_ask(entries):
    """**今週の記録が1件でもあれば、問いを作る。**全部で1件でもよい（作者「黙るのもダメ」）"""
    return any(e["this_week"] for e in entries)


def find_ref(entries, log_id):
    """本人が選んだ記録の番号。**今週の記録からだけ探す。**無ければ None"""
    if not log_id:
        return None
    for e in entries:
        if e["this_week"] and str(e["id"]) == str(log_id):
            return e["ref"]
    return None


def entry_for(entries, ref):
    return next((e for e in entries if e["ref"] == ref), None)


def as_text(entries, target_ref=None):
    """モデルに渡す形。**選んだ記録があれば、いちばん上に別に置く**（2026-09-22）"""
    week = [e for e in entries if e["this_week"]]
    prev = [e for e in entries if not e["this_week"]]
    lines = []
    target = entry_for(entries, target_ref)
    if target:
        lines += ["【訊いてほしい記録】", f"{target['ref']}（{_md(target['date'])}）: {target['line']}", ""]
    lines += ["【今週の記録】"]
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


def _dates_match(text, used):
    """文に書かれた日付が、**きっかけにした記録の日付だけか。**

    文の中の日付は信用しない（`ai._attach_fact`）。月次が
    「その間の9月11日」と、期間の最後の日を途中のように書いたことがある。
    「」の中は本人の言葉なので見ない。
    """
    plain = _IN_QUOTES.sub("", unicodedata.normalize("NFKC", text))
    cited = {(int(u["date"][5:7]), int(u["date"][8:10])) for u in used}
    for m, d in _MONTH_DAY.findall(plain):
        if (int(m), int(d)) not in cited:
            return False
    days = {d for _, d in cited}
    for d in _DAY_ONLY.findall(_MONTH_DAY.sub("", plain)):
        if int(d) not in days:
            return False
    return True


def _quotes_real(text, used):
    """文の中の「」が、**きっかけにした記録の文をそのまま写したものか。**

    2026-09-14 の試し。記録に書かれた一文を、観察の文では言い換えたまま
    かぎ括弧に入れていた。
    **かぎ括弧は本人の言葉の印なので、言い換えを入れると作られた引用になる。**
    """
    bodies = [_squash(u["body"]) for u in used]
    for inner in re.findall(r"「([^」]*)」", unicodedata.normalize("NFKC", text)):
        q = _squash(inner)
        if q and not any(q in body for body in bodies):
            return False
    return True


def _is_question(text):
    """問いは「。」で終える。**「？」は答えを迫る形なので使わない**（`LANTERN_IDENTITY`）"""
    return text.endswith("。") and "？" not in text and "?" not in text


def _outside_quotes(text):
    """「」の外だけ。**「」の中は本人の言葉なので、こちらの決まりで数えない**"""
    return _IN_QUOTES.sub("", unicodedata.normalize("NFKC", text))


# モデルに渡すための記録の番号（W1・P3）。**画面に出す文に入れない。**
# 2026-09-15 の試しで、手がかりに「W6の中で…」と、番号をそのまま書いた
_REF = re.compile(r"(?<![A-Za-z0-9])[WP]\d+(?![0-9])")


def _has_ref(text):
    return bool(_REF.search(_outside_quotes(text)))


# CLAUDE.md の禁止ワード。**画面に出す文に入れない。**プロンプトで頼んでも混ざる
# （2026-09-15 の試しで、手がかりが「〜という角度から見てみてください。」になった）。
# 本人の言葉（「」の中）は数えない——記録に「充実」と書く人はいる
BANNED = (
    "頑張", "素晴らし", "必ず", "きっと", "しましょう", "てみてください",
    "継続すること自体が力", "一歩", "前進", "成長", "充実",
    "記録が途切れ", "ぶりですね", "お久しぶり",
)


def _banned(text):
    plain = _outside_quotes(text)
    return any(word in plain for word in BANNED)


# 問いの中の「」の長さの上限（空白を除いた文字数）。**引くのは短い言葉だけ。**
# 2026-09-22 の試しで、記録の一文をまるごと写し、問いが記録の言い直しになった。
# 今週の振り返りの試し（27件）で引いた言葉は、いちばん長くても14文字
MAX_QUOTE_CHARS = 20


def _long_quote(text):
    return any(len(_squash(q)) > MAX_QUOTE_CHARS
               for q in re.findall(r"「([^」]*)」", unicodedata.normalize("NFKC", text)))


def _sentences(text):
    """「」の外の「。」の数。問いも手がかりも1文（2026-09-15 の試しで、記録を言い直す文を問いの前に置いた）"""
    return _outside_quotes(text).count("。")


# 渡す記録の行には項目名を添えている（「（次にやること: …）」）。
# **引用に項目名ごと写してくることがある**ので、照らす前に外す（2026-09-15 の試し）
_LABEL = re.compile(r"^[（(]?\s*(よかったこと|困ったこと|次にやること)\s*[:：]\s*")


def _strip_label(quote):
    return _LABEL.sub("", str(quote or "").strip())


def ground(raw, entries, target_ref=None):
    """問いの候補を、**記録に照らして通す。**`(通ったもの, 落ちたもの)` を返す。

    - 問いが1文で「。」で終わり、「？」を使っていない
    - きっかけの記録が実在し、引用がその記録の中に本当にある
    - 今週の記録をきっかけにしている
    - 本人が記録を選んだときは、その記録をきっかけにしている
    - 問いの中の「」と日付が、きっかけの記録と合っている
    - 問いに記録の番号（W1 など）も、禁止ワードも入っていない
    - 問いの中の「」が短い（`MAX_QUOTE_CHARS` 文字まで）

    落ちたものには理由を付ける——作り直すときに渡す。
    **手がかりだけが合わないときは、手がかりを外して問いは残す。**
    """
    by_ref = {e["ref"]: e for e in entries}
    kept, dropped = [], []
    candidates = raw.get("candidates") if isinstance(raw, dict) else None
    for cand in candidates or []:
        if not isinstance(cand, dict):
            continue
        question = str(cand.get("question") or "").strip()
        if not question:
            continue
        records = cand.get("records") if isinstance(cand.get("records"), list) else []
        used, reason = [], None
        for r in records:
            entry = by_ref.get(str(r.get("ref") or "").strip()) if isinstance(r, dict) else None
            if not entry or not _quoted(_strip_label(r.get("quote")), entry["body"]):
                reason = "きっかけにした記録の引用が、記録に無い"
                break
            if entry not in used:
                used.append(entry)
        if reason is None and not used:
            reason = "きっかけにした記録が無い"
        if reason is None and target_ref and target_ref not in {u["ref"] for u in used}:
            reason = "選んだ記録から起こしていない"
        if reason is None and not any(u["this_week"] for u in used):
            reason = "今週の記録から起こしていない"
        if reason is None and not _is_question(question):
            reason = "問いが「。」で終わっていないか、「？」を使っている"
        if reason is None and _sentences(question) != 1:
            reason = "問いが1文になっていない"
        if reason is None and not (_dates_match(question, used) and _quotes_real(question, used)):
            reason = "問いの中の「」か日付が、記録と合わない"
        if reason is None and _has_ref(question):
            reason = "問いに記録の番号（W1 など）が入っている"
        if reason is None and _banned(question):
            reason = "問いに禁止ワードが入っている"
        if reason is None and _long_quote(question):
            reason = f"問いの中の「」が長い。引くのは{MAX_QUOTE_CHARS}文字までの短い言葉だけ"
        if reason:
            dropped.append({"question": question, "reason": reason})
            continue
        hint = str(cand.get("hint") or "").strip()
        if hint and ("？" in hint or "?" in hint or _has_ref(hint) or _banned(hint)
                     or _sentences(hint) > 1
                     or not (_dates_match(hint, used) and _quotes_real(hint, used))):
            hint = ""
        kept.append({"question": question, "hint": hint or None, "records": used})
        if len(kept) == MAX_CANDIDATES:
            break
    return kept, dropped


def check_text(candidates, target=None):
    """確かめる側に渡す形。**きっかけの記録は全文で渡す**——引用だけだと、答えが書いてあるか分からない。

    本人が選んだ記録があれば先に置く。その記録について訊いているかも確かめさせる
    """
    blocks = []
    if target:
        blocks.append(f"【選んだ記録】\n{_md(target['date'])}: {target['line']}")
    for i, c in enumerate(candidates):
        lines = [f"【候補{i}】", f"問い: {c['question']}", f"手がかり: {c['hint'] or 'なし'}", "きっかけの記録:"]
        lines += [f"{_md(r['date'])}: {r['line']}" for r in c["records"]]
        blocks.append("\n".join(lines))
    return "\n\n".join(blocks)


def _index(v):
    index = v.get("index")
    return index if isinstance(index, int) and not isinstance(index, bool) else None


def choose(candidates, verdicts):
    """確かめを通った候補のうち、**考えたくなる度合い（strength）がいちばん高いもの。**

    同じならモデルが並べた順で先のもの。度合いが読めなければ 1 とみなす。無ければ None。
    """
    items = verdicts.get("verdicts") if isinstance(verdicts, dict) else None
    strength = {}
    for v in items or []:
        if not isinstance(v, dict) or _index(v) is None or v.get("pass") is not True:
            continue
        s = v.get("strength")
        s = s if isinstance(s, int) and not isinstance(s, bool) and 1 <= s <= 3 else 1
        strength[_index(v)] = max(strength.get(_index(v), 0), s)
    best, best_strength = None, 0
    for i, cand in enumerate(candidates):
        if strength.get(i, 0) > best_strength:
            best, best_strength = cand, strength[i]
    return best


def rejections(candidates, verdicts):
    """確かめで落ちた問いと、その理由"""
    items = verdicts.get("verdicts") if isinstance(verdicts, dict) else None
    reasons = {}
    for v in items or []:
        if isinstance(v, dict) and _index(v) is not None and v.get("pass") is not True:
            reasons[_index(v)] = str(v.get("reason") or "").strip() or "確かめを通らなかった"
    return [{"question": c["question"], "reason": reasons.get(i, "確かめを通らなかった")}
            for i, c in enumerate(candidates)]


def retry_note(rejected):
    """作り直すときに添える。**落ちた問いと理由**——同じ形をもう一度作らせない"""
    if not rejected:
        return ""
    lines = ["", "【前に作った問いは、次の理由で落ちました。同じ形を避けて作り直してください】"]
    lines += [f"- {r['question']}（{r['reason']}）" for r in rejected]
    return "\n".join(lines)


def to_patterns(chosen):
    """画面に渡す形。**黙るときは空。**

    主役は `question`。きっかけの日付は `fact.dates` に置く——
    日付も記録の番号も、モデルの文からではなく照らした記録から付ける。
    （画面はまだ観察を主役に描く。つなぐときに `ReviewSection.jsx` を直す）
    """
    if not chosen:
        return {"patterns": []}
    pattern = {
        "question": chosen["question"],
        "fact": {
            "kind": "records",
            "dates": sorted({r["date"] for r in chosen["records"]}),
            "ids": [r["id"] for r in chosen["records"]],
        },
    }
    if chosen.get("hint"):
        pattern["hint"] = chosen["hint"]
    return {"patterns": [pattern]}
