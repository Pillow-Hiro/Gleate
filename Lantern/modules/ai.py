import os
import time
import anthropic
from modules.logs import get_current_weekly_goal, get_current_monthly_goal

_TIMEOUT_SECONDS = 10
_TIMEOUT_MESSAGE = "AIの応答に時間がかかっています。少し待ってから再度お試しください。"


def call_claude(system_prompt, user_message, max_tokens=300):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    client = anthropic.Anthropic(api_key=api_key, timeout=_TIMEOUT_SECONDS)
    start = time.time()
    print(f"[AI] リクエスト開始: {time.strftime('%H:%M:%S')}")
    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
        print(f"[AI] リクエスト完了: {time.time() - start:.2f}秒")
        return message.content[0].text
    except anthropic.APITimeoutError:
        print(f"[AI] タイムアウト: {time.time() - start:.2f}秒経過")
        return _TIMEOUT_MESSAGE
    except Exception as e:
        print(f"[AI] エラー発生: {time.time() - start:.2f}秒, {e}")
        return None


def call_claude_with_history(system_prompt, messages, max_tokens=300):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    client = anthropic.Anthropic(api_key=api_key, timeout=_TIMEOUT_SECONDS)
    start = time.time()
    print(f"[AI] リクエスト開始: {time.strftime('%H:%M:%S')}")
    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=max_tokens,
            system=system_prompt,
            messages=messages,
        )
        print(f"[AI] リクエスト完了: {time.time() - start:.2f}秒")
        return message.content[0].text
    except anthropic.APITimeoutError:
        print(f"[AI] タイムアウト: {time.time() - start:.2f}秒経過")
        return _TIMEOUT_MESSAGE
    except Exception as e:
        print(f"[AI] エラー発生: {time.time() - start:.2f}秒, {e}")
        return None


_SPLASH_FALLBACKS_SNOOPY = [
    "小さな一歩が、大きな旅になる。",
    "続けることに、やがて意味が宿る。",
    "昨日より少しでも前へ、それで十分。",
    "迷いながら進む人が、一番遠くへ行く。",
    "今日も記録することが、すでに答えだ。",
]

_SPLASH_FALLBACKS_ZEN = [
    "動かずして、動くものを見よ。",
    "水は低きに流れ、人は高きを目指す。",
    "花は散るから美しい。",
    "風は見えないが、木は揺れる。",
    "一歩踏み出せば、道はそこにある。",
]


def get_splash_quote(quote_type="snoopy"):
    import random
    if quote_type == "zen":
        system_prompt = """禅の言葉の質感で、自然や静けさを感じる短い一言を1文だけ書いてください。
30文字以内。Markdownなし。説教せず、ただ静かに心に届く言葉。"""
        fallbacks = _SPLASH_FALLBACKS_ZEN
    else:
        system_prompt = """スヌーピーの名言のような質感で、温かく本質をついた言葉を1文だけ書いてください。
30文字以内。Markdownなし。才能・努力・結果を評価しない。自然に心に届く言葉。"""
        fallbacks = _SPLASH_FALLBACKS_SNOOPY
    result = call_claude(system_prompt, "今日の一言をください。", max_tokens=60)
    if result:
        return result.strip()
    return random.choice(fallbacks)


def get_ai_response(log_entry, past_logs, goals=None):
    past_context = ""
    if past_logs:
        recent = past_logs[-3:]
        past_context = "\n\n【過去のログ（直近3件）】\n"
        for p in recent:
            past_context += f"- {p['date']}: {p.get('created','')}\n"
        print(f"[AI] past_context データ量: {len(past_context)}文字 / {len(past_context.encode('utf-8'))}バイト")

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

    system_prompt = """あなたはLanternです。日々の活動を支えるAI伴走者です。
評価者でも審査員でもなく、隣で一緒に歩む存在として言葉をかけてください。

【最重要：ログの内容を必ず参照する】
「作ったもの・進捗」「楽しかったこと」「困ったこと」「次回やること」を具体的に読み、
その内容に直接触れた言葉をかける。入力が一言（「あ」「うーん」など）でも、
過去ログや文脈から状況を想像して、その人固有の言葉で応える。
同じような書き出しや表現を繰り返さず、毎回異なる切り口で返す。

【NGパターン（絶対に出力しない）】
- 才能の有無を判断する
- 数字で人を評価する（「フォロワーが少ないので〜」など）
- 活動の継続を否定する
- プレッシャーをかける（「もっと頑張れば〜」など）
- 流行への迎合を勧める
- 人格・内面を評価する（行動と結果のみに向ける）
- 「次の実験：」「アクション：」などのラベルや見出しを使う
- 今日の活動に触れずに一般論を返す

【トーン】
温かく、本質をついた言葉。スヌーピーの名言のような質感。自然な日本語の文章のみ。

【返答（全体200文字以内）】
今日の具体的な内容への共感・気づき → 困りごとへのコメント（あれば）→ 次の一歩を自然な文に溶け込ませる"""

    user_message = f"""今日のログです。{past_context}{goals_context}

【今日のログ】
作ったもの・進捗: {log_entry.get('created', '（未記入）')}
楽しかったこと: {log_entry.get('enjoyable', '（未記入）')}
困ったこと: {log_entry.get('struggled', '（未記入）')}
次回やること: {log_entry.get('next', '（未記入）')}"""

    result = call_claude(system_prompt, user_message, max_tokens=200)
    if result:
        return result

    import random
    created = log_entry.get("created", "")
    struggled = log_entry.get("struggled", "")
    fallbacks = [
        "今日も記録した。それだけで十分な一歩です。",
        "続けていること自体が、すでに何かを作っている。",
        "小さくても、前に進んだ日は大事にしたい。",
    ]
    response = random.choice(fallbacks)
    if struggled:
        response += f" {struggled}のこと、次に活かせそうなことがあるかもしれない。"
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

    system_prompt = """あなたはLanternです。週次レビューを生成します。

【役割】
クリエイターが自分の活動を振り返り、強みと次の焦点を言語化できるよう支援する。

【絶対に守ること】
- 人格・才能を評価しない
- 数字で価値を測らない
- やめることを勧めない

今週の活動パターンへの気づき、学んだこと、来週の焦点を自然な文章で書く。
ラベルや箇条書きは使わず、伴走者が語りかけるような文体で。300文字以内。"""

    user_message = f"""今週のログの週次レビューを生成してください。

ビジョン: {vision if vision else '（未設定）'}
今週の目標: {weekly_goal if weekly_goal else '（未設定）'}

今週のログ:{logs_text}"""

    result = call_claude(system_prompt, user_message, max_tokens=400)
    if result:
        return result

    return f"今週は{len(period_logs)}日間、活動を続けました。継続すること自体が大きな力です。来週も一歩ずつ進んでいきましょう。"


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

    system_prompt = """あなたはLanternです。月次レビューを生成します。

【役割】
クリエイターが自分の強みと勝ち筋を言語化できるよう支援する。

【絶対に守ること】
- 人格・才能を評価しない
- 数字で価値を測らない
- やめることを勧めない

今月の活動から見えてきた強みや独自性、繰り返し現れたパターン、来月の焦点を自然な文章で。
ラベルや箇条書きは使わず、伴走者が語りかけるような文体で。400文字以内。"""

    user_message = f"""今月のログの月次レビューを生成してください。

ビジョン: {vision if vision else '（未設定）'}
今月の目標: {monthly_goal if monthly_goal else '（未設定）'}

今月のログ:{logs_text}"""

    result = call_claude(system_prompt, user_message, max_tokens=500)
    if result:
        return result

    return f"今月は{len(period_logs)}日間の記録があります。続けてきた軌跡の中に、必ずあなただけの強みが見えてきます。"
