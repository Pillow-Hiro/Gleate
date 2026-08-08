"""AIの出力を実際に呼んで並べ、AI憲法に照らして読む。

    python scripts/audit_ai.py            # 全部
    python scripts/audit_ai.py --only 灯り  # 名前で絞る

**pytest には入れない。** APIに課金されるため、手で動かす。
`tests/test_prompts.py`（静的検査）と対になっている。

| 層 | 何を見るか | いつ |
|---|---|---|
| `tests/test_prompts.py` | プロンプトの書き方 | pytest のたび |
| これ | 実際に返ってきた文 | プロンプトを触ったとき・公開前 |

## なぜ静的検査だけでは足りないか

2026-08-08 の不具合は、プロンプトが憲法と矛盾していたことが原因だった。
**その矛盾は静的に見つけられる。** だが「出力が Lantern らしいか」は
書き方からは分からない。

    App Storeへの配信準備が、今日のことです。

この文に禁止ワードは無い。字数も守っている。Markdown も無い。
**機械には合格に見えるが、記録を言い換えただけで何も足していない。**
そこは人が読むしかない。

このスクリプトは機械で分かる違反（禁止ワード・字数・Markdown）に
印を付けるだけで、**良し悪しは判定しない。** 読むのは人。
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv()

from modules import ai  # noqa: E402

# CLAUDE.md の禁止ワード。機械で分かるものだけ。
BANNED = [
    "頑張", "素晴らし", "必ず", "きっと", "しましょう", "してみてください",
    "継続すること自体が力", "一歩", "前進", "成長", "充実",
    "記録が途切れ", "ぶりですね", "お久しぶり",
    "ポジティブ", "ネガティブ", "努力が実り",
]

# 検査に使う記録。作者の実際の記録に近い形にする。
# 短い記録・長い記録・困りごとのある記録を混ぜる。
TODAY = {
    "created": "App Storeへの配信準備。自分のアプリをスマホで触れた。",
    "enjoyable": "",
    "struggled": "ドメインや認証まわりの登録",
    "next": "",
}
LOGS = [
    {"date": "2026-08-04", "created": "仕事終わりに読書記録をまとめた",
     "enjoyable": "", "struggled": "", "next": ""},
    {"date": "2026-08-03", "created": "ちいかわの映画を見ました。ダークな要素もありました",
     "enjoyable": "", "struggled": "", "next": ""},
    {"date": "2026-08-01", "created": "朝早く起きて、ジムで汗を流し、読書をしました",
     "enjoyable": "気持ちよかった", "struggled": "", "next": ""},
]

# generate_video_insight は文字列を受け取る（main.py が組み立てて渡す）。
# 最初この点検で list を渡して落とした。**呼び出し側と同じ形にする。**
LOGS_TEXT = "\n".join(
    f"{l['date']}: {l['created']}"
    + (f"（楽しかったこと: {l['enjoyable']}）" if l["enjoyable"] else "")
    for l in LOGS
)

VIDEOS = [
    {"title": "オリジナル曲を作りました", "published_at": "2026-07-20",
     "view_count": 1200, "like_count": 80},
    {"title": "カバー曲を歌ってみた", "published_at": "2026-06-02",
     "view_count": 340, "like_count": 12},
]
STREAMS = [
    {"title": "深夜の作業配信", "started_at": "2026-08-02T23:00:00Z", "duration_minutes": 180},
    {"title": "雑談", "started_at": "2026-07-28T21:00:00Z", "duration_minutes": 60},
]


def cases():
    """(名前, 呼び出し) の一覧。戻り値は文字列であること。"""
    return [
        ("保存後の応答", lambda: ai.get_ai_response(TODAY, LOGS)),
        ("今日の灯り", lambda: ai.get_daily_quote(LOGS[0])[0]),
        ("起動画面の一言", lambda: ai.get_splash_quote("snoopy")),
        ("起動画面の一言（禅）", lambda: ai.get_splash_quote("zen")),
        ("今週の振り返り", lambda: ai.get_weekly_review(LOGS, None)),
        ("今月の振り返り", lambda: ai.get_monthly_review(LOGS, None)),
        ("過去との対話", lambda: ai.generate_timeline_reflection(LOGS[2:], LOGS[:1], 1)),
        ("節目", lambda: ai.generate_milestone_reflection(LOGS, 30)),
        ("チャンネルの観察", lambda: ai.generate_channel_insight(VIDEOS)),
        ("動画の観察", lambda: ai.generate_video_insight(VIDEOS[0], LOGS_TEXT)),
        ("配信の観察", lambda: ai.generate_stream_insight(STREAMS)),
    ]


def flags(text):
    out = [w for w in BANNED if w in text]
    if "**" in text or "##" in text or "---" in text:
        out.append("Markdown")
    return out


def main():
    p = argparse.ArgumentParser(description="AIの出力を実際に呼んで並べる（課金される）")
    p.add_argument("--only", help="名前に含まれる語で絞る")
    args = p.parse_args()

    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ANTHROPIC_API_KEY が無い。.env を確認すること。")
        return 1

    targets = [(n, f) for n, f in cases() if not args.only or args.only in n]
    print(f"{len(targets)} 件を呼ぶ。**APIに課金される。**\n")

    hit = 0
    for name, call in targets:
        print("=" * 60)
        print(f"■ {name}")
        try:
            text = str(call() or "").strip()
        except Exception as e:
            print(f"  失敗: {type(e).__name__}: {e}")
            continue
        print(f"  （{len(text)}文字）")
        for line in text.splitlines():
            print(f"  {line}")
        bad = flags(text)
        if bad:
            hit += 1
            print(f"  ★ 機械で分かる違反: {bad}")

    print("\n" + "=" * 60)
    print(f"機械で分かる違反: {hit} / {len(targets)} 件")
    print("""
**これは合格判定ではない。** 禁止ワードが無くても、
記録を言い換えただけの文は通ってしまう。次の目で読むこと。

- 記録の中身を並べ直しただけになっていないか
- 項目名（よかったこと・困ったこと）をなぞっていないか
- どの記録にも当てはまる一般論になっていないか
- 書かれていない気持ちを代弁していないか
- 数字で評価していないか（ダッシュボード系）
""")
    return 0


if __name__ == "__main__":
    sys.exit(main())
