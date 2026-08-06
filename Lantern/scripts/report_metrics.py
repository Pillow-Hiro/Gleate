"""記録の計測レポートを出す。作者が製品を判断するための道具。

    python scripts/report_metrics.py

**これはアプリの機能ではない。** 画面に出さない理由は modules/metrics.py に書いた。
要点だけ再掲すると、ここで出る数字は「機能を残すか畳むか」を決めるためのもので、
利用者が自分の記録を測るためのものではない。

読み取りしかしない。書き込む経路を持たせていない。

    --boundary  前後比較の境界日（既定は問いとアイデアを入れた日）
    --today     「現在の連続日数」の基準日。既定は今日
    --user      利用者を絞る。省略すると全件（実ユーザーは作者1人）
"""

import argparse
import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv()

from modules import metrics  # noqa: E402  load_dotenv の後に読む
from modules.logs import load_logs, supabase  # noqa: E402
from modules.timeutil import today_date  # noqa: E402

# 問いの資産とアイデアの溜め場を入れた日。
# 「4段の2（書き始められる）を埋めたら書き方が変わったか」を見るための境界。
FEATURE_BOUNDARY = "2026-08-06"


def _fetch_ideas(user_id):
    if not supabase:
        return []
    q = supabase.table("ideas").select("id, created_at, picked_at")
    if user_id:
        q = q.eq("user_id", user_id)
    return q.execute().data or []


def _user_counts():
    """user_id ごとの行数。多い順。"""
    rows = supabase.table("logs").select("user_id").execute().data or []
    counts = {}
    for r in rows:
        counts[r["user_id"]] = counts.get(r["user_id"], 0) + 1
    return sorted(counts.items(), key=lambda kv: -kv[1])


def _pct(x):
    return f"{x * 100:5.1f}%"


def _bar(n, unit="■", scale=1):
    return unit * min(int(n * scale), 40)


def print_report(logs, ideas, today, boundary):
    print()
    print("Lantern 計測レポート")
    print(f"基準日: {today}")
    print("=" * 56)

    if not logs:
        print("\n記録がありません。SUPABASE_URL / SUPABASE_KEY を確認してください。")
        return

    s = metrics.span(logs, today)
    st = metrics.streaks(logs, today)

    print("\n■ 全体")
    print(f"  記録した日数      {s['recorded_days']} 日")
    print(f"  期間              {s['first']} 〜 {s['last']}（{s['span_days']} 日間）")
    print(f"  書いた日の割合    {_pct(s['rate'])}")
    print(f"  連続記録          現在 {st['current']} 日 / 最長 {st['longest']} 日")
    print(f"  1記録の平均字数   {metrics.avg_total_chars(logs):.1f} 字")
    print(f"  写真あり          {metrics.photo_count(logs)} 件")

    print("\n■ 入力欄の使用率")
    print(f"  {'項目':<14}{'記入':>9}{'率':>8}{'平均字数':>10}")
    for f in metrics.FIELDS:
        u = metrics.field_usage(logs)[f]
        print(f"  {u['label']:<14}{u['count']:>4}/{u['total']:<4}{_pct(u['rate']):>8}"
              f"{u['avg_chars']:>9.1f} 字")

    print("\n■ 週ごとの推移")
    print(f"  {'週':<10}{'日数':>4}  {'平均字数':>8}  {'写真':>4}")
    for r in metrics.weekly_summary(logs):
        print(f"  {r['week']:<10}{r['days']:>4}  {r['avg_chars']:>8.1f}  {r['photos']:>4}"
              f"   {_bar(r['days'])}")

    c = metrics.compare(logs, boundary)
    print(f"\n■ {boundary} の前後")
    print(f"  件数              前 {c['before_n']} 件 / 後 {c['after_n']} 件")
    print(f"  1記録の平均字数   前 {c['before_avg_chars']:.1f} 字 / "
          f"後 {c['after_avg_chars']:.1f} 字")
    print(f"  {'項目':<14}{'記入率 前→後':>16}{'平均字数 前→後':>18}")
    for r in c["fields"]:
        print(f"  {r['label']:<14}{_pct(r['before_rate'])} →{_pct(r['after_rate'])}"
              f"{r['before_avg']:>10.1f} →{r['after_avg']:>6.1f}")

    if not c["reliable"]:
        print(f"\n  ※ 前後どちらかが {metrics.SMALL_SAMPLE} 件未満。")
        print("     差が出ていても傾向とは読まないこと。まず件数が増えるのを待つ。")

    i = metrics.idea_summary(ideas)
    print("\n■ アイデア")
    print(f"  置いた数          {i['total']} 件")
    print(f"  拾った数          {i['picked']} 件")

    print()


def main():
    p = argparse.ArgumentParser(description="Lantern の記録を集計して表示する（読み取りのみ）")
    p.add_argument("--boundary", default=FEATURE_BOUNDARY, help="前後比較の境界日 YYYY-MM-DD")
    p.add_argument("--today", default=None, help="基準日 YYYY-MM-DD。既定は今日")
    p.add_argument("--user", default=None, help="user_id で絞る")
    args = p.parse_args()

    if not supabase:
        print("SUPABASE_URL / SUPABASE_KEY が設定されていません。.env を確認してください。")
        return 1

    # 複数のアカウントがあるまま集計しない。
    # 実際に混ざったことがある（動作確認用のアカウントが2件持っていた）。
    # 混ざった数字は「記録した日数」と「記録の件数」がずれる形で現れるが、
    # 気づかなければそのまま機能の要否の判断に使われてしまう。
    user = args.user
    if not user:
        counts = _user_counts()
        if len(counts) > 1:
            print("\n複数のアカウントに記録があります。--user で指定してください。\n")
            for uid, n in counts:
                print(f"  --user {uid}   ({n} 件)")
            print()
            return 1
        if counts:
            user = counts[0][0]

    today = date.fromisoformat(args.today) if args.today else today_date()
    print(f"\n対象: {user}")
    print_report(load_logs(user), _fetch_ideas(user), today, args.boundary)
    return 0


if __name__ == "__main__":
    sys.exit(main())
