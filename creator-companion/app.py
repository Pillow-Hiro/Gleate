from flask import Flask, render_template, request, jsonify
import json
import os
import re
from datetime import datetime, timedelta
import anthropic
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
DATA_FILE = "data/logs.json"
GOALS_FILE = "data/goals.json"

def load_logs():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_logs(logs):
    os.makedirs("data", exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(logs, f, ensure_ascii=False, indent=2)

def load_goals():
    if not os.path.exists(GOALS_FILE):
        return {"vision": "", "monthly_goals": [], "weekly_goals": []}
    with open(GOALS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_goals_data(goals):
    os.makedirs("data", exist_ok=True)
    with open(GOALS_FILE, "w", encoding="utf-8") as f:
        json.dump(goals, f, ensure_ascii=False, indent=2)

def get_week_str():
    return datetime.now().strftime("%Y-W%W")

def get_month_str():
    return datetime.now().strftime("%Y-%m")

def get_current_weekly_goal(goals):
    week = get_week_str()
    for wg in reversed(goals.get("weekly_goals", [])):
        if wg.get("week") == week:
            return wg.get("goal", "")
    return ""

def get_current_monthly_goal(goals):
    month = get_month_str()
    for mg in reversed(goals.get("monthly_goals", [])):
        if mg.get("month") == month:
            return mg.get("goal", "")
    return ""

def call_claude(system_prompt, user_message, max_tokens=300):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}]
    )
    return message.content[0].text

def call_claude_with_history(system_prompt, messages, max_tokens=300):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=max_tokens,
        system=system_prompt,
        messages=messages
    )
    return message.content[0].text

def get_ai_response(log_entry, past_logs, goals=None):
    past_context = ""
    if past_logs:
        recent = past_logs[-5:]
        past_context = "\n\n【過去のログ（直近5件）】\n"
        for p in recent:
            past_context += f"- {p['date']}: {p.get('created','')}\n"

    goals_context = ""
    if goals:
        if goals.get("vision"):
            goals_context = f"\n\n【クリエイターの目標】\nビジョン: {goals['vision']}"
        monthly = get_current_monthly_goal(goals)
        weekly = get_current_weekly_goal(goals)
        if monthly:
            goals_context += f"\n今月の目標: {monthly}"
        if weekly:
            goals_context += f"\n今週の目標: {weekly}"

    system_prompt = """あなたはCreator Companionです。クリエイターの創作活動を支える、AI伴走者です。
評価者でも審査員でもなく、隣で一緒に歩む存在として言葉をかけてください。

【役割】
状況整理・振り返り支援・次の一歩の提案。決めるのはクリエイター本人。

【絶対に言ってはいけないこと（NGパターン）】
- 才能の有無を判断する（「才能があります」「才能がありません」など）
- 数字でクリエイターを評価する（「フォロワーが少ないので〜」など）
- 創作の継続を否定する（「やめた方がいいかもしれません」など）
- プレッシャーをかける（「もっと頑張れば〜」など）
- 流行コンテンツへの迎合を勧める
- 人格・内面を評価する（行動と結果のみに向ける）
- 「次の実験：」「アクション：」などのラベルや見出しを使う
- 創作意欲を損なう否定的な言葉を使う

【トーン】
温かく、本質をついた言葉がけ。スヌーピーの名言のような質感。
間違いは率直に伝える（ただし人格ではなく行動・結果に向ける）。

【返答の構成（全体200文字以内）】
1. 今日の活動への共感・気づき（2〜3文）
2. 課題や困りごとへの率直なコメント（あれば）
3. 次の一歩のアイデアを会話の流れに自然に溶け込ませる（ラベル・見出し不要）"""

    user_message = f"""今日の創作ログです。{past_context}{goals_context}

【今日のログ】
作ったもの・進捗: {log_entry.get('created', '（未記入）')}
楽しかったこと: {log_entry.get('enjoyable', '（未記入）')}
困ったこと: {log_entry.get('struggled', '（未記入）')}
次回やること: {log_entry.get('next', '（未記入）')}"""

    result = call_claude(system_prompt, user_message, max_tokens=300)
    if result:
        return result

    enjoyed = log_entry.get('enjoyable', '')
    struggled = log_entry.get('struggled', '')
    next_action = log_entry.get('next', '')
    response = "今日も創作を続けたこと、それ自体が価値です。"
    if enjoyed:
        response += f"「{enjoyed}」という感覚、大切にしてください。"
    if struggled:
        response += f"\n困ったこと（{struggled}）は、次の実験のヒントです。"
    if next_action:
        response += f"\n{next_action}、まず小さく試してみましょう。"
    else:
        response += "\n明日、一つだけ試したいことを決めてみてください。"
    return response

def get_weekly_review(period_logs, goals):
    if not period_logs:
        return "今週のログがまだありません。"

    logs_text = ""
    for log in period_logs:
        logs_text += f"\n{log['date']}: {log.get('created', '')}"
        if log.get('enjoyable'):
            logs_text += f"（楽しかったこと: {log['enjoyable']}）"
        if log.get('struggled'):
            logs_text += f"（困ったこと: {log['struggled']}）"

    vision = goals.get("vision", "")
    weekly_goal = get_current_weekly_goal(goals)

    system_prompt = """あなたはCreator Companionです。週次レビューを生成します。

【役割】
クリエイターが自分の活動を振り返り、強みと次の焦点を言語化できるよう支援する。

【絶対に守ること】
- 人格・才能を評価しない
- 数字で価値を測らない
- やめることを勧めない

今週の活動パターンへの気づき、学んだこと、来週の焦点を自然な文章で書く。
ラベルや箇条書きは使わず、伴走者が語りかけるような文体で。300文字以内。"""

    user_message = f"""今週の創作ログの週次レビューを生成してください。

ビジョン: {vision if vision else '（未設定）'}
今週の目標: {weekly_goal if weekly_goal else '（未設定）'}

今週のログ:{logs_text}"""

    result = call_claude(system_prompt, user_message, max_tokens=400)
    if result:
        return result

    return f"今週は{len(period_logs)}日間、創作を続けました。継続すること自体が大きな力です。来週も一歩ずつ進んでいきましょう。"

def get_monthly_review(period_logs, goals):
    if not period_logs:
        return "今月のログがまだありません。"

    logs_text = ""
    for log in period_logs:
        logs_text += f"\n{log['date']}: {log.get('created', '')}"
        if log.get('enjoyable'):
            logs_text += f"（楽しかったこと: {log['enjoyable']}）"
        if log.get('struggled'):
            logs_text += f"（困ったこと: {log['struggled']}）"

    vision = goals.get("vision", "")
    monthly_goal = get_current_monthly_goal(goals)

    system_prompt = """あなたはCreator Companionです。月次レビューを生成します。

【役割】
クリエイターが自分の強みと勝ち筋を言語化できるよう支援する。

【絶対に守ること】
- 人格・才能を評価しない
- 数字で価値を測らない
- やめることを勧めない

今月の活動から見えてきた強みや独自性、繰り返し現れたパターン、来月の焦点を自然な文章で。
ラベルや箇条書きは使わず、伴走者が語りかけるような文体で。400文字以内。"""

    user_message = f"""今月の創作ログの月次レビューを生成してください。

ビジョン: {vision if vision else '（未設定）'}
今月の目標: {monthly_goal if monthly_goal else '（未設定）'}

今月のログ:{logs_text}"""

    result = call_claude(system_prompt, user_message, max_tokens=500)
    if result:
        return result

    return f"今月は{len(period_logs)}日間の記録があります。続けてきた軌跡の中に、必ずあなただけの強みが見えてきます。"

def get_weekly_summary(logs):
    week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    recent = [l for l in logs if l.get("date", "") >= week_ago]
    if not recent:
        return None

    days = len(recent)
    enjoyed_list = [l.get("enjoyable", "") for l in recent if l.get("enjoyable")]
    struggled_list = [l.get("struggled", "") for l in recent if l.get("struggled")]

    return {
        "days": days,
        "enjoyed": enjoyed_list,
        "struggled": struggled_list,
        "logs": recent
    }

def get_streak(logs):
    if not logs:
        return 0
    logged_dates = set(l.get("date", "") for l in logs if l.get("date"))
    if not logged_dates:
        return 0
    today = datetime.now().date()
    today_str = today.strftime("%Y-%m-%d")
    start = today if today_str in logged_dates else today - timedelta(days=1)
    if start.strftime("%Y-%m-%d") not in logged_dates:
        return 0
    streak = 0
    check = start
    while check.strftime("%Y-%m-%d") in logged_dates:
        streak += 1
        check -= timedelta(days=1)
    return streak

def get_recent_activity(logs, days=7):
    logged_dates = set(l.get("date", "") for l in logs if l.get("date"))
    activity = []
    for i in range(days - 1, -1, -1):
        d = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        activity.append({"date": d, "logged": d in logged_dates, "is_today": i == 0})
    return activity

@app.route("/")
def index():
    logs = load_logs()
    goals = load_goals()
    today = datetime.now().strftime("%Y-%m-%d")
    today_log = next((l for l in logs if l.get("date") == today), None)
    weekly = get_weekly_summary(logs)
    streak = get_streak(logs)
    recent_activity = get_recent_activity(logs)
    return render_template("index.html", today_log=today_log, weekly=weekly, logs=logs[-7:],
                           goals=goals,
                           weekly_goal=get_current_weekly_goal(goals),
                           monthly_goal=get_current_monthly_goal(goals),
                           streak=streak,
                           recent_activity=recent_activity,
                           is_first_visit=len(logs) == 0)

@app.route("/save", methods=["POST"])
def save():
    data = request.json
    logs = load_logs()
    goals = load_goals()
    today = datetime.now().strftime("%Y-%m-%d")

    entry = {
        "date": today,
        "created": data.get("created", ""),
        "enjoyable": data.get("enjoyable", ""),
        "struggled": data.get("struggled", ""),
        "next": data.get("next", ""),
        "saved_at": datetime.now().isoformat()
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

@app.route("/logs")
def logs_page():
    logs = load_logs()
    return render_template("logs.html", logs=list(reversed(logs)))

@app.route("/goals")
def goals_page():
    goals = load_goals()
    return render_template("goals.html", goals=goals,
                           current_monthly=get_current_monthly_goal(goals),
                           current_weekly=get_current_weekly_goal(goals),
                           month_str=get_month_str(),
                           week_str=get_week_str())

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
                "set_at": datetime.now().isoformat()
            })
    elif goal_type == "weekly":
        week = get_week_str()
        goals.setdefault("weekly_goals", [])
        goals["weekly_goals"] = [g for g in goals["weekly_goals"] if g.get("week") != week]
        if data.get("goal", "").strip():
            goals["weekly_goals"].append({
                "week": week,
                "goal": data.get("goal", ""),
                "set_at": datetime.now().isoformat()
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

    period_label = "今週" if goal_type == "weekly" else "今月"
    context = f"今月の目標: {monthly_goal}" if (goal_type == "weekly" and monthly_goal) else ""

    system_prompt = f"""あなたはCreator Companionです。クリエイターの{period_label}の目標を提案します。

過去の活動から具体的で達成可能な目標を1文で提案し、理由を1文で添えてください。
才能や価値を評価せず、流行への迎合を勧めず、最終決定はクリエイター本人に委ねる。"""

    user_message = f"""ビジョン: {vision if vision else '（未設定）'}
{context}
直近の活動:{logs_summary if logs_summary else '（記録なし）'}

{period_label}の目標を提案してください。"""

    result = call_claude(system_prompt, user_message, max_tokens=150)
    if result:
        return jsonify({"suggestion": result})

    return jsonify({"suggestion": f"{period_label}、一つのことに集中してみてはどうでしょう。小さな完成体験が積み重なります。"})

@app.route("/goals/interview", methods=["POST"])
def goal_interview():
    data = request.json
    messages = data.get("messages", [])

    system_prompt = """あなたはCreator Companionです。クリエイターが自分のビジョン（大きな目標）を言語化するのをサポートします。

【ヒアリングの流れ】
会話の回数に応じて進めてください：
- 1回目: 「今、どんな創作活動をしていますか？」
- 2回目: 「それを続けて、1〜2年後どんな状態になっていたいですか？」
- 3回目: 「その活動が誰かに届いたとき、どんな気持ちになりますか？」
- 4回目以降: 答えをもとに「〜でありたい」「〜したい」という形のビジョン文を提案する

各メッセージは短く（100文字以内）。4回目以降はビジョン文の提案をして、確定したら文末に【ビジョン:（提案文）】を付ける。"""

    if not messages:
        return jsonify({
            "response": "こんにちは。一緒にあなたのビジョンを言葉にしていきましょう。\n\n今、どんな創作活動をしていますか？",
            "step": 0
        })

    result = call_claude_with_history(system_prompt, messages, max_tokens=200)
    if result:
        vision_match = re.search(r'【ビジョン[:：](.+?)】', result)
        vision = vision_match.group(1).strip() if vision_match else None
        return jsonify({"response": result, "vision": vision, "step": len(messages)})

    return jsonify({
        "response": "もう少し教えてください。あなたの創作活動について、どんなことが好きですか？",
        "step": len(messages)
    })

@app.route("/review")
def review_page():
    return render_template("review.html")

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

if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
