import os
import anthropic
from modules.logs import get_current_weekly_goal, get_current_monthly_goal


def call_claude(system_prompt, user_message, max_tokens=300):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
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
        messages=messages,
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

    enjoyed = log_entry.get("enjoyable", "")
    struggled = log_entry.get("struggled", "")
    next_action = log_entry.get("next", "")
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
        if log.get("enjoyable"):
            logs_text += f"（楽しかったこと: {log['enjoyable']}）"
        if log.get("struggled"):
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
        if log.get("enjoyable"):
            logs_text += f"（楽しかったこと: {log['enjoyable']}）"
        if log.get("struggled"):
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
