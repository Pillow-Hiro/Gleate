from flask import Flask, request, jsonify, send_from_directory
import os
import re
import time
import requests as http_req
from datetime import datetime, timedelta
from dotenv import load_dotenv

from modules.logs import (
    load_logs, save_logs,
    load_goals, save_goals_data,
    get_week_str, get_month_str, get_month_display_str, get_week_display_str,
    get_current_weekly_goal, get_current_monthly_goal,
)
from modules.ai import (
    get_ai_response,
    get_weekly_review, get_monthly_review,
    call_claude_with_history,
)
from modules.summary import get_weekly_summary, get_streak, get_recent_activity

load_dotenv()
app = Flask(__name__)

STATIC_DIR = os.path.join(os.path.dirname(__file__), 'static', 'dist')

_splash_photo_cache = {"photo_url": None, "photographer": None, "cached_at": 0}
_splash_access_count = 0



@app.route("/save", methods=["POST"])
def save():
    data = request.json
    logs = load_logs()
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
    save_logs(logs)

    ai_response = get_ai_response(entry, [l for l in logs if l.get("date") != today], goals)
    entry["ai_response"] = ai_response

    if existing is not None:
        logs[existing] = entry
    else:
        logs[-1] = entry
    save_logs(logs)

    return jsonify({"status": "ok", "ai_response": ai_response})



@app.route("/goals/save", methods=["POST"])
def save_goal():
    data = request.json
    goals = load_goals()

    goal_type = data.get("type")
    if goal_type == "vision":
        goals["vision"] = data.get("vision", "")
    elif goal_type == "monthly":
        month = get_month_str()
        goals.setdefault("monthly_goals", [])
        goals["monthly_goals"] = [g for g in goals["monthly_goals"] if g.get("month") != month]
        if data.get("goal", "").strip():
            goals["monthly_goals"].append({
                "month": month,
                "goal": data.get("goal", ""),
                "set_at": datetime.now().isoformat(),
            })
    elif goal_type == "weekly":
        week = get_week_str()
        goals.setdefault("weekly_goals", [])
        goals["weekly_goals"] = [g for g in goals["weekly_goals"] if g.get("week") != week]
        if data.get("goal", "").strip():
            goals["weekly_goals"].append({
                "week": week,
                "goal": data.get("goal", ""),
                "set_at": datetime.now().isoformat(),
            })

    save_goals_data(goals)
    return jsonify({"status": "ok"})


@app.route("/goals/suggest", methods=["POST"])
def suggest_goal():
    data = request.json
    goal_type = data.get("type", "weekly")
    goals = load_goals()
    logs = load_logs()

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

    # Anthropic APIはmessages[0]がuserである必要があるため補正
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


@app.route("/api/logs", methods=["GET"])
def get_logs_api():
    logs = load_logs()
    return jsonify(logs)


@app.route("/api/vision", methods=["GET"])
def get_vision():
    goals = load_goals()
    return jsonify({"vision": goals.get("vision", "")})


@app.route("/api/vision", methods=["POST"])
def save_vision_api():
    data = request.json
    goals = load_goals()
    goals["vision"] = data.get("vision", "")
    save_goals_data(goals)
    return jsonify({"status": "ok"})


@app.route("/api/logs/<date>", methods=["DELETE"])
def delete_log(date):
    logs = load_logs()
    logs = [l for l in logs if l.get("date") != date]
    save_logs(logs)
    return jsonify({"status": "ok"})



@app.route("/api/review/generate", methods=["POST"])
def generate_review():
    data = request.json
    review_type = data.get("type", "weekly")
    logs = load_logs()
    goals = load_goals()

    if review_type == "weekly":
        week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        period_logs = [l for l in logs if l.get("date", "") >= week_ago]
        review = get_weekly_review(period_logs, goals)
        period_label = "今週"
    else:
        month_start = datetime.now().strftime("%Y-%m-01")
        period_logs = [l for l in logs if l.get("date", "") >= month_start]
        review = get_monthly_review(period_logs, goals)
        period_label = "今月"

    return jsonify({"review": review, "log_count": len(period_logs), "period_label": period_label})



@app.route("/api/daily/quote")
def daily_quote():
    logs = load_logs()
    recent_logs = logs[-7:] if logs else None
    from modules.ai import get_daily_quote
    quote = get_daily_quote(recent_logs)
    return jsonify({"quote": quote})


@app.route("/api/splash/content")
def splash_content_api():
    global _splash_access_count
    _splash_access_count += 1
    quote_type = "zen" if _splash_access_count % 2 == 0 else "snoopy"

    # 写真は6時間キャッシュ（APIコスト削減）
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

    # 一言はリクエストごとに生成（奇数=スヌーピー風 / 偶数=禅語）
    from modules.ai import get_splash_quote
    quote = get_splash_quote(quote_type)
    print(f"[Splash] アクセス#{_splash_access_count} quote_type={quote_type}")

    return jsonify({
        "photo_url": _splash_photo_cache["photo_url"],
        "photographer": _splash_photo_cache["photographer"],
        "quote": quote,
        "quote_type": quote_type,
    })


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    file_path = os.path.join(STATIC_DIR, path)
    if path and os.path.isfile(file_path):
        return send_from_directory(STATIC_DIR, path)
    return send_from_directory(STATIC_DIR, 'index.html')


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
