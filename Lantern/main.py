from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, jsonify, g, redirect
from flask_cors import CORS
import os
import random
import re
import time
import traceback
import logging
import requests as http_req
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

from modules.logs import (
    load_logs, save_logs,
    load_goals,
    delete_log_by_date, set_favorite,
    delete_log_by_id, set_favorite_by_id,
    load_daily_quote, save_daily_quote,
)
from modules.ai import (
    get_ai_response,
    get_weekly_review, get_monthly_review,
    generate_channel_insight,
    generate_timeline_reflection,
    generate_milestone_reflection,
    generate_keyword_frequency,
    generate_hint, generate_hint_question,
    generate_deepen,
)
from modules.hintusage import has_free_left, record_use
from functools import wraps

from modules.auth import require_auth
from modules.ratelimit import check_and_count
from modules.plan import daily_limit, is_paid, paid_required_response, require_paid
from modules import applemusic
# 日付の判定は必ず timeutil を通す。datetime.now() は Render の UTC を返すため、
# JST 00:00〜09:00 の9時間だけ日付が1日ずれる。
from modules.timeutil import today_str, today_date, days_ago_str, now_utc_iso, review_windows

app = Flask(__name__)
CORS(app, origins=[
    # **自前のドメイン**（2026-08-20）。API は api.golantern.app なので寄せた。
    'https://golantern.app',
    'https://www.golantern.app',
    # Vercel の自動名は、下の正規表現が既に含んでいる
    # （`lantern-inky-three.vercel.app` は `lantern-[a-z0-9-]+` に当たる）。
    # 明示していた行は 2026-08-20 に外した。**同じものを2回書かない。**
    #
    # **切り替えが済んだら、下の正規表現ごと外すこと。**
    # `lantern-` で始まる vercel.app は誰でも作れるので、
    # 自前のドメインに移った後まで残す理由が無い。
    #
    # **前後を留める**（2026-08-15）。
    # `re.compile(r'https://lantern-.*\.vercel\.app')` は後ろが開いており、
    # flask-cors は `re.match`（先頭一致）で見るため
    # `https://lantern-x.vercel.app.attacker.example` まで通っていた。
    # `.*` も広すぎる（`lantern-` で始まる vercel.app は誰でも作れる）。
    re.compile(r'^https://lantern-[a-z0-9-]+\.vercel\.app$'),
    # Expo Web の開発サーバー（React Nativeのネイティブfetchはブラウザではないため
    # CORSの対象外だが、Expo Web はブラウザ実行なので許可が必要）
    #
    # http://localhost:5173 は 2026-08-06 に外した。
    # Vite の開発サーバーのポートで、frontend/ を廃止した 2026-08-04 以降
    # 存在しない。使われない許可を残さない。
    'http://localhost:8081',
])

# 起動画面の写真。Unsplash の呼び出しを減らすためプロセス内に6時間持つ。
# ワーカーやインスタンスをまたいでは共有されないが、その場合でも
# 増えるのは「6時間あたりの取得回数がワーカー数まで」で、
# Unsplash の無料枠（50回/時）には十分収まる。共有ストアは持ち込まない。
# 受け取る本文の上限（2026-08-15）。
# **記録は文章だけ。** 写真も添付も端末の中に置くので、サーバーへは来ない。
# 上限が無いと、大きな本文を投げるだけでメモリを食わせられる。
app.config["MAX_CONTENT_LENGTH"] = 1 * 1024 * 1024


def spend_ai_budget(user_id):
    """AI を1回ぶん数える。上限を超えていれば False。

    **プランで上限が変わる**（`modules/plan.py`）。無料10回、有料60回。
    表が無い間は素通しする（`modules/ratelimit.py`）。

    デコレータと別に関数を置いているのは、**実際に AI を呼ぶ直前で
    数えたい経路がある**ため。今日の灯りと節目の振り返りは、
    キャッシュに当たれば AI を呼ばない。入口で数えると、
    画面を開き直すだけで枠が減る。
    """
    return check_and_count(user_id, daily_limit(user_id))


def _budget_exhausted():
    # 何回まで、とは書かない。**数を出すと、数を意識させる**
    #
    # 2026-08-16 まで「今日はここまでにしましょう」だった。
    # 「〜しましょう」は AI憲法 の禁止ワード（`tests/test_ui_words.py`）。
    # 画面の文言は検査しているのに、**サーバーが返す文言は誰も見ていなかった。**
    return jsonify({"error": "今日はここまでです。また明日。"}), 429


def require_ai_budget(f):
    """AI を呼ぶ経路にだけ付ける、1日あたりの上限。

    **認証の後ろに置くこと。** `g.user_id` が要る。
    呼べば必ず AI を使う経路にだけ付ける。
    途中で引き返す経路は `spend_ai_budget()` を直接呼ぶこと。
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        if not spend_ai_budget(g.user_id):
            return _budget_exhausted()
        return f(*args, **kwargs)
    return decorated



_splash_photo_cache = {"photo_url": None, "photographer": None, "cached_at": 0}


@app.route("/save", methods=["POST"])
@require_auth
def save():
    user_id = g.user_id
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid request body"}), 400

    logs = load_logs(user_id)
    goals = load_goals()
    today = data.get("date") or today_str()

    # **id があればその記録、無ければ日付で探す**（2026-09-02）。
    # 1日に複数件を置けるようにしたので、日付だけでは決まらない。
    # 送ってこないのは古いビルドで、そちらは1日1件のまま動く。
    wanted_id = data.get("id")
    if wanted_id:
        previous = next((l for l in logs if l.get("id") == wanted_id), None)
    elif data.get("new"):
        # **新しく作ると明示された。** 日付で探さない。
        #
        # これが無いと、`id` の無い保存が2つに見分けられない。
        # 「古いビルドがその日の記録を直している」のか、
        # 「新しいビルドが2件目を作っている」のか。
        # 前者は日付で見つけて上書き、後者は挿入でなければならない。
        previous = None
    else:
        previous = next((l for l in logs if l.get("date") == today), None)

    # **上限を超えて新しく作らせない**（2026-09-02）。
    # 書き換え（previous がある）は数に入らない。
    if not previous:
        same_day = [l for l in logs if l.get("date") == today]
        if len(same_day) >= MAX_RECORDS_PER_DAY:
            return jsonify({
                "error": "too_many",
                "message": "この日の記録はここまでです。",
            }), 409

    entry = {
        "id": (previous or {}).get("id", ""),
        "date": today,
        "created": data.get("created", ""),
        "enjoyable": data.get("enjoyable", ""),
        "struggled": data.get("struggled", ""),
        "next": data.get("next", ""),
        "saved_at": now_utc_iso(),
        # 既存の灯りをいったん引き継ぐ。空のまま書くと、この後の生成が失敗した
        # ときに元のメッセージが消える。
        "ai_response": (previous or {}).get("ai_response", ""),
    }

    # 本文を先に確定させる。AI生成が落ちても記録そのものは残す。
    # save_logs には対象の1日だけを渡すこと。全件を渡すと1行ずつ
    # SELECT + UPDATE するため、記録が増えるほど保存が遅くなり、
    # 100件あたりで Render の30秒制限を超えて保存できなくなる。
    try:
        # **書いた行の id を受け取る。** 新しい記録は DB が採番するので、
        # 返さないと画面が自分の id を知らず、次の保存で2件目が生まれる
        # **「新しく作る」を下まで伝える**（2026-09-03）。
        # ここで伝えないと `_upsert_one` が日付で探し直し、
        # 同じ日の既存を上書きする。実際に朝の記録が消えた。
        saved_ids = save_logs([entry], user_id, create=bool(data.get("new")) and not previous)
        entry["id"] = (saved_ids or [None])[0] or entry.get("id") or ""
    except Exception as e:
        print(f"[/save] DB error: {type(e).__name__}: {e}")
        print(traceback.format_exc())
        return jsonify({"error": f"保存に失敗しました: {e}"}), 500

    # **灯りを待たせない**（2026-08-23）。
    #
    # 作者から「Lanternの回答もすぐレスポンスを返してほしい」と報告。
    # 調べると、記録はもう保存されているのに、**AI の応答を待ってから
    # 返していた。**一番よく使う操作が、毎回 AI を待っていた。
    #
    # `defer_ai` を送ってきた画面には、保存できた時点で返す。
    # 灯りは画面が別に `/api/light` を叩いて受け取る。
    #
    # **古い画面のために既定は今までどおり。** 送ってこなければ待つ
    # （出回っているビルドが壊れない）。
    if data.get("defer_ai"):
        return jsonify({
            "status": "ok",
            "id": entry["id"],
            "ai_response": entry["ai_response"],
            "deferred": True,
        })

    # **枠が尽きても記録は残す**（2026-08-16）。
    #
    # 保存はもう終わっている。ここで 429 を返すと、画面には
    # 「保存に失敗した」と映る。**書くことは決して止めない。**
    # 灯りが付かないだけにする。
    #
    # ここで数えるのは、**保存のたびに AI を呼んでいる**ため。
    # 書き直すたびに1回使う。1日1回ではない
    # （無料の上限を10回にしてあるのはそのぶんの余裕）。
    if not spend_ai_budget(user_id):
        return jsonify({"status": "ok", "id": entry["id"], "ai_response": entry["ai_response"]})

    try:
        ai_response = get_ai_response(entry, [l for l in logs if l.get("date") != today], goals)
    except Exception as e:
        # 本文は保存済み。既存の灯りもそのまま残っている
        print(f"[/save] AI error: {type(e).__name__}: {e}")
        return jsonify({"status": "ok", "id": entry["id"], "ai_response": entry["ai_response"]})

    entry["ai_response"] = ai_response
    try:
        save_logs([entry], user_id)
    except Exception as e:
        print(f"[/save] DB error (ai_response update): {type(e).__name__}: {e}")

    return jsonify({"status": "ok", "id": entry["id"], "ai_response": ai_response})


@app.route("/api/light", methods=["POST"])
@require_auth
def make_light():
    """保存済みの記録に灯りをともす。**`/save` から切り離した経路。**

    記録を残すことと、灯りが付くことは別の出来事にした。
    書いた人を待たせる理由が無い（`/save` の `defer_ai` を参照）。

    **記録が無ければ何もしない。** 先に `/save` が通っている前提。
    """
    data = request.get_json(silent=True) or {}
    date = data.get("date") or today_str()

    logs = load_logs(g.user_id)
    # id で引く。無ければ日付（古いビルド・1日1件のまま）
    wanted_id = data.get("id")
    if wanted_id:
        entry = next((l for l in logs if l.get("id") == wanted_id), None)
    else:
        entry = next((l for l in logs if l.get("date") == date), None)
    if not entry:
        return jsonify({"error": "not_found"}), 404

    # **枠が尽きても記録は残っている。**灯りが付かないだけ。
    #
    # **なぜ来ないのかを言う**（2026-09-04・作者から「Lanternの回答が
    # 表示されない。回数制限がある？」）。
    #
    # それまでは空の `ai_response` を返すだけだった。画面は何も出さず、
    # **待っていれば来るのか、もう来ないのかが分からなかった。**
    # 灯りは十数秒かかるので、来ないことと遅いことが見分けられない。
    #
    # 古い画面は知らない鍵を読まないので、そのまま動く。
    if not spend_ai_budget(g.user_id):
        return jsonify({
            "ai_response": entry.get("ai_response", ""),
            "reason": "budget",
            "limit": daily_limit(g.user_id),
        })

    try:
        ai_response = get_ai_response(
            entry, [l for l in logs if l.get("date") != date], load_goals()
        )
    except Exception as e:
        print(f"[/api/light] AI error: {type(e).__name__}: {e}")
        # 一度きりの失敗。**次に書けば来る**ので、上限とは別の言い方にする
        return jsonify({"ai_response": entry.get("ai_response", ""), "reason": "failed"})

    entry["ai_response"] = ai_response
    # **時刻を打ち直す**（2026-08-27）。
    #
    # `entry` は `load_logs` から来ているので `saved_at` を持っている。
    # `_to_db` はそれをそのまま `updated_at` に書き戻すため、
    # **灯りを保存しても更新時刻が動かなかった。**
    #
    # 控えは `updated_at` の差分で記録を取る（`client/lib/logsCache.js`）。
    # 動かない行は差分に現れない。**灯りが記録の一覧に載らなかった。**
    # 保存そのものは通っているので、開き直すまで気づけない。
    entry["saved_at"] = now_utc_iso()
    try:
        save_logs([entry], g.user_id)
    except Exception as e:
        print(f"[/api/light] DB error: {type(e).__name__}: {e}")

    return jsonify({"ai_response": ai_response})


@app.route("/api/hint", methods=["POST"])
@require_auth
@require_ai_budget
def make_hint():
    """手がかりを差し出す。**足りなければ、一つだけ問う。**

    2026-09-02 に足した。それまで AI にできるのは2つだけだった
    （並べる・変化を示す）。3つ目として**本人が過去に取った手を
    差し出す**を足した。出どころを本人の記録に限れば、
    「評価しない」と衝突しない（`modules/ai.py` の手がかりの節）。

    ## 分岐はここで決める。**AI に判定させない**

    実データで確かめたところ、手がかりが成立したのは
    **「困ったこと」が書かれた日だけ**だった。だからそこを条件にする。
    安く、毎回同じ答えになる。

    | いまの記録の「困ったこと」 | 返すもの |
    |---|---|
    | 空 | `question` — 問いを一つ |
    | ある | `hint` — 手がかり（見つからないこともある） |

    問いへの答えは、クライアントが `/save` で「困ったこと」に入れる。
    **新しい経路も表も作らない。**

    ## 数える

    最初の `FREE_HINTS` 回は無料（`modules/plan.py`）。
    そのあとは有料プランで開く。**問いだけを返したときも数える**——
    数えないと、材料の無い人が何度でも AI を呼べる。
    """
    data = request.get_json(silent=True) or {}
    date = data.get("date") or today_str()

    logs = load_logs(g.user_id)
    # id で引く。無ければ日付（古いビルド・1日1件のまま）
    wanted_id = data.get("id")
    if wanted_id:
        entry = next((l for l in logs if l.get("id") == wanted_id), None)
    else:
        entry = next((l for l in logs if l.get("date") == date), None)
    if not entry:
        return jsonify({"error": "not_found"}), 404

    # **無料の枠か、有料か。** どちらでもなければ断る
    if not has_free_left(g.user_id) and not is_paid(g.user_id):
        return paid_required_response()

    if not spend_ai_budget(g.user_id):
        return _budget_exhausted()

    try:
        if not (entry.get("struggled") or "").strip():
            body = {"kind": "question", "text": generate_hint_question(entry)}
        else:
            past = [l for l in logs if l.get("date") != date]
            body = {"kind": "hint", "text": generate_hint(entry, past)}
    except Exception as e:
        print(f"[/api/hint] AI error: {type(e).__name__}: {e}")
        return jsonify({"error": "failed"}), 502

    record_use(g.user_id)
    return jsonify(body)


# --- 診断用エンドポイント ---
# デバッグ経路は本番の攻撃面になるため、以下の2つ以外は削除した。
# 追加するときは必ず @require_auth を付け、g.user_id で対象を絞ること。
# 特に service_role キーを使う Supabase クエリは user_id で必ずフィルタする
# （フィルタ漏れは他ユーザーのデータ漏洩に直結する）。

@app.route("/api/debug/version")
def debug_version():
    # 認証なしで残している。デプロイ後の稼働バージョン確認を curl 一発でやるため。
    # 返すのは commit / branch / OAuth のリダイレクトURI のみで、いずれも機密ではない
    # （リダイレクトURIは OAuth 中にユーザーのブラウザから見える値）。
    # コミットはハードコードしない。以前は固定文字列を返していたため、
    # 何をデプロイしても同じ値が返り、稼働バージョンの判定を誤らせた。
    # RENDER_GIT_COMMIT は Render が自動で設定する。ローカルでは未設定になる。
    # リダイレクトURIは環境変数の生値ではなく、モジュールが実際に使う解決後の値を返す。
    # 生値だと「未設定」としか分からず、何処へリダイレクトするのかが見えない。
    #
    # YOUTUBE_REDIRECT_URI / TWITCH_REDIRECT_URI はどちらも既定値がローカルを指す。
    # 本番で設定を忘れると localhost へリダイレクトしようとして壊れるが、
    # ローカルでは動くため気づけない。デプロイ後にここで見つけられるようにする。
    from modules.youtube import REDIRECT_URI as youtube_redirect
    from modules.twitch import REDIRECT_URI as twitch_redirect

    on_render = bool(os.environ.get("RENDER_GIT_COMMIT"))
    misconfigured = [
        name
        for name, uri in (("youtube", youtube_redirect), ("twitch", twitch_redirect))
        if "localhost" in uri
    ]

    # Apple Music の鍵が読めるか（2026-09-05）。
    #
    # **値は出さない。** 出すのは「署名できたか」だけ。
    # `/api/apple-music/token` は認証を要るので、curl 一発では
    # 401 しか返らず、**鍵が入っているのかどうかが分からなかった。**
    #
    # 実際に署名させて確かめる。鍵が壊れていれば `None` が返る——
    # 「変数はあるが PEM が読めない」を、ここで見分けられる。
    # **Apple に出して確かめる**（2026-09-05）。署名が通ることと、
    # Apple が受け付けることは別——鍵が MusicKit 用でない、Media ID が
    # 紐付いていない、どちらでも JWT は作れてしまう。
    #
    # 叩くのは**画面と同じ道**（検索）。**国が引けても検索が引けるとは
    # 限らない。**確かめたい方を叩く。送るのは決め打ちの1語で、
    # **利用者の言葉ではない。**結果は10分覚える
    apple_music = applemusic.verify()

    return jsonify({
        "commit": os.environ.get("RENDER_GIT_COMMIT", "unknown")[:7],
        "branch": os.environ.get("RENDER_GIT_BRANCH", "unknown"),
        "youtube_redirect": youtube_redirect,
        "twitch_redirect": twitch_redirect,
        # ok … 検索が返る / empty … 受け付けられたが曲が0件
        # rejected … 鍵は作れたが Apple が認めていない
        # bad_key … 変数はあるが PEM が読めない / unset … 変数が足りない
        "apple_music": apple_music,
        # 本番なのに localhost を指しているものがあれば設定漏れ
        "redirect_misconfigured": misconfigured if on_render else [],
    })


@app.route("/api/plan")
@require_auth
def plan_api():
    """いま無料か有料か。**画面がペイウォールを出すかどうかの判断に使う。**

    ここを信じて機能を開けているわけではない。
    実際の判定は各経路の `@require_paid` が持つ。
    ここが嘘をついても、有料の経路は 402 を返す。
    """
    paid = is_paid(g.user_id)
    return jsonify({
        "paid": paid,
        # 上限も返す。画面には出さないが、問い合わせのときに要る
        "daily_ai_limit": daily_limit(g.user_id),
    })


@app.route("/api/billing/revenuecat", methods=["POST"])
def revenuecat_webhook():
    """RevenueCat からの知らせ。**利用者の認証は通らない。**

    サーバー同士の経路なので `Authorization` ヘッダの合わせだけで守る
    （`modules/billing.py`）。合わなければ 401、
    設定されていなければ**受け口ごと閉じる**（503）。
    """
    from modules.billing import apply_event, authorized, secret

    if not secret():
        # 既定値を持たせない。設定を忘れたまま誰でも書ける口を開けない
        print("[Billing] REVENUECAT_WEBHOOK_SECRET が未設定。受け口を閉じている")
        return jsonify({"error": "not_configured"}), 503

    if not authorized(request.headers.get("Authorization", "")):
        return jsonify({"error": "unauthorized"}), 401

    ok, detail = apply_event(request.get_json(silent=True))
    if not ok:
        # 2xx 以外を返すと RevenueCat が再送する。**握りつぶさない**
        return jsonify({"error": detail}), 500
    return jsonify({"status": "ok", "detail": detail})


# 1回で返す上限。**要求された数がこれを超えたら断る。**
#
# 黙って切り詰めると、受け取った側は全部届いたと思う。
# 足りないことに気づく場所が無くなる。
MAX_LOGS_LIMIT = 500

# 1日に置ける記録の数。**上限を持つ**（2026-09-02・作者の判断）。
#
# それまで1日1件だった（`REQUIREMENTS.md` の「やらないこと」）。
# 朝と夜で別のことを書きたい、という理由で開けた。
#
# **無制限にはしない。** 数を絞らないと、記録アプリではなく
# 作業ログに寄っていく。朝・昼・夜で3件あれば足りる。
#
# 上限は画面に出さない。**残り何件と出すと、書く前に数を意識させる。**
MAX_RECORDS_PER_DAY = 3


@app.route("/api/logs", methods=["GET"])
@require_auth
def get_logs_api():
    """記録の一覧。

    写真はサーバーに無い（2026-08-06〜）。端末の中だけに置いている。
    クライアントが `lib/photoStore.js` でここに合流させる。

    ## 区切り（2026-08-27）

    **引数が無ければ全件。** 出回っているビルドはこの形で呼ぶ。

    - `?since=<ISO8601>` … その時刻より後に更新された記録だけ
    - `?limit=<1..500>`  … 新しい方から N 件

    `since` は控えを持つクライアントのためにある
    （`client/lib/logsCache.js`）。手元の最終更新時刻を送り、
    **変わったものだけ受け取る。** 記録が積み上がっても、
    毎回の通信は「前回から書いた分」で頭打ちになる。

    **消された記録は差分に現れない。** 控える側が、ときどき
    全件を取り直すこと。
    """
    since = request.args.get("since") or None

    limit = request.args.get("limit")
    if limit is not None:
        try:
            limit = int(limit)
        except ValueError:
            return jsonify({"error": "invalid_limit"}), 400
        if limit < 1 or limit > MAX_LOGS_LIMIT:
            return jsonify({"error": "invalid_limit", "max": MAX_LOGS_LIMIT}), 400

    return jsonify(load_logs(g.user_id, since=since, limit=limit))


@app.route("/api/account", methods=["DELETE"])
@require_auth
def delete_account_api():
    """記録を消してから認証の利用者を消す。

    App Store のガイドライン 5.1.1(v) が、アカウントを作れるアプリに
    アプリ内からの削除を求めている。無効化では足りない。

    確認の手順は画面側が持つ。ここに来た時点で実行する。
    """
    from modules.account import delete_account

    ok, detail = delete_account(g.user_id)
    if not ok:
        print(f"[Account] 削除が途中で失敗: {detail['failed']}")
        return jsonify({"error": "削除の途中で失敗しました。もう一度お試しください。"}), 500
    return jsonify({"status": "ok"})


@app.route("/api/logs/<date>/favorite", methods=["PUT"])
@require_auth
def set_log_favorite(date):
    """お気に入りの付け外し。

    **記録の保存とは別の道にしている。** 一緒にすると、
    記録を編集するたびにお気に入りが外れる（フォームは送らないため）。

    件数は返さない。「◯件お気に入り」は多い/少ないの評価になる。
    """
    data = request.get_json(silent=True) or {}
    favorite = bool(data.get("favorite"))
    try:
        set_favorite(date, favorite, g.user_id)
    except Exception as e:
        # 日付は残す。中身は残さない（記録の本文が混ざらない）
        print(f"[PUT /api/logs/{date}/favorite] DB error: {type(e).__name__}")
        return jsonify({"error": "変更に失敗しました。"}), 500
    return jsonify({"status": "ok", "favorite": favorite})


@app.route("/api/logs/by-id/<log_id>/favorite", methods=["PUT"])
@require_auth
def set_log_favorite_by_id(log_id):
    """お気に入りの付け外し（id 版・2026-09-02）。

    **`by-id` を静的な段に挟んでいる。** `/api/logs/<date>/favorite` と
    段数が同じなので、無いと日付版に吸われる余地がある。
    """
    data = request.get_json(silent=True) or {}
    try:
        set_favorite_by_id(log_id, bool(data.get("favorite")), g.user_id)
    except Exception as e:
        print(f"[PUT /api/logs/by-id/../favorite] DB error: {type(e).__name__}: {e}")
        return jsonify({"error": "変更に失敗しました"}), 500
    return jsonify({"status": "ok"})


@app.route("/api/logs/by-id/<log_id>", methods=["DELETE"])
@require_auth
def delete_log_by_id_api(log_id):
    """1件だけ消す（id 版・2026-09-02）。

    **日付版は同じ日を全部消す。** 1日に複数件あると、
    片方を消したいときに両方消える。
    """
    try:
        delete_log_by_id(log_id, g.user_id)
    except Exception as e:
        print(f"[DELETE /api/logs/by-id/..] DB error: {type(e).__name__}: {e}")
        return jsonify({"error": "削除に失敗しました"}), 500
    return jsonify({"status": "ok"})


@app.route("/api/logs/<date>", methods=["DELETE"])
@require_auth
def delete_log(date):
    try:
        delete_log_by_date(date, g.user_id)
    except Exception as e:
        print(f"[DELETE /api/logs/{date}] DB error: {type(e).__name__}: {e}")
        return jsonify({"error": f"削除に失敗しました: {e}"}), 500
    return jsonify({"status": "ok"})


# --- Twitch 連携 ---
# YouTube と同じ認可コードフロー。ただし PKCE は使わない（Twitch が非対応）。
# 過去配信は一定期間で消えるため、取得できたときに twitch_streams へ保存する。

@app.route("/api/twitch/auth-url")
@require_auth
def twitch_auth_url():
    from modules.twitch import get_auth_url, TWITCH_CLIENT_ID
    if not TWITCH_CLIENT_ID:
        return jsonify({"error": "TWITCH_CLIENT_ID が未設定です"}), 500
    platform = request.args.get("platform", "web")
    return jsonify({"url": get_auth_url(g.user_id, platform)})


@app.route("/api/twitch/callback")
def twitch_callback():
    # 認証なしで残している唯一のTwitchルート。Twitchからのリダイレクト先のため。
    # 本人性は state に載せた user_id で確認する。
    from modules.twitch import (
        exchange_code_for_token, save_tokens, parse_state, get_current_user,
    )

    error = request.args.get("error")
    code = request.args.get("code")
    user_id, platform = parse_state(request.args.get("state"))
    logger.info(f"[Twitch-CB] error={error} code={bool(code)} user_id={bool(user_id)} platform={platform}")

    if error or not code or not user_id:
        return redirect(_twitch_redirect_target(platform, "error"))

    try:
        token_response = exchange_code_for_token(code)
        me = get_current_user(token_response.get("access_token"))
        save_tokens(
            user_id, token_response,
            broadcaster_id=(me or {}).get("id"),
            display_name=(me or {}).get("display_name"),
        )
        logger.info(f"[Twitch-CB] success (platform={platform})")
        return redirect(_twitch_redirect_target(platform, "connected"))
    except Exception as e:
        logger.error(f"[Twitch-CB] FAILED: {type(e).__name__}: {e}")
        logger.error(traceback.format_exc())
        return redirect(_twitch_redirect_target(platform, "error"))


@app.route("/api/twitch/status")
@require_auth
def twitch_status():
    from modules.twitch import get_tokens
    row = get_tokens(g.user_id)
    if not row:
        return jsonify({"connected": False, "display_name": None})
    return jsonify({"connected": True, "display_name": row.get("display_name")})


@app.route("/api/twitch/disconnect", methods=["DELETE"])
@require_auth
def twitch_disconnect():
    # 保存済みの配信は消さない。VODが消えても Lantern には残る、という設計のため
    from modules.twitch import delete_tokens
    delete_tokens(g.user_id)
    return jsonify({"message": "disconnected"})


@app.route("/api/twitch/streams")
@require_auth
def twitch_streams():
    """保存済みの配信を返す。あわせて Twitch から取得して保存する。

    取得に失敗しても保存済みのものは返す。VODが消えた後でも
    これまでの記録が見えなくならないようにするため。
    """
    from modules.twitch import (
        attach_thumbnails,
        get_live_stream,
        get_valid_access_token,
        get_videos,
        load_streams,
        save_streams,
    )

    access_token, broadcaster_id = get_valid_access_token(g.user_id)
    videos = []
    live = None
    if access_token and broadcaster_id:
        try:
            videos = get_videos(access_token, broadcaster_id)
            save_streams(g.user_id, videos)
        except Exception as e:
            # 取り逃した件数は画面に出さない（離脱期間を評価しない原則）
            print(f"[Twitch] 配信の取得に失敗: {type(e).__name__}: {e}")
        try:
            # **同時接続数は配信中にしか取れない。** 過去には遡れない
            live = get_live_stream(access_token, broadcaster_id)
        except Exception as e:
            print(f"[Twitch] 配信中かどうかの取得に失敗: {type(e).__name__}: {e}")

    # サムネイルは**いま取れたぶんだけ**重ねる（保存はしない）
    streams = attach_thumbnails(load_streams(g.user_id), videos)
    return jsonify({"streams": streams, "live": live})


@app.route("/api/twitch/channel")
@require_auth
def twitch_channel():
    from modules.twitch import get_valid_access_token, get_follower_count, get_tokens

    row = get_tokens(g.user_id)
    if not row:
        return jsonify({"connected": False}), 404

    access_token, broadcaster_id = get_valid_access_token(g.user_id)
    followers = None
    if access_token and broadcaster_id:
        try:
            followers = get_follower_count(access_token, broadcaster_id)
        except Exception as e:
            print(f"[Twitch] フォロワー数の取得に失敗: {type(e).__name__}: {e}")

    return jsonify({
        "connected": True,
        "display_name": row.get("display_name"),
        "follower_count": followers,
    })


@app.route("/api/twitch/stream-insight", methods=["POST"])
@require_auth
@require_paid
@require_ai_budget
def twitch_stream_insight():
    """配信の傾向を観察する。数字で評価しないことは
    modules/ai.py の generate_stream_insight のプロンプトで担保している。"""
    from modules.ai import generate_stream_insight
    from modules.twitch import load_streams

    streams = load_streams(g.user_id)
    if not streams:
        return jsonify({"insight": ""})
    return jsonify({"insight": generate_stream_insight(streams)})


@app.route("/api/review/generate", methods=["POST"])
@require_auth
def generate_review():
    data = request.get_json(silent=True) or {}
    review_type = data.get("type", "weekly")

    # **今週は無料、月次は有料**（2026-08-16）。
    #
    # 同じ経路で2つを返しているので、デコレータでは分けられない。
    # 線は「今日と今週のことは無料。積み重ねを掘るのは有料」
    # （`modules/plan.py`）。月次はひと月ぶんを横断して読むので有料側。
    if review_type != "weekly" and not is_paid(g.user_id):
        return paid_required_response()

    # `@require_ai_budget` を外して、**断ったあとで数える**。
    # デコレータのままだと、月次を押して断られるたびに
    # 無料の枠が1つ減っていた
    if not spend_ai_budget(g.user_id):
        return _budget_exhausted()

    logs = load_logs(g.user_id)
    goals = load_goals()

    # **期間は `review_windows` の1か所で切る**（2026-09-14）。
    # ここで今週と先週を別の数え方で切っていて、月曜には先週がまるごと
    # 今週に入り、同じ記録が2回渡っていた
    (start, end), (prev_start, prev_end) = review_windows(review_type)
    period_logs = [l for l in logs if start <= l.get("date", "") <= end]
    previous_logs = [l for l in logs if prev_start <= l.get("date", "") <= prev_end] or None

    if review_type == "weekly":
        review_json = get_weekly_review(period_logs, goals, last_week_logs=previous_logs)
        period_label = "今週"
    else:
        review_json = get_monthly_review(period_logs, goals, last_month_logs=previous_logs)
        period_label = "今月"

    import json as _json
    try:
        parsed = _json.loads(review_json)
        patterns = parsed.get("patterns", [])
    except (_json.JSONDecodeError, AttributeError):
        patterns = []
    return jsonify({"patterns": patterns, "period_label": period_label})


# 深掘り（2026-09-13・作者との壁打ち）。**有料。**
#
# 振り返りの観察ひとつを、この3か月の記録に戻して深める。
# **語ではなく記録で読む**（`modules/deepen.py` の冒頭）。
#
# 受け取るのは観察の文と問いだけ。**日付や件数は受け取らない**——
# その人の記録から、ここで読み直す。画面から事実を送らせると作り替えられる。
#
# 読めなかったとき（待ちすぎ・形が崩れた）は 503。「見つからなかった」とは
# 分けて返す。**失敗を「同じ話が無い」に見せない。**
@app.route("/api/review/deepen", methods=["POST"])
@require_auth
@require_paid
@require_ai_budget
def deepen_review():
    from modules.deepen import DEEPEN_DAYS

    data = request.get_json(silent=True) or {}
    observation = str(data.get("observation") or "").strip()[:400]
    question = str(data.get("question") or "").strip()[:200] or None
    if not observation:
        return jsonify({"error": "observation が要る"}), 400

    since = days_ago_str(DEEPEN_DAYS)
    logs = [l for l in load_logs(g.user_id) if l.get("date", "") >= since]
    result = generate_deepen(observation, question, logs)
    if result is None:
        return jsonify({"error": "読めなかった"}), 503
    return jsonify(result)


@app.route("/api/daily/quote")
@require_auth
def daily_quote():
    today = today_str()

    cached = load_daily_quote(g.user_id, today)
    if cached:
        return jsonify({"quote": cached, "cached": True})

    # **キャッシュに当たった後で数える**（2026-08-16）。
    # 入口で数えると、画面を開き直すだけで枠が減る。
    # 尽きたときは何も出さない（灯りが無い日になるだけ）
    if not spend_ai_budget(g.user_id):
        return jsonify({"quote": None, "cached": False})

    logs = load_logs(g.user_id)
    yesterday = days_ago_str(1)
    yesterday_log = next((l for l in logs if l.get("date") == yesterday), None)

    from modules.ai import get_daily_quote
    quote, source = get_daily_quote(yesterday_log=yesterday_log)
    save_daily_quote(g.user_id, today, quote, source)
    return jsonify({"quote": quote, "cached": False})


# --- アイデアの溜め場 ---
# 「思いついた瞬間に置いて、後で拾うもの」。日付に紐づく記録とは別に持つ。
# 拾ったかどうかは picked_at で表す（done にすると未完了が負債に見える）。

@app.route("/api/ideas", methods=["GET"])
@require_auth
def get_ideas():
    from modules.ideas import load_ideas
    return jsonify({"ideas": load_ideas(g.user_id)})


@app.route("/api/ideas", methods=["POST"])
@require_auth
def create_idea():
    from modules.ideas import add_idea, load_ideas

    data = request.get_json(silent=True) or {}
    if not add_idea(g.user_id, data.get("text")):
        return jsonify({"error": "本文が空です"}), 400
    return jsonify({"ideas": load_ideas(g.user_id)})


@app.route("/api/ideas/<int:idea_id>", methods=["PATCH"])
@require_auth
def update_idea(idea_id):
    """拾ったかどうかを切り替える。"""
    from modules.ideas import set_picked

    data = request.get_json(silent=True) or {}
    set_picked(g.user_id, idea_id, bool(data.get("picked")))
    return jsonify({"status": "ok"})


@app.route("/api/ideas/<int:idea_id>", methods=["DELETE"])
@require_auth
def remove_idea(idea_id):
    from modules.ideas import delete_idea
    delete_idea(g.user_id, idea_id)
    return jsonify({"status": "ok"})


@app.route("/api/question")
@require_auth
def daily_question():
    """書き始める前に置く問い。

    AIは使わない。modules/questions の資産から日付で1つ選ぶだけなので、
    呼び出し費用はかからず、同じ日は何度開いても同じ問いになる。
    読み込むたびに変わると「選び直せるもの」に見えて書く手が止まる。
    """
    from modules.questions import pick_for_writing

    question = pick_for_writing(today_str())
    if not question:
        return jsonify({"question": None})
    return jsonify({
        "question": question["text"],
        "category": question["category"],
        "subcategory": question["subcategory"],
    })


@app.route("/api/splash/content")
def splash_content_api():
    # 以前はプロセス内のカウンタで zen と snoopy を交互に出していたが、
    # カウンタはワーカー間で共有されないため交互にならず、
    # 「数えている」ように見えて実際は数えていない状態だった。
    # 見せたいのは種類の変化であって順番ではないので、その都度選ぶ。
    quote_type = random.choice(("zen", "snoopy"))

    now = time.time()
    if now - _splash_photo_cache["cached_at"] > 21600:
        unsplash_key = os.environ.get("UNSPLASH_ACCESS_KEY", "")
        photo_url = ""
        photographer = ""
        if unsplash_key:
            try:
                r = http_req.get(
                    "https://api.unsplash.com/photos/random",
                    params={"query": "nature landscape", "orientation": "portrait", "content_filter": "high"},
                    headers={"Authorization": f"Client-ID {unsplash_key}"},
                    timeout=5,
                )
                if r.ok:
                    data = r.json()
                    photo_url = data["urls"]["regular"]
                    photographer = data["user"]["name"]
                    print(f"[Splash] Unsplash取得成功: {photo_url[:60]}...")
                else:
                    print(f"[Splash] Unsplash HTTPエラー: {r.status_code}")
            except Exception as e:
                print(f"[Splash] Unsplash error: {e}")
        else:
            print("[Splash] UNSPLASH_ACCESS_KEY未設定 - Picsumフォールバック使用")

        _splash_photo_cache.update({
            "photo_url": photo_url,
            "photographer": photographer,
            "cached_at": now,
        })

    from modules.ai import get_splash_quote
    quote = get_splash_quote(quote_type)
    print(f"[Splash] quote_type={quote_type}")

    return jsonify({
        "photo_url": _splash_photo_cache["photo_url"],
        "photographer": _splash_photo_cache["photographer"],
        "quote": quote,
        "quote_type": quote_type,
    })


_DEFAULT_FRONTEND_ORIGIN = "https://lantern-inky-three.vercel.app"


def _resolve_frontend_origin(raw):
    """OAuth 完了後にブラウザを戻す先を決める。

    ローカル開発では Expo Web（http://localhost:8081）を指すよう .env で上書きする。
    2026-08-04 に frontend/ を廃止するまでは Vite の 5173 だった。
    未設定なら本番の Vercel を使うため、Render 側は環境変数を足さなくてよい。
    末尾スラッシュを落とすのは、連結時に // にならないようにするため。
    """
    return (raw or _DEFAULT_FRONTEND_ORIGIN).rstrip("/")


_FRONTEND_ORIGIN = _resolve_frontend_origin(os.environ.get("FRONTEND_ORIGIN"))
# ネイティブアプリ（Expo）の復帰先。app.json の scheme と一致させること。
_APP_SCHEME_ORIGIN = "lantern://dashboard"


def _twitch_redirect_target(platform, status):
    """Twitch 連携完了後の戻り先。YouTube と同じ考え方でプラットフォームを分ける。"""
    if platform == "app":
        return f"{_APP_SCHEME_ORIGIN}?twitch={status}"
    return f"{_FRONTEND_ORIGIN}/dashboard?twitch={status}"


def _youtube_redirect_target(platform, status):
    """連携完了後の戻り先を返す。
    ネイティブアプリはブラウザから直接アプリへ戻す必要があるためスキームURLを使う。
    """
    if platform == "app":
        return f"{_APP_SCHEME_ORIGIN}?youtube={status}"
    return f"{_FRONTEND_ORIGIN}/dashboard?youtube={status}"


@app.route("/api/youtube/auth-url")
@require_auth
def youtube_auth_url():
    from modules.youtube import get_auth_url, YOUTUBE_CLIENT_ID, REDIRECT_URI
    print(f"[YouTube] REDIRECT_URI={REDIRECT_URI}")
    if not YOUTUBE_CLIENT_ID:
        return jsonify({"error": "YouTube API未設定"}), 503
    # 未指定なら従来通りWeb扱い。既存のWebフロントは変更不要。
    platform = "app" if request.args.get("platform") == "app" else "web"
    url = get_auth_url(g.user_id, platform)
    print(f"[YouTube] platform={platform} auth_url先頭={url[:80]}")
    return jsonify({"url": url})


@app.route("/api/youtube/callback")
def youtube_callback():
    # クエリと完全URLはログに出さない。
    # code は認可コードそのもので、state には user_id が入っている。
    # Render のログは保存されるため、そこに資格情報を書かない。
    # 切り分けに要るのは「来たか／どの経路か」だけ（下の行で出している）。

    from modules.youtube import exchange_code_for_token, save_tokens, parse_state
    error = request.args.get("error")
    code = request.args.get("code")
    user_id, platform = parse_state(request.args.get("state"))

    logger.info(f"[YouTube-CB] error={error} code={bool(code)} user_id={bool(user_id)} platform={platform}")

    if error or not code or not user_id:
        logger.info(f"[YouTube-CB] guard failed: error={error} code={bool(code)} user_id={bool(user_id)}")
        return redirect(_youtube_redirect_target(platform, "error"))

    try:
        credentials = exchange_code_for_token(code, user_id)
        save_tokens(user_id, credentials)
        logger.info(f"[YouTube-CB] success -> connected (platform={platform})")
        return redirect(_youtube_redirect_target(platform, "connected"))
    except Exception as e:
        logger.error(f"[YouTube-CB] FAILED: {type(e).__name__}: {e}")
        logger.error(traceback.format_exc())
        return redirect(_youtube_redirect_target(platform, "error"))


@app.route("/api/youtube/status")
@require_auth
def youtube_status():
    from modules.youtube import get_tokens
    row = get_tokens(g.user_id)
    if not row:
        return jsonify({"connected": False})
    return jsonify({
        "connected": True,
        "channel_name": row.get("channel_name"),
        "channel_id": row.get("channel_id"),
    })


@app.route("/api/youtube/disconnect", methods=["DELETE"])
@require_auth
def youtube_disconnect():
    from modules.youtube import delete_tokens
    delete_tokens(g.user_id)
    return jsonify({"message": "disconnected"})


@app.route("/api/youtube/channel")
@require_auth
def youtube_channel():
    from modules.youtube import get_channel_stats
    try:
        stats = get_channel_stats(g.user_id)
        if stats is None:
            print("[YouTube] youtube_channel: stats is None")
            return jsonify({"error": "チャンネル情報の取得に失敗しました"}), 500
        return jsonify(stats)
    except Exception as e:
        print(f"[YouTube] youtube_channel FAILED: {type(e).__name__}: {e}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@app.route("/api/youtube/videos")
@require_auth
def youtube_videos():
    from modules.youtube import get_recent_videos
    max_results = min(int(request.args.get("max_results", 10)), 50)
    videos = get_recent_videos(g.user_id, max_results=max_results)
    if videos is None:
        return jsonify({"error": "未連携またはトークン取得失敗"}), 404
    return jsonify({"videos": videos})


@app.route("/api/youtube/analytics")
@require_auth
def youtube_analytics():
    from modules.youtube import get_video_analytics
    try:
        days = min(int(request.args.get("days", 30)), 90)
    except ValueError:
        days = 28
    result = get_video_analytics(g.user_id, days=days)
    if result is None:
        return jsonify({"error": "未連携またはトークン取得失敗"}), 404
    return jsonify({"period_days": days, "videos": result})


@app.route("/api/youtube/video-insight", methods=["POST"])
@require_auth
@require_paid
@require_ai_budget
def youtube_video_insight():
    from modules.logs import load_logs
    from modules.ai import generate_video_insight
    from datetime import date, timedelta
    data = request.get_json(silent=True) or {}
    published_at = data.get("published_at")
    if not published_at:
        return jsonify({"error": "published_atが必要です"}), 400

    try:
        pub_date = date.fromisoformat(published_at)
    except ValueError:
        return jsonify({"error": "published_atの形式が不正です"}), 400

    video = {
        "title":       data.get("title", ""),
        "published_at": published_at,
        "view_count":  data.get("view_count", 0),
        "like_count":  data.get("like_count", 0),
    }

    # 投稿日 ±3日のログを取得
    window_start = (pub_date - timedelta(days=3)).isoformat()
    window_end   = (pub_date + timedelta(days=3)).isoformat()

    all_logs = load_logs(user_id=g.user_id)
    nearby = [
        l for l in all_logs
        if window_start <= l.get("date", "") <= window_end
    ]

    logs_text = ""
    for l in nearby:
        line = f"{l['date']}: {l.get('created', '')}"
        if l.get("enjoyable"):
            line += f"（楽しかったこと: {l['enjoyable']}）"
        if l.get("struggled"):
            line += f"（詰まったこと: {l['struggled']}）"
        logs_text += line + "\n"

    insight = generate_video_insight(video, logs_text.strip())
    return jsonify({"insight": insight})


@app.route("/api/youtube/channel-insight", methods=["POST"])
@require_auth
@require_paid
@require_ai_budget
def youtube_channel_insight():
    data = request.get_json(silent=True) or {}
    videos = data.get("videos", [])
    if not videos:
        return jsonify({"error": "動画データが必要です"}), 400
    insight = generate_channel_insight(videos)
    return jsonify({"insight": insight})


_MONTHS_AGO_MIN = 1
_MONTHS_AGO_MAX = 12


def _clamp_months_ago(raw):
    """クエリ文字列の months_ago を 1〜12 に収める。

    上限は Journal の振り返りタブが出す期間（1・3・6・12ヶ月前）の最大値に合わせている。
    数値として読めない値・未指定は 1 として扱い、例外にはしない。
    """
    try:
        months_ago = int(raw)
    except (TypeError, ValueError):
        return _MONTHS_AGO_MIN
    return max(_MONTHS_AGO_MIN, min(months_ago, _MONTHS_AGO_MAX))


@app.route("/api/timeline-reflection")
@require_auth
@require_paid
@require_ai_budget
def timeline_reflection():
    import calendar as _cal

    months_ago = _clamp_months_ago(request.args.get("months_ago"))

    today = today_date()

    # months_ago ヶ月前の日付を計算（月末日をはみ出す場合はその月の末日に丸める）
    past_month = today.month - months_ago
    past_year = today.year
    while past_month <= 0:
        past_month += 12
        past_year -= 1
    try:
        past_date = today.replace(year=past_year, month=past_month)
    except ValueError:
        last_day = _cal.monthrange(past_year, past_month)[1]
        past_date = today.replace(year=past_year, month=past_month, day=last_day)

    # past_date を含む週（月〜日）
    week_start = past_date - timedelta(days=past_date.weekday())
    week_end = week_start + timedelta(days=6)

    # 現在の直近7日
    current_start = today - timedelta(days=7)

    all_logs = load_logs(g.user_id)
    past_logs = [l for l in all_logs if week_start.isoformat() <= l.get("date", "") <= week_end.isoformat()]
    current_logs = [l for l in all_logs if current_start.isoformat() <= l.get("date", "") <= today.isoformat()]

    reflection = generate_timeline_reflection(past_logs, current_logs, months_ago) if past_logs else None

    return jsonify({
        "past_date": past_date.isoformat(),
        "past_week_start": week_start.isoformat(),
        "past_week_end": week_end.isoformat(),
        "past_logs": past_logs,
        "current_logs": current_logs,
        "reflection": reflection,
    })


_MILESTONES = [30, 90, 180]


def _get_milestone_hit(user_id):
    """節目判定のみ。AI生成は行わない。hit した場合は (hit_milestone, period_logs) を返す。"""
    all_logs = load_logs(user_id)
    if not all_logs:
        return None, None, 0

    first_date = min(l.get("date", "") for l in all_logs)
    try:
        first_dt = datetime.strptime(first_date, "%Y-%m-%d").date()
    except ValueError:
        return None, None, 0

    today = today_date()
    days_since_start = (today - first_dt).days

    for ms in _MILESTONES:
        if ms - 1 <= days_since_start <= ms + 1:
            period_logs = [l for l in all_logs if first_dt.isoformat() <= l.get("date", "") <= today.isoformat()]
            return ms, period_logs, days_since_start

    return None, None, days_since_start


@app.route("/api/milestone")
@require_auth
def milestone():
    """節目判定のみ返す。AI生成は /api/milestone/reflection で行う。"""
    hit_milestone, _, days_since_start = _get_milestone_hit(g.user_id)

    if hit_milestone is None:
        return jsonify({"has_milestone": False, "days": days_since_start})

    return jsonify({"has_milestone": True, "days": hit_milestone})


@app.route("/api/milestone/reflection")
@require_auth
def milestone_reflection():
    """節目の振り返りをAI生成して返す（フロントでキャッシュ済みの場合は呼ばない）。"""
    days_param = request.args.get("days", type=int)
    hit_milestone, period_logs, _ = _get_milestone_hit(g.user_id)

    if hit_milestone is None or hit_milestone != days_param:
        return jsonify({"reflection": None})

    # 節目に当たった回だけ数える（2026-08-16）。
    # 入口で数えると、節目でない日に開くたびに枠が減る
    if not spend_ai_budget(g.user_id):
        return jsonify({"reflection": None})

    reflection = generate_milestone_reflection(period_logs, hit_milestone)
    return jsonify({"reflection": reflection})


@app.route("/api/apple-music/token")
@require_auth
def apple_music_token():
    """MusicKit の開発者トークンを渡す（`modules/applemusic.py`）。

    **秘密鍵はここから出ない。** 署名だけをこちらで行い、
    出来上がったトークンを渡す。端末で署名させると、鍵を
    アプリに埋め込むことになり、配布物から取り出せる。

    **認証を要る側に置く。** 誰でも取れると、こちらの開発者名義で
    Apple Music の API を叩ける状態になる。

    鍵が入っていなければ 503。**画面は繋がっていないものとして扱う**
    ——出せない機能をボタンにしない、といつもの扱いに合わせる。
    """
    body = applemusic.token_response()
    if not body:
        return jsonify({"error": "not_configured"}), 503
    return jsonify(body)


@app.route("/api/apple-music/search")
@require_auth
def apple_music_search():
    """曲を探す（`modules/applemusic.py`）。

    **こちらで代わりに叩く。** 端末から直に叩かせると開発者トークンを
    配ることになる。配っても即座に危ないわけではないが、
    **出さずに済むなら出さない。**

    引き換えに、探した言葉がこのサーバーを通る。**残さない**——
    ログにも書かない（`applemusic.search` を参照）。

    取れなければ空の一覧。**探せないことでアプリを止めない。**
    """
    term = request.args.get("q", "")
    store = request.args.get("storefront", "jp")
    # 国は2文字だけ通す。**そのまま URL に混ぜるので、形を確かめる**
    if not re.fullmatch(r"[a-z]{2}", store or ""):
        store = "jp"
    return jsonify({"songs": applemusic.search(term, storefront=store)})


@app.route("/api/insights/keywords")
@require_auth
@require_paid
@require_ai_budget
def insights_keywords():
    """指定期間のログから頻出キーワードを抽出して返す。キャッシュはフロントエンドで管理。"""
    import calendar as _cal

    period = request.args.get("period", "1m")
    period_map = {"1m": 1, "3m": 3, "6m": 6}
    months = period_map.get(period)
    if months is None:
        return jsonify({"error": "invalid period"}), 400

    today = today_date()
    year = today.year
    month = today.month - months
    while month <= 0:
        month += 12
        year -= 1
    last_day = _cal.monthrange(year, month)[1]
    cutoff = datetime(year, month, min(today.day, last_day)).date()

    all_logs = load_logs(g.user_id)
    period_logs = [l for l in all_logs if l.get("date", "") >= cutoff.isoformat()]

    if not period_logs:
        return jsonify({"keywords": [], "period": period})

    logs_text = "\n".join(
        " ".join(filter(None, [
            l.get("created", ""),
            l.get("enjoyable", ""),
            l.get("struggled", ""),
            l.get("next", ""),
        ]))
        for l in period_logs
    )

    keywords = generate_keyword_frequency(logs_text)
    return jsonify({"keywords": keywords, "period": period})


if __name__ == "__main__":
    # **ここは開発用。本番はこの経路を通らない。**
    #
    # 2026-08-06 まで Procfile が `python main.py` だったため、
    # 本番でも Flask の開発サーバー（Werkzeug）が動いていた。
    # 応答ヘッダに `Server: Werkzeug/3.1.8 Python/3.14.3` が出ていて分かった。
    # Flask 自身が本番利用を警告している構成で、同時実行にも耐えない。
    #
    # 本番は Procfile の gunicorn が `main:app` を読み込む。
    # gunicorn は Unix 専用のため、Windows の開発ではこちらを使う。
    app.run(debug=False, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
