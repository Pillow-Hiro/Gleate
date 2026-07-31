from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, jsonify, send_from_directory, g, redirect, abort
from flask_cors import CORS
import os
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
    delete_log_by_date,
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
from modules.auth import require_auth

app = Flask(__name__)
CORS(app, origins=[
    'https://lantern-inky-three.vercel.app',
    re.compile(r'https://lantern-.*\.vercel\.app'),
    'http://localhost:5173',
    # Expo Web の開発サーバー（React Nativeのネイティブfetchはブラウザではないため
    # CORSの対象外だが、Expo Web はブラウザ実行なので許可が必要）
    'http://localhost:8081',
])

STATIC_DIR = os.path.join(os.path.dirname(__file__), 'static', 'dist')

_splash_photo_cache = {"photo_url": None, "photographer": None, "cached_at": 0}
_splash_access_count = 0


@app.route("/save", methods=["POST"])
@require_auth
def save():
    user_id = g.user_id
    data = request.json
    if not data:
        return jsonify({"error": "Invalid request body"}), 400

    logs = load_logs(user_id)
    goals = load_goals()
    today = data.get("date") or datetime.now().strftime("%Y-%m-%d")

    entry = {
        "date": today,
        "created": data.get("created", ""),
        "enjoyable": data.get("enjoyable", ""),
        "struggled": data.get("struggled", ""),
        "next": data.get("next", ""),
        "saved_at": datetime.now().isoformat(),
    }

    existing = next((i for i, l in enumerate(logs) if l.get("date") == today), None)
    if existing is not None:
        logs[existing] = entry
    else:
        logs.append(entry)

    try:
        save_logs(logs, user_id)
    except Exception as e:
        print(f"[/save] DB error: {type(e).__name__}: {e}")
        print(traceback.format_exc())
        return jsonify({"error": f"保存に失敗しました: {e}"}), 500

    ai_response = get_ai_response(entry, [l for l in logs if l.get("date") != today], goals)
    entry["ai_response"] = ai_response

    if existing is not None:
        logs[existing] = entry
    else:
        logs[-1] = entry

    try:
        save_logs(logs, user_id)
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
    return jsonify({
        "commit": os.environ.get("RENDER_GIT_COMMIT", "unknown")[:7],
        "branch": os.environ.get("RENDER_GIT_BRANCH", "unknown"),
        "youtube_redirect": os.environ.get("YOUTUBE_REDIRECT_URI", "未設定"),
    })


@app.route("/api/debug/youtube-token")
@require_auth
def debug_youtube_token():
    # 認証必須・g.user_id の範囲だけを返す。実機でのYouTube連携の切り分けに使う。
    from modules.youtube import get_tokens, refresh_token_if_needed, YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET
    row = get_tokens(g.user_id)
    if not row:
        return jsonify({"status": "no_tokens"})

    result = {
        "status": "found",
        "has_access_token": bool(row.get("access_token")),
        "has_refresh_token": bool(row.get("refresh_token")),
        "token_expiry": row.get("token_expiry"),
        "channel_name": row.get("channel_name"),
        "client_id_set": bool(YOUTUBE_CLIENT_ID),
        "client_secret_set": bool(YOUTUBE_CLIENT_SECRET),
    }

    # 実際にトークンリフレッシュ→API呼び出しを試みてエラーを記録
    try:
        creds = refresh_token_if_needed(g.user_id)
        if not creds:
            result["refresh_result"] = "returned_none"
        else:
            result["refresh_result"] = "ok"
            try:
                from modules.youtube import _build_client
                youtube = _build_client(creds)
                ch = youtube.channels().list(part="snippet", mine=True).execute()
                result["api_call"] = "ok"
                result["channel_items"] = len(ch.get("items", []))
            except Exception as api_e:
                result["api_call"] = f"error: {type(api_e).__name__}: {api_e}"
    except Exception as e:
        result["refresh_result"] = f"exception: {type(e).__name__}: {e}"

    return jsonify(result)


@app.route("/api/logs", methods=["GET"])
@require_auth
def get_logs_api():
    logs = load_logs(g.user_id)
    return jsonify(logs)


@app.route("/api/logs/<date>", methods=["DELETE"])
@require_auth
def delete_log(date):
    try:
        delete_log_by_date(date, g.user_id)
    except Exception as e:
        print(f"[DELETE /api/logs/{date}] DB error: {type(e).__name__}: {e}")
        return jsonify({"error": f"削除に失敗しました: {e}"}), 500
    return jsonify({"status": "ok"})


@app.route("/api/review/generate", methods=["POST"])
@require_auth
def generate_review():
    data = request.json
    review_type = data.get("type", "weekly")
    logs = load_logs(g.user_id)
    goals = load_goals()

    if review_type == "weekly":
        week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        period_logs = [l for l in logs if l.get("date", "") >= week_ago]
        today = datetime.now().date()
        this_monday = today - timedelta(days=today.weekday())
        last_monday = this_monday - timedelta(days=7)
        last_sunday = this_monday - timedelta(days=1)
        last_week_logs = [l for l in logs if last_monday.strftime("%Y-%m-%d") <= l.get("date", "") <= last_sunday.strftime("%Y-%m-%d")]
        review_json = get_weekly_review(period_logs, goals, last_week_logs=last_week_logs or None)
        period_label = "今週"
    else:
        month_start = datetime.now().strftime("%Y-%m-01")
        period_logs = [l for l in logs if l.get("date", "") >= month_start]
        today = datetime.now()
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
    today = datetime.now().strftime("%Y-%m-%d")

    cached = load_daily_quote(g.user_id, today)
    if cached:
        return jsonify({"quote": cached, "cached": True})

    logs = load_logs(g.user_id)
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    yesterday_log = next((l for l in logs if l.get("date") == yesterday), None)

    from modules.ai import get_daily_quote
    quote, source = get_daily_quote(yesterday_log=yesterday_log)
    save_daily_quote(g.user_id, today, quote, source)
    return jsonify({"quote": quote, "cached": False})


@app.route("/api/splash/content")
def splash_content_api():
    global _splash_access_count
    _splash_access_count += 1
    quote_type = "zen" if _splash_access_count % 2 == 0 else "snoopy"

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
    print(f"[Splash] アクセス#{_splash_access_count} quote_type={quote_type}")

    return jsonify({
        "photo_url": _splash_photo_cache["photo_url"],
        "photographer": _splash_photo_cache["photographer"],
        "quote": quote,
        "quote_type": quote_type,
    })


_DEFAULT_FRONTEND_ORIGIN = "https://lantern-inky-three.vercel.app"


def _resolve_frontend_origin(raw):
    """OAuth 完了後にブラウザを戻す先を決める。

    ローカル開発では Vite（http://localhost:5173）を指すよう .env で上書きする。
    未設定なら本番の Vercel を使うため、Render 側は環境変数を足さなくてよい。
    末尾スラッシュを落とすのは、連結時に // にならないようにするため。
    """
    return (raw or _DEFAULT_FRONTEND_ORIGIN).rstrip("/")


_FRONTEND_ORIGIN = _resolve_frontend_origin(os.environ.get("FRONTEND_ORIGIN"))
# ネイティブアプリ（Expo）の復帰先。app.json の scheme と一致させること。
_APP_SCHEME_ORIGIN = "lantern://dashboard"


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
    logger.info(f"[YouTube-CB] ALL ARGS: {dict(request.args)}")
    logger.info(f"[YouTube-CB] REQUEST URL: {request.url}")

    from modules.youtube import exchange_code_for_token, save_tokens, parse_state
    error = request.args.get("error")
    code = request.args.get("code")
    user_id, platform = parse_state(request.args.get("state"))

    logger.info(f"[YouTube-CB] error={error} code={bool(code)} user_id={user_id} platform={platform}")

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
            print(f"[YouTube] youtube_channel: stats is None for user_id={g.user_id}")
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
def timeline_reflection():
    import calendar as _cal

    months_ago = _clamp_months_ago(request.args.get("months_ago"))

    today = datetime.now().date()

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

    today = datetime.now().date()
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
def insights_keywords():
    """指定期間のログから頻出キーワードを抽出して返す。キャッシュはフロントエンドで管理。"""
    import calendar as _cal

    period = request.args.get("period", "1m")
    period_map = {"1m": 1, "3m": 3, "6m": 6}
    months = period_map.get(period)
    if months is None:
        return jsonify({"error": "invalid period"}), 400

    today = datetime.now().date()
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


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    # シンプルで確実なガード条件（url_map動的チェックより予測可能）
    _BLOCKED_PREFIXES = ('api/', 'debug/', 'goals/', 'save', 'static/')
    if path == 'save' or any(path.startswith(p) for p in _BLOCKED_PREFIXES):
        abort(404)

    index_path = os.path.join(STATIC_DIR, 'index.html')
    if not os.path.exists(index_path):
        abort(404)

    file_path = os.path.join(STATIC_DIR, path)
    if path and os.path.isfile(file_path):
        return send_from_directory(STATIC_DIR, path)
    return send_from_directory(STATIC_DIR, 'index.html')


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
