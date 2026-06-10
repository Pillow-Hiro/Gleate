from flask import Flask, render_template, request, jsonify
import json
import os
from datetime import datetime, timedelta
import anthropic
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
DATA_FILE = "data/logs.json"

def load_logs():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_logs(logs):
    os.makedirs("data", exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(logs, f, ensure_ascii=False, indent=2)

def get_ai_response(log_entry, past_logs):
    api_key = os.environ.get("ANTHROPIC_API_KEY")

    past_context = ""
    if past_logs:
        recent = past_logs[-5:]
        past_context = "\n\n【過去のログ（直近5件）】\n"
        for p in recent:
            past_context += f"- {p['date']}: {p.get('created','')}\n"

    system_prompt = """あなたはCreator Companionです。クリエイターの創作活動を支援するAI伴走者です。

【あなたの役割】
- 状況整理・振り返り支援・次の実験提案
- クリエイターの伴走者として寄り添う

【絶対に守ること】
- 人格・才能・夢の価値を評価しない
- 数字でクリエイターの価値を測らない
- 創作をやめるべきかどうか判断しない
- 流行への迎合を勧めない
- 最終決定は必ずクリエイター本人に委ねる
- 創作意欲を損なう発言をしない

【トーン】
- スヌーピーの言葉のような、温かく本質をついた言葉がけ
- 間違いは間違いと率直に伝える（人格ではなく行動・結果に向ける）
- 短く、具体的に、次の一歩がわかるように

【返答の構成】
1. 今日の活動への共感・気づき（2〜3文）
2. 課題や困りごとへの率直なコメント（あれば）
3. 次の実験・アクション提案（1つだけ）

200文字以内で返答してください。"""

    user_message = f"""今日の創作ログです。{past_context}

【今日のログ】
作ったもの・進捗: {log_entry.get('created', '（未記入）')}
楽しかったこと: {log_entry.get('enjoyable', '（未記入）')}
困ったこと: {log_entry.get('struggled', '（未記入）')}
次回やること: {log_entry.get('next', '（未記入）')}"""

    if not api_key:
        # APIキーがない場合のデモレスポンス
        enjoyed = log_entry.get('enjoyable', '')
        struggled = log_entry.get('struggled', '')
        next_action = log_entry.get('next', '')

        response = "今日も創作を続けたこと、それ自体が価値です。"
        if enjoyed:
            response += f"「{enjoyed}」という感覚、大切にしてください。"
        if struggled:
            response += f"\n困ったこと（{struggled}）は、次の実験のヒントです。"
        if next_action:
            response += f"\n次のステップ「{next_action}」、まず小さく試してみましょう。"
        else:
            response += "\n明日、一つだけ試したいことを決めてみてください。"
        return response

    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=300,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}]
    )
    return message.content[0].text

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

@app.route("/")
def index():
    logs = load_logs()
    today = datetime.now().strftime("%Y-%m-%d")
    today_log = next((l for l in logs if l.get("date") == today), None)
    weekly = get_weekly_summary(logs)
    return render_template("index.html", today_log=today_log, weekly=weekly, logs=logs[-7:])

@app.route("/save", methods=["POST"])
def save():
    data = request.json
    logs = load_logs()
    today = datetime.now().strftime("%Y-%m-%d")

    entry = {
        "date": today,
        "created": data.get("created", ""),
        "enjoyable": data.get("enjoyable", ""),
        "struggled": data.get("struggled", ""),
        "next": data.get("next", ""),
        "saved_at": datetime.now().isoformat()
    }

    # 今日のログがあれば上書き
    existing = next((i for i, l in enumerate(logs) if l.get("date") == today), None)
    if existing is not None:
        logs[existing] = entry
    else:
        logs.append(entry)

    save_logs(logs)

    ai_response = get_ai_response(entry, [l for l in logs if l.get("date") != today])
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

if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))