# -*- coding: utf-8 -*-
"""今週の振り返りの物差し（2026-09-14）。**API に課金される。手で動かす。**

    EVAL_USER_ID=<作者のUID> python scripts/eval_weekly.py run --variant v2 --ids week-2026-09-14,...
    python scripts/eval_weekly.py sheet --variant v2          # 1件ずつ ○△× を付けるページ
    python scripts/eval_weekly.py grades --variant v2 "1○ 2△ 3×"
    python scripts/eval_weekly.py blind --variant v2          # いまの作りと伏せて並べるページ
    python scripts/eval_weekly.py picks "1A 2B 3同じ 4ダメ"

`scripts/audit_ai.py` と同じく pytest には入れない。

| variant | 呼ぶもの |
|---|---|
| `baseline` | `ai.get_weekly_review`（1回で観察を1つ） |
| `v2` | `ai.read_weekly_review`（決まった手順で読み、問いを1つ置く・`modules/reader.py`） |

## ここまでの結果

- 2026-09-14 `baseline` と `v1`（記録どうしを並べて確かめてから観察を出す作り）を、
  作者の記録20週で伏せて比べた。**作者の答えは20週すべて「どちらもダメ」。**
  「知ってることの言い直し」「問いが無い・弱い」「黙るのもダメ」。v1 のコードは残していない
- 2026-09-15 作者の判断で問いを主役にした `v2` を作った。いまの作りは全部ダメだったので、
  伏せて比べても差しか分からない。**v2 だけを並べ、作者が1件ずつ ○（考えたくなる）
  △（惜しい）×（ダメ）を付ける**

## 記録をリポジトリに置かない

`cases.json` にあるのは「いつ振り返るを押したか」の日付だけ。記録は動かすたびに
`EVAL_USER_ID` のアカウントから読む。書き出す結果（`baseline/` `v2/` `blind.html`
`blind_key.json` `picks.json`）は**記録の本文を含む**ので `.gitignore` で外している。

テストのための記録（「テスト」とだけ書いたもの）は外す。作者の記録に4件ある。

## 手本から外したもの

手本（claude-api の `runner-scaffold.mjs`）にある「走らせる前に、物差し自体が
書き換わっていないか止める仕組み」は入れていない。人の手を離れて何周も回すための
仕組みで、ここは作者と見ながら1回ずつ動かす。
"""
import argparse
import html
import json
import math
import os
import random
import re
import statistics
import sys
import time
import unicodedata
from collections import Counter
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from dotenv import load_dotenv  # noqa: E402

load_dotenv(os.path.join(ROOT, ".env"))

from modules import ai, reader  # noqa: E402
from modules.timeutil import review_windows  # noqa: E402

FLOW = os.path.join(ROOT, ".claude", "hillclimb", "weekly-review")
# 伏せ方を毎回同じにする。**ページを作り直しても A と B が入れ替わらない**
SEED = "2026-09-14"
USAGE_KEYS = ("input_tokens", "output_tokens", "cache_read_input_tokens", "cache_creation_input_tokens")
# 100万トークンあたりのドル（入力, 出力）。キャッシュの読みは入力の0.1倍、書きは1.25倍
PRICES = {"claude-sonnet-5": (2.00, 10.00), "claude-opus-5": (5.00, 25.00)}


def _baseline(period, previous):
    return ai.get_weekly_review(period, None, last_week_logs=previous or None)


def _v2(period, previous):
    return ai.read_weekly_review(period, previous)


VARIANTS = {"baseline": _baseline, "v2": _v2}


def is_test(log):
    created = (log.get("created") or "").strip()
    return "テスト" in created and len(created) <= 8


def load_cases():
    with open(os.path.join(FLOW, "cases.json"), encoding="utf-8") as f:
        return json.load(f)["cases"]


def select(cases, ids):
    if not ids:
        return cases
    wanted = set(ids.split(","))
    return [c for c in cases if c["id"] in wanted]


def windows(case, logs):
    """その日に「振り返る」を押したときの、今週とその前の週。**本番と同じ関数で切る**"""
    now = datetime.fromisoformat(f"{case['today']}T12:00:00+09:00")
    (start, end), (prev_start, prev_end) = review_windows("weekly", now=now)
    return (
        [l for l in logs if start <= l.get("date", "") <= end],
        [l for l in logs if prev_start <= l.get("date", "") <= prev_end],
    )


def served_ok(requested, served):
    """頼んだ模型で返ったか。日付つきの版名（`-20260101` など）だけは同じとみなす"""
    served = str(served or "")
    if served == requested:
        return True
    if not served.startswith(requested):
        return False
    return re.fullmatch(r"[-@](\d{8}|\d{4}-\d{2}-\d{2})", served[len(requested):]) is not None


def cost(model, usage):
    price = next((p for name, p in PRICES.items() if str(model or "").startswith(name)), None)
    if price is None:
        return None
    i, o = price
    return (
        usage["input_tokens"] * i + usage["output_tokens"] * o
        + usage["cache_read_input_tokens"] * i * 0.1
        + usage["cache_creation_input_tokens"] * i * 1.25
    ) / 1_000_000


def read_jsonl(path):
    if not os.path.exists(path):
        return []
    rows = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    return rows


def append_jsonl(path, row):
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")


def _said(patterns):
    if not patterns:
        return "（黙る）"
    p = patterns[0]
    text = p.get("question") or p.get("observation") or ""
    return text + (f" ／手がかり: {p['hint']}" if p.get("hint") else "")


def run(args):
    from modules.logs import load_logs

    uid = os.environ.get("EVAL_USER_ID")
    if not uid:
        print("EVAL_USER_ID が無い（作者のアカウントのUID）。")
        return 2
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ANTHROPIC_API_KEY が無い。.env を確認すること。")
        return 2

    requested = ai._MODEL_DEFAULT
    vdir = os.path.join(FLOW, args.variant)
    os.makedirs(os.path.join(vdir, "traces"), exist_ok=True)
    results_path = os.path.join(vdir, "results.jsonl")
    errors_path = os.path.join(vdir, "errors.jsonl")
    # **できた週は飛ばす。**途中で落ちても、やり直すと残りだけ呼ぶ
    done = {(r.get("prompt_id"), r.get("rep")) for r in read_jsonl(results_path)}

    logs = [l for l in load_logs(uid) if not is_test(l)]
    cases = select(load_cases(), args.ids)
    if args.limit:
        cases = cases[: args.limit]
    todo = [(c, rep) for c in cases for rep in range(args.reps) if (c["id"], rep) not in done]
    print(f"[{args.variant}] {len(todo)} 件を呼ぶ（{requested}）。APIに課金される。")

    call = VARIANTS[args.variant]
    ok = failed = 0
    spent = []
    started = time.time()
    for case, rep in todo:
        period, previous = windows(case, logs)
        calls = []
        ai.RESPONSE_HOOK = lambda system, user, message: calls.append((system, user, message))
        t0 = time.time()
        error = None
        try:
            out = call(period, previous)
        except Exception as e:  # 1週が落ちても、残りの週は回す
            out, error = None, f"{type(e).__name__}: {e}"
        finally:
            ai.RESPONSE_HOOK = None
        latency = round(time.time() - t0, 2)

        models = [m.model for _, _, m in calls]
        stops = [m.stop_reason for _, _, m in calls]
        usage = {k: sum(getattr(m.usage, k, 0) or 0 for _, _, m in calls) for k in USAGE_KEYS}
        billed = cost(models[0], usage) if models else 0.0

        # **呼べなかったことを、黙ったことと混ぜない**
        failure = None
        if error:
            failure = ("harness_error", error)
        elif any(not served_ok(requested, m) for m in models):
            failure = ("serving_substitution", f"頼んだ {requested}、返ってきた {models}")
        elif out is None:
            failure = ("no_output", "読めなかった（呼び出しの失敗か、形が読めなかった）")
        elif args.variant == "baseline" and not calls:
            # いまの作りは、呼べなかったときも空の観察を返す。ここで見分ける
            failure = ("no_output", "呼び出しが返らなかった")
        if failure:
            failed += 1
            append_jsonl(errors_path, {
                "prompt_id": case["id"], "rep": rep,
                "failure_class": failure[0], "error": failure[1],
                "model": models[0] if models else None, "usage": usage, "latency_s": latency,
            })
            print(f"  {case['id']} rep{rep} 失敗: {failure[0]} {failure[1]}")
            continue

        try:
            patterns = json.loads(out).get("patterns") or []
        except (json.JSONDecodeError, AttributeError):
            patterns = []
        row = {
            "prompt_id": case["id"],
            "rep": rep,
            "prompt": reader.as_text(reader.label(period, previous)),
            "tags": case.get("tags", []),
            "meta": {"today": case["today"], "calls": len(calls), "stop_reasons": stops,
                     "no_call": not calls},
            "model": models[0] if models else None,
            "usage": usage,
            "stop_reason": stops[-1] if stops else None,
            "status": "truncated" if "max_tokens" in stops else "ok",
            "latency_s": latency,
            "output": {"patterns": patterns[:1]},
        }
        append_jsonl(results_path, row)

        trace = []
        for system, user, message in calls:
            trace += [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
                {"role": "assistant", "content": ai._first_text(message) or ""},
            ]
        if not calls:
            trace = [{"role": "user", "content": row["prompt"]},
                     {"role": "assistant", "content": "（呼ばずに黙った）"}]
        with open(os.path.join(vdir, "traces", f"{case['id']}_rep{rep}.json"), "w", encoding="utf-8") as f:
            json.dump(trace, f, ensure_ascii=False, indent=2)

        ok += 1
        spent.append((billed or 0.0, latency))
        print(f"  {case['id']} rep{rep} {latency}s 呼び出し{len(calls)}回 "
              f"in={usage['input_tokens']} out={usage['output_tokens']} ${billed or 0:.4f} "
              f"{row['status']} → {_said(patterns)}")

    print(f"\n[{args.variant}] {ok} 件できた / {failed} 件失敗 / {time.time() - started:.0f}秒")
    if spent:
        costs = sorted(s[0] for s in spent)
        lats = sorted(s[1] for s in spent)
        print(f"  費用: 合計 ${sum(costs):.4f}、1件 最小 ${costs[0]:.4f} / 中央 ${statistics.median(costs):.4f} / 最大 ${costs[-1]:.4f}")
        print(f"  時間: 1件 最小 {lats[0]}s / 中央 {statistics.median(lats)}s / 最大 {lats[-1]}s")
    return 1 if failed else 0


def latest(variant):
    return {r["prompt_id"]: r for r in read_jsonl(os.path.join(FLOW, variant, "results.jsonl"))
            if r.get("rep") == 0}


def _md(date):
    _, m, d = date.split("-")
    return f"{int(m)}月{int(d)}日"


def _split(prompt):
    """`reader.as_text` の文を、今週とその前の週の (日付, 本文) に戻す"""
    week, prev, target = [], [], None
    for line in prompt.splitlines():
        if line.startswith("【今週"):
            target = week
        elif line.startswith("【その前の週"):
            target = prev
        else:
            m = re.match(r"^[WP]\d+（(.+?)）: (.*)$", line)
            if m and target is not None:
                target.append((m.group(1), m.group(2)))
    return week, prev


def _records_html(rows):
    if not rows:
        return '<div class="none">記録なし</div>'
    return "".join(
        f'<div class="rec"><span class="date">{html.escape(d)}</span>{html.escape(t)}</div>'
        for d, t in rows
    )


def _output_html(label, output, show_dates=False):
    patterns = (output or {}).get("patterns") or []
    if not patterns:
        body = '<p class="silent">何も出さない（黙る）</p>'
    else:
        p = patterns[0]
        body = ""
        if p.get("observation"):
            body += f'<p class="obs">{html.escape(p["observation"])}</p>'
        if p.get("question"):
            cls = "q" if p.get("observation") else "ask"
            body += f'<p class="{cls}">{html.escape(p["question"])}</p>'
        if p.get("hint"):
            body += f'<p class="hint">{html.escape(p["hint"])}</p>'
        dates = (p.get("fact") or {}).get("dates") or []
        if show_dates and dates:
            body += f'<p class="dates">きっかけ: {"・".join(_md(d) for d in dates)}</p>'
    head = f'<div class="label">{label}</div>' if label else ""
    return f'<div class="out">{head}{body}</div>'


_STYLE = """
:root{--bg:#FAF8F4;--card:#fff;--ink:#2B2620;--sub:#7A7064;--line:#E7E0D5;--sand:#FFF0DB;--sandink:#7A4E12}
@media (prefers-color-scheme:dark){:root{--bg:#1C1A17;--card:#26231F;--ink:#EFE9E0;--sub:#A99F92;--line:#3A352E;--sand:#3B2E1C;--sandink:#F2C98A}}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.7 -apple-system,"Hiragino Sans","Noto Sans JP",sans-serif}
main{max-width:680px;margin:0 auto;padding:20px 16px 60px}h1{font-size:20px;margin:0 0 6px}.lead{color:var(--sub);margin:0 0 20px}
.case{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin:0 0 16px}
header{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:6px}.no{font-weight:700;font-size:18px;min-width:1.6em}
.when{font-weight:600}.chip{background:var(--sand);color:var(--sandink);border-radius:999px;padding:0 10px;font-size:12px}
h3{font-size:13px;color:var(--sub);margin:10px 0 4px;font-weight:600}.rec{border-top:1px solid var(--line);padding:6px 0}
.date{font-size:12px;color:var(--sub);margin-right:8px}.none{color:var(--sub);font-size:13px;padding:6px 0}
details{margin-top:6px}summary{color:var(--sub);font-size:13px;cursor:pointer}
.pair{display:grid;grid-template-columns:1fr;gap:10px;margin-top:12px}@media (min-width:560px){.pair{grid-template-columns:1fr 1fr}}
.out{background:var(--sand);border-radius:10px;padding:10px 12px;margin-top:12px}.pair .out{margin-top:0}.label{font-weight:700;color:var(--sandink)}
.obs{margin:4px 0}.q{margin:6px 0 0;padding-left:10px;border-left:2px solid var(--line);color:var(--sub)}
.ask{margin:4px 0;font-size:16px;font-weight:600}.hint{margin:6px 0 0;font-size:13px;color:var(--sub)}
.dates{margin:6px 0 0;font-size:12px;color:var(--sub)}.silent{margin:4px 0;color:var(--sub)}
"""


def _page(title, lead, sections):
    return (
        '<!doctype html><html lang="ja"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        f"<title>{html.escape(title)}</title><style>{_STYLE}</style></head><body><main>"
        f'<h1>{html.escape(title)}</h1><p class="lead">{lead}</p>{"".join(sections)}</main></body></html>'
    )


def _case_head(n, case, prompt):
    week, prev = _split(prompt)
    return (
        f'<header><span class="no">{n}</span>'
        f'<span class="when">{_md(case["today"])}に押したとき</span>'
        f'<span class="chip">今週{html.escape(case["tags"][0])}</span></header>'
        f'<h3>今週の記録</h3>{_records_html(week)}'
        f'<details><summary>その前の週の記録（{len(prev)}件）</summary>{_records_html(prev)}</details>'
    )


def sheet(args):
    """1件ずつ ○△× を付けるページ。**伏せない**ので、きっかけの日付も出す"""
    rows = latest(args.variant)
    cases = [c for c in select(load_cases(), args.ids) if c["id"] in rows]
    if not cases:
        print(f"{args.variant} の結果が無い。先に run を動かすこと。")
        return 2
    vdir = os.path.join(FLOW, args.variant)
    key, sections = [], []
    for n, c in enumerate(cases, 1):
        key.append({"no": n, "id": c["id"]})
        sections.append(
            f'<section class="case">{_case_head(n, c, rows[c["id"]]["prompt"])}'
            f'{_output_html("", rows[c["id"]]["output"], show_dates=True)}</section>'
        )
    lead = ("その日に「振り返る」を押したら出る問いです。1件ずつ、<b>○ 考えたくなる</b>、"
            "<b>△ 惜しい</b>、<b>× ダメ</b> を付けてください。<br>"
            "返信は「1○ 2△ 3×」の形で。△と×には、ひとことでも理由があると直しやすくなります。")
    with open(os.path.join(vdir, "sheet.html"), "w", encoding="utf-8") as f:
        f.write(_page(f"今週の振り返り・問いを見る（{len(cases)}週）", lead, sections))
    with open(os.path.join(vdir, "sheet_key.json"), "w", encoding="utf-8") as f:
        json.dump(key, f, ensure_ascii=False, indent=1)
    print(os.path.join(vdir, "sheet.html"))
    return 0


def grades(args):
    vdir = os.path.join(FLOW, args.variant)
    key_path = os.path.join(vdir, "sheet_key.json")
    if not os.path.exists(key_path):
        print("sheet_key.json が無い。先に sheet を動かすこと。")
        return 2
    with open(key_path, encoding="utf-8") as f:
        key = {k["no"]: k["id"] for k in json.load(f)}
    text = unicodedata.normalize("NFKC", args.text).replace("〇", "○").replace("◯", "○")
    marks = {}
    for no, mark in re.findall(r"(\d+)\s*[:\-]?\s*([○△×xX])", text):
        no = int(no)
        if no in key:
            marks[no] = "×" if mark in "xX" else mark
    with open(os.path.join(vdir, "grades.json"), "w", encoding="utf-8") as f:
        json.dump([{"no": n, "id": key[n], "mark": marks[n]} for n in sorted(marks)], f,
                  ensure_ascii=False, indent=1)
    tags = {c["id"]: c["tags"][0] for c in load_cases()}
    counts = Counter(marks.values())
    print(f"付けた {len(marks)} 週 / 付けていない番号: {sorted(set(key) - set(marks)) or 'なし'}")
    print(f"  ○ {counts['○']} / △ {counts['△']} / × {counts['×']}")
    scores = [{"○": 1.0, "△": 0.5, "×": 0.0}[m] for m in marks.values()]
    if len(scores) >= 2:
        mean = sum(scores) / len(scores)
        half = 1.96 * statistics.stdev(scores) / math.sqrt(len(scores))
        print(f"  点（○=1 △=0.5 ×=0）{mean:.2f}（95%の幅 {max(0.0, mean - half):.2f}〜{min(1.0, mean + half):.2f}）")
    for tag in sorted({tags[key[n]] for n in marks}):
        group = Counter(m for n, m in marks.items() if tags[key[n]] == tag)
        print(f"  今週{tag}: ○ {group['○']} / △ {group['△']} / × {group['×']}")
    return 0


def blind(args):
    base, new = latest("baseline"), latest(args.variant)
    cases = [c for c in load_cases() if c["id"] in base and c["id"] in new]
    if not cases:
        print(f"baseline と {args.variant} の両方が揃った週が無い。先に run を動かすこと。")
        return 2
    key, sections = [], []
    for n, c in enumerate(cases, 1):
        new_is_a = random.Random(f"{SEED}-{c['id']}").random() < 0.5
        a, b = (new, base) if new_is_a else (base, new)
        key.append({"no": n, "id": c["id"],
                    "A": args.variant if new_is_a else "baseline",
                    "B": "baseline" if new_is_a else args.variant})
        sections.append(
            f'<section class="case">{_case_head(n, c, base[c["id"]]["prompt"])}'
            f'<div class="pair">{_output_html("A", a[c["id"]]["output"])}{_output_html("B", b[c["id"]]["output"])}</div>'
            "</section>"
        )
    lead = ("同じ週に2つの作りが返したものを、A と B に伏せて並べています。"
            "どちらがどちらかは、選び終わるまで出しません。根拠の日付は、どちらか分かってしまうので出していません。<br>"
            "返信は「1A 2B 3同じ 4ダメ」の形で。同じ＝差が無い、ダメ＝どちらも出してほしくない。")
    with open(os.path.join(FLOW, "blind.html"), "w", encoding="utf-8") as f:
        f.write(_page(f"今週の振り返り・伏せて比べる（{len(cases)}週）", lead, sections))
    with open(os.path.join(FLOW, "blind_key.json"), "w", encoding="utf-8") as f:
        json.dump(key, f, ensure_ascii=False, indent=1)
    print(os.path.join(FLOW, "blind.html"))
    return 0


def picks(args):
    key_path = os.path.join(FLOW, "blind_key.json")
    if not os.path.exists(key_path):
        print("blind_key.json が無い。先に blind を動かすこと。")
        return 2
    with open(key_path, encoding="utf-8") as f:
        key = {k["no"]: k for k in json.load(f)}
    text = unicodedata.normalize("NFKC", args.text)
    chosen = {}
    for no, pick in re.findall(r"(\d+)\s*[:\-]?\s*(A|B|同じ|両方ダメ|ダメ)", text, flags=re.I):
        no = int(no)
        if no not in key:
            print(f"{no} 番は無い")
            continue
        pick = pick.upper() if pick.upper() in ("A", "B") else pick
        winner = key[no][pick] if pick in ("A", "B") else ("tie" if pick == "同じ" else "both_bad")
        chosen[no] = {"no": no, "id": key[no]["id"], "pick": pick, "winner": winner}
    with open(os.path.join(FLOW, "picks.json"), "w", encoding="utf-8") as f:
        json.dump([chosen[n] for n in sorted(chosen)], f, ensure_ascii=False, indent=1)

    tags = {c["id"]: c["tags"][0] for c in load_cases()}
    missing = sorted(set(key) - set(chosen))
    counts = Counter(c["winner"] for c in chosen.values())
    new = next((v for k in key.values() for v in (k["A"], k["B"]) if v != "baseline"), "new")
    print(f"選んだ {len(chosen)} 週 / 選んでいない番号: {missing or 'なし'}")
    print(f"  {new} {counts[new]} / いまの作り {counts['baseline']} / "
          f"同じ {counts['tie']} / どちらもダメ {counts['both_bad']}")
    # 勝ち点: 新しい作りが選ばれたら1、いまの作りなら0、同じ・どちらもダメは0.5
    scores = [1.0 if c["winner"] == new else 0.0 if c["winner"] == "baseline" else 0.5
              for c in chosen.values()]
    if len(scores) >= 2:
        mean = sum(scores) / len(scores)
        half = 1.96 * statistics.stdev(scores) / math.sqrt(len(scores))
        print(f"  {new} の勝ち点 {mean:.2f}（95%の幅 {max(0.0, mean - half):.2f}〜"
              f"{min(1.0, mean + half):.2f}。0.5 が五分）")
    for tag in sorted({tags[c["id"]] for c in chosen.values()}):
        group = Counter(c["winner"] for c in chosen.values() if tags[c["id"]] == tag)
        print(f"  今週{tag}: {new} {group[new]} / いま {group['baseline']} / "
              f"同じ {group['tie']} / ダメ {group['both_bad']}")
    return 0


def main():
    parser = argparse.ArgumentParser(description="今週の振り返りの物差し（run は課金される）")
    sub = parser.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run", help="作者の記録で呼ぶ（課金される）")
    r.add_argument("--variant", choices=sorted(VARIANTS), required=True)
    r.add_argument("--ids", help="呼ぶ週を , 区切りで選ぶ（例: week-2026-09-14,week-2026-08-12）")
    r.add_argument("--limit", type=int, help="先頭から何週だけ呼ぶか")
    r.add_argument("--reps", type=int, default=1)
    s = sub.add_parser("sheet", help="1件ずつ ○△× を付けるページを作る")
    s.add_argument("--variant", default="v2")
    s.add_argument("--ids")
    g = sub.add_parser("grades", help="作者が付けた ○△× を数える")
    g.add_argument("--variant", default="v2")
    g.add_argument("text")
    b = sub.add_parser("blind", help="いまの作りと伏せて並べたページを作る")
    b.add_argument("--variant", default="v2")
    k = sub.add_parser("picks", help="伏せたページで作者が選んだものを数える")
    k.add_argument("text")
    args = parser.parse_args()
    return {"run": run, "sheet": sheet, "grades": grades, "blind": blind, "picks": picks}[args.cmd](args)


if __name__ == "__main__":
    sys.exit(main())
