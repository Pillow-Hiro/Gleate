"""記録の計測。**作者が製品を判断するための数字であり、画面には出さない。**

## なぜ画面に出さないのか

CLAUDE.md は「数字で人を評価しない」を全体の判断基準に置いている。
ここで出す「平均15字」「記入率5%」は、機能を残すか畳むかを決めるための
数字であって、利用者が自分の記録を測るための数字ではない。

アプリの中に置いた瞬間に、それは利用者に向けられる。
「今週は先週より短い」と読める数字が画面にあれば、Lantern は
自己評価の道具になる。だからスクリプトに置く。

Settings の「記録した日数・現在の連続日数」とは目的が違う。
あちらは歩みの可視化で、こちらは製品の判断材料である。

## なぜイベント収集を足さないのか

`logs` は date を、`ideas` は created_at と picked_at を既に持っている。
「問いを入れた前と後で書き方が変わったか」は、これだけで遡って計算できる。

新しく利用ログを集めると、記録アプリが利用の監視を始めることになる。
遡れるもののために収集を足す理由はない。

## 数字の弱さについて

実ユーザー1人、記録20件。前後比較に足る母数ではない。
`compare()` は差を返すが、`SMALL_SAMPLE` 未満なら `reliable` を False にする。
判断の材料にはなるが、根拠にはならない。ここを曖昧にしない。
"""

from datetime import date, timedelta

# 記録フォームの4項目。表示順は画面と同じにする
FIELDS = ("created", "enjoyable", "struggled", "next")

FIELD_LABELS = {
    "created": "やったこと",
    "enjoyable": "よかったこと",
    "struggled": "困ったこと",
    "next": "次にやること",
}

# これ未満の件数では前後比較を信頼しない。
# 20件・1人という現状を踏まえた目安であって、統計的な根拠のある値ではない。
SMALL_SAMPLE = 30


def _text(log, field):
    return (log.get(field) or "").strip()


def _parse(date_str):
    """"YYYY-MM-DD" を date にする。壊れていれば None。

    記録の日付は本来アプリが入れるので壊れないが、計測が例外で
    止まると原因を追う手間の方が大きい。読めないものは黙って除く。
    """
    try:
        return date.fromisoformat(str(date_str)[:10])
    except (ValueError, TypeError):
        return None


def has_content(log):
    """記録として成立しているか。

    **写真だけの日は数えられない。** 2026-08-06 に写真を端末の中だけに置く
    方針へ変えたため、サーバーはその日の存在を知らない。
    ここで数える「記録した日数」は、文章を残した日数である。
    """
    return any(_text(log, f) for f in FIELDS)


def field_usage(logs):
    """項目ごとの記入率と平均文字数。

    平均文字数は「書かれた記録の中での平均」にする。母数に空欄を含めると
    記入率の低い項目の平均が常に0付近になり、記入率と二重に同じことを言う。
    """
    total = len(logs)
    out = {}
    for f in FIELDS:
        texts = [t for t in (_text(l, f) for l in logs) if t]
        out[f] = {
            "label": FIELD_LABELS[f],
            "count": len(texts),
            "total": total,
            "rate": (len(texts) / total) if total else 0.0,
            "avg_chars": (sum(len(t) for t in texts) / len(texts)) if texts else 0.0,
        }
    return out


def avg_total_chars(logs):
    """1記録あたりの総文字数（4項目の合計）の平均。

    項目ごとの平均とは別に見る。畳んだことで総量が減ったかを見るには
    項目単位ではなく記録単位で見る必要がある。
    """
    if not logs:
        return 0.0
    return sum(sum(len(_text(l, f)) for f in FIELDS) for l in logs) / len(logs)


def week_key(date_str):
    """ISO週のラベル。"2026-W32" の形。

    月ではなく週にするのは、20件規模だと月では点が2〜3個しか並ばず
    推移として読めないため。
    """
    d = _parse(date_str)
    if not d:
        return None
    y, w, _ = d.isocalendar()
    return f"{y}-W{w:02d}"


def by_week(logs):
    """週ラベル → その週の記録。古い順。記録の無い週は現れない。"""
    buckets = {}
    for l in logs:
        k = week_key(l.get("date"))
        if k:
            buckets.setdefault(k, []).append(l)
    return dict(sorted(buckets.items()))


def weekly_summary(logs):
    """週ごとの推移。折れ線として読めるだけの粒度に留める。"""
    return [
        {
            "week": k,
            "days": len(week_logs),
            "avg_chars": avg_total_chars(week_logs),
        }
        for k, week_logs in by_week(logs).items()
    ]


def streaks(logs, today):
    """現在の連続日数と最長連続日数。

    現在の連続は「今日または昨日」を起点にする。今日まだ書いていない
    だけで0になると、その日の途中で見たときに途切れて見える。
    起点の考え方は既存の get_streak と揃えている。
    """
    days = sorted({d for d in (_parse(l.get("date")) for l in logs if has_content(l)) if d})
    if not days:
        return {"current": 0, "longest": 0}

    longest = run = 1
    for prev, cur in zip(days, days[1:]):
        run = run + 1 if (cur - prev) == timedelta(days=1) else 1
        longest = max(longest, run)

    current = 0
    if days[-1] in (today, today - timedelta(days=1)):
        current = 1
        for prev, cur in zip(reversed(days[:-1]), reversed(days[1:])):
            if (cur - prev) != timedelta(days=1):
                break
            current += 1

    return {"current": current, "longest": longest}


def span(logs, today=None):
    """記録の期間と、そのうち書いた日の割合。

    「20件」だけでは密度が分からない。58日のうち20日なのか、
    20日連続なのかで意味がまったく違う。
    """
    days = sorted({d for d in (_parse(l.get("date")) for l in logs) if d})
    if not days:
        return {"first": None, "last": None, "span_days": 0, "recorded_days": 0, "rate": 0.0}
    last = max(days[-1], today) if today else days[-1]
    total = (last - days[0]).days + 1
    return {
        "first": days[0],
        "last": days[-1],
        "span_days": total,
        "recorded_days": len(days),
        "rate": len(days) / total,
    }


def split_at(logs, boundary):
    """境界日で前後に分ける。境界日そのものは「後」に入れる。

    機能を入れた日から効果が出うるため、その日を「前」に入れると
    変化を1日分薄める。
    """
    b = boundary if isinstance(boundary, date) else _parse(boundary)
    before, after = [], []
    for l in logs:
        d = _parse(l.get("date"))
        if not d or not b:
            continue
        (after if d >= b else before).append(l)
    return before, after


def compare(logs, boundary):
    """境界日の前後を比べる。

    差は返すが、評価はしない。`reliable` が False のときは
    「傾向が出た」と読んではいけない。件数の方を先に見ること。
    """
    before, after = split_at(logs, boundary)
    rows = []
    for f in FIELDS:
        b, a = field_usage(before)[f], field_usage(after)[f]
        rows.append({
            "label": FIELD_LABELS[f],
            "before_rate": b["rate"],
            "after_rate": a["rate"],
            "before_avg": b["avg_chars"],
            "after_avg": a["avg_chars"],
        })
    return {
        "boundary": boundary,
        "before_n": len(before),
        "after_n": len(after),
        "before_avg_chars": avg_total_chars(before),
        "after_avg_chars": avg_total_chars(after),
        "fields": rows,
        "reliable": min(len(before), len(after)) >= SMALL_SAMPLE,
    }


def idea_summary(ideas):
    """アイデアの溜め場の使われ方。

    **溜まっている件数を「未処理」として扱わない。** picked は
    拾った数であって、拾っていないものは負債ではない。
    modules/ideas.py が done ではなく picked_at を持つのと同じ理由。
    """
    total = len(ideas)
    picked = sum(1 for i in ideas if i.get("picked_at"))
    return {"total": total, "picked": picked}
