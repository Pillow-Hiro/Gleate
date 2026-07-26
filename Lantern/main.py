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
    load_goals, save_goals_data,
    get_week_str, get_month_str, get_month_display_str, get_week_display_str,
    get_current_weekly_goal, get_current_monthly_goal,
    delete_log_by_date,
    load_daily_quote, save_daily_quote,
)
from modules.ai import (
    get_ai_response,
    get_weekly_review, get_monthly_review,
    call_claude_with_history,
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


@app.route("/goals/save", methods=["POST"])
@require_auth
def save_goal():
    data = request.json
    goals = load_goals()

    goal_type = data.get("type")
    if goal_type == "vision":
        goals["vision"] = data.get("vision", "")
    elif goal_type == "monthly":
        month = get_month_str()
        goals.setdefault("monthly_goals", [])
        goals["monthly_goals"] = [gl for gl in goals["monthly_goals"] if gl.get("month") != month]
        if data.get("goal", "").strip():
            goals["monthly_goals"].append({
                "month": month,
                "goal": data.get("goal", ""),
                "set_at": datetime.now().isoformat(),
            })
    elif goal_type == "weekly":
        week = get_week_str()
        goals.setdefault("weekly_goals", [])
        goals["weekly_goals"] = [gl for gl in goals["weekly_goals"] if gl.get("week") != week]
        if data.get("goal", "").strip():
            goals["weekly_goals"].append({
                "week": week,
                "goal": data.get("goal", ""),
                "set_at": datetime.now().isoformat(),
            })

    save_goals_data(goals)
    return jsonify({"status": "ok"})


@app.route("/goals/suggest", methods=["POST"])
@require_auth
def suggest_goal():
    data = request.json
    goal_type = data.get("type", "weekly")
    goals = load_goals()
    logs = load_logs(g.user_id)

    vision = goals.get("vision", "")
    monthly_goal = get_current_monthly_goal(goals)
    recent_logs = logs[-10:]

    logs_summary = ""
    for log in recent_logs[-5:]:
        logs_summary += f"\n- {log['date']}: {log.get('created', '')}"

    from modules.ai import call_claude
    if goal_type == "monthly":
        system_prompt = """あなたはLanternです。クリエイターの今月の目標を提案します。

月レベルの目標：方向性・テーマ・今月挑戦したいこと（30日スパン）。
ビジョンに向かって今月どんな実験や取り組みをするか、自然な1文で提案してください。
マークダウン記法・見出し・ラベル（「目標:」「理由:」など）・区切り線は一切使わない。
50文字以内。才能や価値を評価せず、流行への迎合を勧めず、最終決定はクリエイター本人に委ねる。"""
        user_message = f"""ビジョン: {vision if vision else '（未設定）'}
直近の活動:{logs_summary if logs_summary else '（記録なし）'}

今月（30日間）の目標を1文で提案してください。"""
    else:
        system_prompt = """あなたはLanternです。クリエイターの今週の目標を提案します。

週レベルの目標：今週できる具体的な行動（5〜7日スパン）。
今月の目標に向けて、今週何を試すか・作るか・続けるかを、自然な1文で提案してください。
マークダウン記法・見出し・ラベル（「目標:」「理由:」など）・区切り線は一切使わない。
50文字以内。才能や価値を評価せず、流行への迎合を勧めず、最終決定はクリエイター本人に委ねる。"""
        context = f"今月の目標: {monthly_goal}" if monthly_goal else ""
        user_message = f"""ビジョン: {vision if vision else '（未設定）'}
{context}
直近の活動:{logs_summary if logs_summary else '（記録なし）'}

今週（5〜7日間）の具体的な行動目標を1文で提案してください。"""

    result = call_claude(system_prompt, user_message, max_tokens=80)
    if result:
        return jsonify({"suggestion": result})

    fallback = "今月は、一つのことに集中してみてはどうでしょう。小さな完成体験が積み重なります。" if goal_type == "monthly" else "今週は、一つ試せることを実行してみましょう。小さく始めるほど続きやすいものです。"
    return jsonify({"suggestion": fallback})


@app.route("/goals/interview", methods=["POST"])
@require_auth
def goal_interview():
    data = request.json
    messages = data.get("messages", [])

    system_prompt = """あなたはLanternです。会話の流れを読みながら、クリエイターが自分のビジョンを言語化するのをサポートします。

【ヒアリングの原則】
- 会話履歴を必ず踏まえて、次の問いを自然に決める
- 最初は現在の活動・取り組みを聞く
- 次に将来の状態や、誰かに届いたときの気持ちを掘り下げる
- 3〜4往復の会話でビジョン文（「〜でありたい」「〜したい」形）を提案する
- ビジョンが固まったら、文末に【ビジョン:（提案文）】を付ける

各メッセージは短く（100文字以内）。押しつけず、相手の言葉を引き出す。決めるのは本人。"""

    if not messages:
        return jsonify({
            "response": "こんにちは。一緒にあなたのビジョンを言葉にしていきましょう。\n\n今、どんな活動に取り組んでいますか？",
            "step": 0,
        })

    if messages[0]["role"] == "assistant":
        messages = [{"role": "user", "content": "ビジョンヒアリングを始めてください"}] + messages

    result = call_claude_with_history(system_prompt, messages, max_tokens=200)
    if result:
        vision_match = re.search(r'【ビジョン[:：](.+?)】', result)
        vision = vision_match.group(1).strip() if vision_match else None
        return jsonify({"response": result, "vision": vision, "step": len(messages)})

    return jsonify({
        "response": "もう少し教えてください。あなたの取り組みについて、どんなことが好きですか？",
        "step": len(messages),
    })


@app.route("/api/debug/version")
def debug_version():
    return jsonify({"commit": "7890d9a", "youtube_redirect": os.environ.get("YOUTUBE_REDIRECT_URI", "未設定")})


@app.route("/api/debug/routes")
def list_routes():
    routes = []
    for rule in app.url_map.iter_rules():
        routes.append({
            "endpoint": rule.endpoint,
            "methods": sorted(rule.methods),
            "path": str(rule),
        })
    routes.sort(key=lambda r: r["path"])
    return jsonify(routes)


@app.route("/api/debug/youtube-token")
@require_auth
def debug_youtube_token():
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


@app.route("/api/debug/youtube-config")
def debug_youtube_config():
    from modules.youtube import REDIRECT_URI, YOUTUBE_CLIENT_ID
    return jsonify({
        "redirect_uri": REDIRECT_URI,
        "client_id_set": bool(YOUTUBE_CLIENT_ID)
    })


@app.route("/api/debug/review-test")
@require_auth
def review_test():
    from modules.logs import load_logs
    from datetime import datetime, timedelta

    end = datetime.now().date()
    start = end - timedelta(days=7)

    all_logs = load_logs(g.user_id)
    logs = [l for l in all_logs if str(start) <= l.get("date", "") <= str(end)]

    return jsonify({
        "user_id": g.user_id,
        "start": str(start),
        "end": str(end),
        "log_count": len(logs),
        "logs": logs,
    })


@app.route("/debug/db-test")
@require_auth
def db_test():
    from modules.logs import supabase
    try:
        result = supabase.table("logs").select("id, date, user_id").limit(3).execute()
        return jsonify({"status": "ok", "rows": result.data, "count": len(result.data or [])})
    except Exception as e:
        import traceback
        return jsonify({"status": "error", "error": str(e), "traceback": traceback.format_exc()}), 500


@app.route("/debug/insert-test")
@require_auth
def insert_test():
    from modules.logs import supabase, _to_db
    from datetime import datetime
    dummy = {
        "date": "1970-01-01",
        "created": "debug test",
        "enjoyable": "", "struggled": "", "next": "",
        "saved_at": datetime.now().isoformat(),
    }
    row = _to_db(dummy, g.user_id)
    try:
        supabase.table("logs").delete().eq("date", "1970-01-01").eq("user_id", g.user_id).execute()
        result = supabase.table("logs").insert(row).execute()
        supabase.table("logs").delete().eq("date", "1970-01-01").eq("user_id", g.user_id).execute()
        return jsonify({"status": "ok", "inserted": result.data})
    except Exception as e:
        import traceback
        return jsonify({"status": "error", "error": str(e), "traceback": traceback.format_exc()}), 500


@app.route("/api/logs", methods=["GET"])
@require_auth
def get_logs_api():
    logs = load_logs(g.user_id)
    return jsonify(logs)


@app.route("/api/vision", methods=["GET"])
@require_auth
def get_vision():
    goals = load_goals()
    return jsonify({"vision": goals.get("vision", "")})


@app.route("/api/vision", methods=["POST"])
@require_auth
def save_vision_api():
    data = request.json
    goals = load_goals()
    goals["vision"] = data.get("vision", "")
    save_goals_data(goals)
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


_FRONTEND_ORIGIN = "https://lantern-inky-three.vercel.app"


@app.route("/api/youtube/auth-url")
@require_auth
def youtube_auth_url():
    from modules.youtube import get_auth_url, YOUTUBE_CLIENT_ID, REDIRECT_URI
    print(f"[YouTube] REDIRECT_URI={REDIRECT_URI}")
    if not YOUTUBE_CLIENT_ID:
        return jsonify({"error": "YouTube API未設定"}), 503
    url = get_auth_url(g.user_id)
    print(f"[YouTube] auth_url先頭={url[:80]}")
    return jsonify({"url": url})


@app.route("/api/youtube/callback")
def youtube_callback():
    logger.info(f"[YouTube-CB] ALL ARGS: {dict(request.args)}")
    logger.info(f"[YouTube-CB] REQUEST URL: {request.url}")

    from modules.youtube import exchange_code_for_token, save_tokens
    error = request.args.get("error")
    code = request.args.get("code")
    user_id = request.args.get("state")

    logger.info(f"[YouTube-CB] error={error} code={bool(code)} user_id={user_id}")

    if error or not code or not user_id:
        logger.info(f"[YouTube-CB] guard failed: error={error} code={bool(code)} user_id={bool(user_id)}")
        return redirect(f"{_FRONTEND_ORIGIN}/dashboard?youtube=error")

    try:
        credentials = exchange_code_for_token(code, user_id)
        save_tokens(user_id, credentials)
        logger.info("[YouTube-CB] success -> connected")
        return redirect(f"{_FRONTEND_ORIGIN}/dashboard?youtube=connected")
    except Exception as e:
        logger.error(f"[YouTube-CB] FAILED: {type(e).__name__}: {e}")
        logger.error(traceback.format_exc())
        return redirect(f"{_FRONTEND_ORIGIN}/dashboard?youtube=error")


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


@app.route("/api/timeline-reflection")
@require_auth
def timeline_reflection():
    import calendar as _cal

    try:
        months_ago = int(request.args.get("months_ago", 1))
    except ValueError:
        months_ago = 1
    months_ago = max(1, min(months_ago, 6))

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


@app.route("/api/debug/static-check")
def static_check():
    index_path = os.path.join(STATIC_DIR, 'index.html')
    return jsonify({
        "static_dir": STATIC_DIR,
        "static_dir_exists": os.path.exists(STATIC_DIR),
        "index_html_exists": os.path.exists(index_path),
    })


@app.route("/api/youtube/channel-test")
def youtube_channel_test():
    """ステップ別診断エンドポイント（デバッグ用・後で削除）"""
    from modules.youtube import get_tokens, refresh_token_if_needed
    from googleapiclient.discovery import build
    import traceback
    import google.auth
    import google.auth._helpers as ghelpers

    user_id = "5efc736a-e32c-4904-af2e-98a6b9768032"

    utcnow_val = ghelpers.utcnow()
    result = {
        "google_auth_version": google.auth.__version__,
        "utcnow_aware": utcnow_val.tzinfo is not None,
        "utcnow_value": str(utcnow_val),
        "step1_tokens": False,
        "step2_creds": False,
        "creds_expiry": None,
        "creds_expiry_tzinfo": None,
        "step3_youtube_build": False,
        "step4_api_call": False,
        "error": None,
        "api_response": None,
    }

    try:
        tokens = get_tokens(user_id)
        result["step1_tokens"] = tokens is not None

        creds = refresh_token_if_needed(user_id)
        result["step2_creds"] = creds is not None

        if not creds:
            result["error"] = "creds is None"
            return jsonify(result)

        result["creds_expiry"] = str(creds.expiry)
        result["creds_expiry_tzinfo"] = str(creds.expiry.tzinfo) if creds.expiry else None

        # expiry を None にして google-auth の内部比較を完全にスキップするアプローチ
        creds.expiry = None

        youtube = build("youtube", "v3", credentials=creds, cache_discovery=False)
        result["step3_youtube_build"] = True

        response = youtube.channels().list(
            part="snippet,statistics",
            mine=True,
        ).execute()
        result["step4_api_call"] = True
        result["api_response"] = str(response)

    except Exception as e:
        result["error"] = f"{type(e).__name__}: {str(e)}"
        result["traceback"] = traceback.format_exc()

    return jsonify(result)


@app.route("/api/debug/serve-react-test")
def serve_react_test():
    """serve_reactが各パスをどう処理するかシミュレートする"""
    _BLOCKED = ('api/', 'debug/', 'goals/', 'save', 'static/')
    test_paths = [
        'api/youtube/channel',
        'api/youtube/videos',
        'api/youtube/analytics',
        'api/logs',
        'debug/db-test',
        'goals/save',
        'save',
        'today',
        'dashboard',
        'journal',
        '',
    ]
    results = {}
    for p in test_paths:
        blocked = (p == 'save') or any(p.startswith(prefix) for prefix in _BLOCKED)
        key = f'/{p}' if p else '/'
        results[key] = 'abort(404)' if blocked else 'serve index.html / static file'
    return jsonify(results)


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
