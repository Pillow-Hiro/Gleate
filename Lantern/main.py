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
    load_daily_quote, save_daily_quote,
)
from modules.ai import (
    get_ai_response,
    get_weekly_review, get_monthly_review,
    generate_channel_insight,
    generate_timeline_reflection,
    generate_milestone_reflection,
    generate_keyword_frequency,
)
from functools import wraps

from modules.auth import require_auth
from modules.ratelimit import check_and_count
# 日付の判定は必ず timeutil を通す。datetime.now() は Render の UTC を返すため、
# JST 00:00〜09:00 の9時間だけ日付が1日ずれる。
from modules.timeutil import today_str, today_date, days_ago_str, now_utc_iso

app = Flask(__name__)
CORS(app, origins=[
    'https://lantern-inky-three.vercel.app',
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

# 受け取る本文の上限（2026-08-15）。
# **記録は文章だけ。** 写真も添付も端末の中に置くので、サーバーへは来ない。
# 上限が無いと、大きな本文を投げるだけでメモリを食わせられる。
app.config["MAX_CONTENT_LENGTH"] = 1 * 1024 * 1024


def require_ai_budget(f):
    """AI を呼ぶ経路にだけ付ける、1日あたりの上限。

    **認証の後ろに置くこと。** `g.user_id` が要る。
    表が無い間は素通しする（`modules/ratelimit.py`）。
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        if not check_and_count(g.user_id):
            # 何回まで、とは書かない。**数を出すと、数を意識させる**
            return jsonify({"error": "今日はここまでにしましょう。また明日。"}), 429
        return f(*args, **kwargs)
    return decorated





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

    previous = next((l for l in logs if l.get("date") == today), None)

    entry = {
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
        save_logs([entry], user_id)
    except Exception as e:
        print(f"[/save] DB error: {type(e).__name__}: {e}")
        print(traceback.format_exc())
        return jsonify({"error": f"保存に失敗しました: {e}"}), 500

    try:
        ai_response = get_ai_response(entry, [l for l in logs if l.get("date") != today], goals)
    except Exception as e:
        # 本文は保存済み。既存の灯りもそのまま残っている
        print(f"[/save] AI error: {type(e).__name__}: {e}")
        return jsonify({"status": "ok", "ai_response": entry["ai_response"]})

    entry["ai_response"] = ai_response
    try:
        save_logs([entry], user_id)
    except Exception as e:
        print(f"[/save] DB error (ai_response update): {type(e).__name__}: {e}")

    return jsonify({"status": "ok", "ai_response": ai_response})


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

    return jsonify({
        "commit": os.environ.get("RENDER_GIT_COMMIT", "unknown")[:7],
        "branch": os.environ.get("RENDER_GIT_BRANCH", "unknown"),
        "youtube_redirect": youtube_redirect,
        "twitch_redirect": twitch_redirect,
        # 本番なのに localhost を指しているものがあれば設定漏れ
        "redirect_misconfigured": misconfigured if on_render else [],
    })


@app.route("/api/logs", methods=["GET"])
@require_auth
def get_logs_api():
    # 写真はサーバーに無い（2026-08-06〜）。端末の中だけに置いている。
    # クライアントが lib/photoStore.js でここに合流させる。
    return jsonify(load_logs(g.user_id))


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
@require_ai_budget
def generate_review():
    data = request.get_json(silent=True) or {}
    review_type = data.get("type", "weekly")
    logs = load_logs(g.user_id)
    goals = load_goals()

    if review_type == "weekly":
        week_ago = days_ago_str(7)
        period_logs = [l for l in logs if l.get("date", "") >= week_ago]
        today = today_date()
        this_monday = today - timedelta(days=today.weekday())
        last_monday = this_monday - timedelta(days=7)
        last_sunday = this_monday - timedelta(days=1)
        last_week_logs = [l for l in logs if last_monday.strftime("%Y-%m-%d") <= l.get("date", "") <= last_sunday.strftime("%Y-%m-%d")]
        review_json = get_weekly_review(period_logs, goals, last_week_logs=last_week_logs or None)
        period_label = "今週"
    else:
        month_start = today_date().strftime("%Y-%m-01")
        period_logs = [l for l in logs if l.get("date", "") >= month_start]
        today = today_date()
        last_month_end = today.replace(day=1) - timedelta(days=1)
        last_month_start = last_month_end.replace(day=1)
        last_month_logs = [l for l in logs if last_month_start.strftime("%Y-%m-%d") <= l.get("date", "") <= last_month_end.strftime("%Y-%m-%d")]
        review_json = get_monthly_review(period_logs, goals, last_month_logs=last_month_logs or None)
        period_label = "今月"

    import json as _json
    try:
        parsed = _json.loads(review_json)
        patterns = parsed.get("patterns", [])
    except (_json.JSONDecodeError, AttributeError):
        patterns = []
    return jsonify({"patterns": patterns, "period_label": period_label})


@app.route("/api/daily/quote")
@require_auth
def daily_quote():
    today = today_str()

    cached = load_daily_quote(g.user_id, today)
    if cached:
        return jsonify({"quote": cached, "cached": True})

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

    # **写真はもう返さない**（2026-08-16）。
    # 起動画面の地はアプリの中に持つことにした（`client/lib/splashImage.js`）。
    # 外から取っていた頃は、届くまで濃紺のままで写真が遅れて現れていた。
    # 使わない呼び出しを残すと、開くたびに Unsplash を叩き続ける。

    from modules.ai import get_splash_quote
    quote = get_splash_quote(quote_type)
    print(f"[Splash] quote_type={quote_type}")

    return jsonify({
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

    reflection = generate_milestone_reflection(period_logs, hit_milestone)
    return jsonify({"reflection": reflection})


@app.route("/api/insights/keywords")
@require_auth
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
