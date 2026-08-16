"""無料と有料の線。

## 線の引き方

**今日と今週のことは無料。積み重ねを掘るのは有料。**

1文で言えることを基準にしている。機能を数えて並べると、
どちらに入るかを毎回考えることになり、そのうち線がぼやける。

| | 何が入るか |
|---|---|
| 無料 | 記録・写真・アイデア・検索・**エクスポート**・記録のAI・今日の灯り・今週の発見 |
| 有料 | 月次の振り返り・過去との対話・頻出キーワード・YouTube / Twitch |

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
# 有料の 60 回は 2026-08-15 に置いた元の上限。
FREE_DAILY_AI = 10
PAID_DAILY_AI = 60


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
    if row.get("status") not in ("active", "trialing", "in_grace_period"):
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


def require_paid(f):
    """有料プランの経路に付ける。**認証の後ろに置くこと**（`g.user_id` が要る）。

    断るときは 402。クライアントはこれを見てペイウォールを出す
    （404 や 403 と混ざらない番号を選んでいる）。
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        if not is_paid(g.user_id):
            return jsonify({
                "error": "paid_required",
                # **煽らない。** 何がどちら側にあるかだけを言う。
                # 急かす言葉と値引きの言葉は使わない
                # （`tests/test_plan.py::Test断り方` が見張っている）
                "message": "この分析はプランに含まれています。",
            }), 402
        return f(*args, **kwargs)
    return decorated
