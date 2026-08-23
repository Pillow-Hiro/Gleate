"""無料と有料の線。

## 線の引き方

**今日と今週のことは無料。積み重ねを掘るのは有料。**

1文で言えることを基準にしている。機能を数えて並べると、
どちらに入るかを毎回考えることになり、そのうち線がぼやける。

| | 何が入るか |
|---|---|
| 無料 | 記録・写真・アイデア・検索・**エクスポート**・記録のAI・今日の灯り・今週の発見 |
| 有料 | 月次の振り返り・過去との対話・頻出キーワード・**配信と動画の読み解き** |

**エクスポートは永久に無料。** 書いたものを持ち出せないのは、
記録が利用者のものだという前提と正面から衝突する（`TERMS.md` 6.1）。

## なぜこの線なのか

原価があるのは AI だけ（Anthropic API）。
そのうち**毎日みんなが使うもの**が無料側に、
**たまにしか使わないが深いもの**が有料側に来る。

有料側は、記録が積み重なるほど価値が上がる。
原価が上がる方向と価値が上がる方向が揃っている。

## 表が無いときは通す

`subscriptions` 表は人の手で作る（`docs/sql/subscriptions.sql`）。
**読めない間は有料として扱う。**

逆にすると、表の作成が遅れただけで、お金を払った人が
自分の分析を見られなくなる。ただ乗りされるより悪い。
`modules/ratelimit.py` が「表が無くても止めない」としているのと同じ考え方。

**公開前に必ず表を作ること。** 作り忘れると全員が有料の扱いになる。
"""

from functools import wraps

from flask import g, jsonify

from modules.timeutil import now_utc_iso

# 1日に AI を呼べる回数。
#
# 無料の 10 回は、ふつうの1日には届かない数にしてある。
# 記録のAI・今日の灯り・節目・週次を全部触っても4回で、
# 残りは**書き直したとき**のぶん（`/save` は保存のたびに AI を呼ぶ）。
#
# 有料は 2026-08-18 に 60 から 30 へ、2026-08-23 に 30 から 20 へ下げた。
#
# **この数は誰の目にも触れない。** 画面のどこにも出さないので、
# 下げても使う人の体感は変わらない。変わるのは最悪値だけ。
#
# 上限まで使われたときの原価は **1回あたり約1.7円 × 上限 × 30日**。
#
# | 上限 | 最悪の原価 |
# |---|---|
# | 60 | 約 3,060 円 |
# | 30 | 約 1,530 円 |
# | 20 | 約 1,020 円 |
#
# **月額を 800 円に下げたので、30 では釣り合わなくなった。**
# 手数料 15%（Small Business Program）でも手取りは 680 円で、
# 30 のままだと 1 人で 850 円の赤字を出せてしまう。
#
# 20 でもまだ最悪値は手取りを超えるが、**ここから下げると
# ふつうに使う人に届き始める。**記録のAI・今日の灯り・節目・週次を
# 全部触って4回、書き直しを含めても1日20回には届かない。
# 上限は「事故を止める柵」であって、使い方を制限する道具ではない。
#
# 有料の値打ちは回数ではなく**機能が全部開くこと**にあるので、
# ここを削っても売り物は痩せない。
FREE_DAILY_AI = 10
PAID_DAILY_AI = 20

# 有料として扱う状態。**ここが唯一の定義**。
# `modules/billing.py` はこれを import する。2か所に書くと、
# 片方だけ足したときに「買ったのに使えない」「解約したのに使える」が起きる。
#
# `active`         … 課金中
# `trialing`       … 無料お試し中
# `in_grace_period`… 決済が通らないが猶予期間（Apple が再試行している）
ACTIVE_STATUSES = ("active", "trialing", "in_grace_period")


def _db():
    from modules.logs import supabase
    return supabase


def is_paid(user_id):
    """有料プランかどうか。**読めなければ True**（上の「表が無いときは通す」）。"""
    db = _db()
    if not db or not user_id:
        return True

    try:
        result = (
            db.table("subscriptions")
            .select("status,expires_at")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
    except Exception as e:
        print(f"[Plan] subscriptions を読めないので有料として扱う ({type(e).__name__})")
        return True

    rows = result.data or []
    if not rows:
        # 表はあるが、この人の行が無い。**無料。**
        return False

    row = rows[0]
    if row.get("status") not in ACTIVE_STATUSES:
        return False

    # 期限が切れていないか。**空なら切れていない扱い**
    # （解約待ちの行に期限が入らない経路があるため）
    expires = row.get("expires_at")
    if expires and expires < now_utc_iso():
        return False
    return True


def daily_limit(user_id):
    """その人の1日の上限。"""
    return PAID_DAILY_AI if is_paid(user_id) else FREE_DAILY_AI


# 断るときの一文。**ここが唯一の定義。**
#
# 2026-08-19 に1か所へまとめた。それまで `require_paid` と
# `main.py` の月次の振り返りに別々に書いてあり、**片方だけ直っていた。**
# 2026-08-18 の言葉の精査で `require_paid` の側は
# 「プランに含まれています」→「有料プランで見られます」に直したが、
# もう片方が古いまま残っていた。
#
# **煽らない。** 何がどちら側にあるかだけを言う。急かす言葉と
# 値引きの言葉は使わない（`tests/test_plan.py::Test断り方` が見張る）。
# ただし**断られたことは伝わること。**「含まれています」は
# 無料の人が読むと「使える」に読め、意味がほぼ反転していた。
PAID_REQUIRED_MESSAGE = "この分析は有料プランで見られます。"


def paid_required_response():
    """402 の応答。**経路の中で分ける場合もこれを使う。**

    週次と月次のように**同じ経路が無料と有料を兼ねている**ときは
    デコレータで分けられない。そのとき応答を手で組むと文面がずれる。
    """
    return jsonify({"error": "paid_required", "message": PAID_REQUIRED_MESSAGE}), 402


def require_paid(f):
    """有料プランの経路に付ける。**認証の後ろに置くこと**（`g.user_id` が要る）。

    断るときは 402。クライアントはこれを見てペイウォールを出す
    （404 や 403 と混ざらない番号を選んでいる）。
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        if not is_paid(g.user_id):
            return paid_required_response()
        return f(*args, **kwargs)
    return decorated
