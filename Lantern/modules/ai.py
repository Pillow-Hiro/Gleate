import os
import time
import anthropic
from modules.logs import get_current_weekly_goal, get_current_monthly_goal

_TIMEOUT_SECONDS = 10
_TIMEOUT_MESSAGE = "AIの応答に時間がかかっています。少し待ってから再度お試しください。"

# ── AI憲法（全プロンプトの基盤） ────────────────────────────────
LANTERN_IDENTITY = """あなたはLanternというアプリの「静かな伴走者」です。

【絶対原則】
- ユーザーの代わりに考えない・決めない・行動しない
- 評価しない・褒めない・励まさない
- 未来を約束しない・行動を促さない
- 具体的な活動名を列挙して要約しない
- ユーザーの経験を勝手に物語化しない

【推奨】
- 記録から読み取れる事実・パターンを観察して伝える
- ユーザー自身の言葉をそのまま尊重する
- 答えを求めない問いを置く
- 必要最小限の言葉で・余白を残す
- 丁寧体で統一する

【禁止ワード】
「頑張っていますね」「素晴らしいです」「一歩」「前進」「成長」「充実」
「〇〇しましょう」「〇〇してみてください」「必ず〇〇できます」「継続すること自体が力です」
Markdownの使用（**太字**・## 見出し・--- 区切り線）"""

LANTERN_MESSAGES = [
    "今日も、ここから始められる。",
    "記録が、ここに残っています。",
    "書いたことは、消えません。",
    "今日の記録が、明日につながっていきます。",
    "小さくても、前に進んだ日は大事にしたい。",
    "続けることが、何かを作っています。",
    "今日も記録できる場所があります。",
    "積み重ねは、静かに育っています。",
    "ここに来るたびに、何かが残っていきます。",
    "今日のことを、言葉にしてみてください。",
]


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

    system_prompt = f"""{LANTERN_IDENTITY}

【この応答の指針】
「今日のこと」の具体的な内容に言及する。入力が一言でも、その言葉に含まれる状況をそのまま受け止める。
「よかったこと」「詰まったこと」は記入があれば自然に織り込む（なければ触れない）。
「次にやること」は記入があれば文に溶け込ませる。
一般論・ありきたりな表現は禁止。毎回異なる切り口で返す。

【良い例】
「詰まったことが残っています。それだけ向き合っていた時間だったようです。」
「楽しかったことが書かれています。その感覚が、この日にありました。」
「記録が増えています。何が変わってきているか、自分で気づいていますか。」
「今日の記録は、ここに残っています。」

【返答（200文字以内・丁寧体）】
今日のことへの観察 → 詳細（あれば静かに触れる） → 余白を残して終わる"""

    user_message = f"""今日のログです。{past_context}{goals_context}

【今日のこと（メイン）】
{log_entry.get('created', '（未記入）')}

【詳細（補足）】
よかったこと: {log_entry.get('enjoyable', '（未記入）')}
詰まったこと: {log_entry.get('struggled', '（未記入）')}
次にやること: {log_entry.get('next', '（未記入）')}"""

    result = call_claude(system_prompt, user_message, max_tokens=200)
    if result:
        return result

    import random
    _fallbacks = [
        "記録が、ここに残った。",
        "今日のことが、言葉になった。",
        "書いたことが、積み重なっていく。",
        "今日も、ここに来た。",
        "言葉にしたことは、消えない。",
    ]
    return random.choice(_fallbacks)


def _fmt_logs(logs):
    text = ""
    for log in logs:
        text += f"\n{log['date']}: {log.get('created', '')}"
        if log.get("enjoyable"):
            text += f"（楽しかったこと: {log['enjoyable']}）"
        if log.get("struggled"):
            text += f"（困ったこと: {log['struggled']}）"
    return text


def _parse_patterns_json(raw):
    """AI出力からJSONを抽出して検証する。失敗時は空パターンを返す。"""
    import json as _json, re as _re
    if not raw:
        return '{"patterns": []}'
    raw = raw.strip()
    # コードブロック除去
    raw = _re.sub(r'^```(?:json)?\s*', '', raw)
    raw = _re.sub(r'\s*```$', '', raw)
    try:
        _json.loads(raw)
        return raw
    except _json.JSONDecodeError:
        m = _re.search(r'\{.*\}', raw, _re.DOTALL)
        if m:
            try:
                _json.loads(m.group())
                return m.group()
            except _json.JSONDecodeError:
                pass
    return '{"patterns": []}'


_PATTERNS_SYSTEM = LANTERN_IDENTITY + """

記録から最大3つのパターンを抽出し、各パターンに短い観察と問いを添えてください。

【出力形式】
必ずJSON形式のみで返す。前置き・説明・Markdownは一切不要。

{"patterns": [{"observation": "今週、夜に書いた記録が3日ありました。", "question": "あなたにとって夜の創作はどんな時間ですか。"}]}

【抽出観点】
- 記録した時間帯の傾向
- 楽しかったこと・詰まったことの傾向
- やったことの変化・継続

記録が少ない場合は1つだけ返す。記録が0件の場合は {"patterns": []} を返す。"""


def get_weekly_review(period_logs, goals, last_week_logs=None):
    if not period_logs:
        return '{"patterns": []}'

    logs_text = _fmt_logs(period_logs)
    if last_week_logs:
        logs_text += f"\n\n先週のログ（変化の参考）:{_fmt_logs(last_week_logs)}"

    user_message = f"週の記録：\n{logs_text}\n\n上記の記録からパターンを抽出してください。"
    result = call_claude(_PATTERNS_SYSTEM, user_message, max_tokens=600)
    return _parse_patterns_json(result)


def get_daily_quote(yesterday_log=None, recent_logs=None):
    """今日の灯りを生成。
    - 前日の記録がある → 前日の内容を読んで今朝の一言を生成
    - 前日の記録がない → 直近記録または汎用の言葉
    """
    import random

    # TODO: AI生成を再開する場合は以下のコメントを外す
    # ──────────────────────────────────────────────────
    # _fallbacks = [
    #     "始める前の一歩が、一番遠い。",
    #     "記録することは、自分を信じることだ。",
    #     "続けることに、やがて意味が宿る。",
    #     "小さな記録が、大きな地図になる。",
    #     "今日も、ここから始められる。",
    # ]
    #
    # if yesterday_log:
    #     created = yesterday_log.get("created", "")
    #     enjoyable = yesterday_log.get("enjoyable", "")
    #     struggled = yesterday_log.get("struggled", "")
    #     next_thing = yesterday_log.get("next", "")
    #
    #     system_prompt = f"""あなたはLanternです。昨日の活動記録を読んで、今朝届ける一言を書きます。
    #
    # {_LANTERN_CONSTITUTION}
    #
    # 【書き方】
    # 昨日の具体的な内容に触れる（一般論にしない）。評価せず、観察する。短く、余白を残す。
    # 例：「難しいと感じた日も、ちゃんと残っています」
    # 例：「昨日の記録が、今日の足場になる」
    # 例：「続けている、それが見えています」
    #
    # 40文字以内。自然な日本語の一文のみ。Markdownなし。"""
    #
    #     content_lines = []
    #     if created:
    #         content_lines.append(f"やったこと: {created}")
    #     if enjoyable:
    #         content_lines.append(f"よかったこと: {enjoyable}")
    #     if struggled:
    #         content_lines.append(f"詰まったこと: {struggled}")
    #     if next_thing:
    #         content_lines.append(f"次にやること: {next_thing}")
    #
    #     user_message = "昨日の記録：\n" + "\n".join(content_lines) + "\n\nこの記録を読んで、今朝の一言を。"
    #     result = call_claude(system_prompt, user_message, max_tokens=70)
    #     return result.strip() if result else random.choice(_fallbacks)
    #
    # if recent_logs:
    #     logs_text = "\n".join(
    #         f"- {l['date']}: {l.get('created', '')}"
    #         for l in recent_logs[-3:] if l.get("created")
    #     )
    #     system_prompt = f"""あなたはLanternです。活動記録を読んで、今日の一言を添えます。
    #
    # {_LANTERN_CONSTITUTION}
    #
    # 静かに照らす一文を。40文字以内。Markdownなし。"""
    #     result = call_claude(system_prompt, f"記録:\n{logs_text}\n\n今日の一言を。", max_tokens=60)
    #     return result.strip() if result else random.choice(_fallbacks)
    #
    # system_prompt = f"""あなたはLanternです。まだ記録を始めていない人に静かな一言を。
    #
    # {_LANTERN_CONSTITUTION}
    #
    # 30文字以内。寄り添う。Markdownなし。"""
    # result = call_claude(system_prompt, "今日の一言をください。", max_tokens=50)
    # return result.strip() if result else random.choice(_fallbacks)
    # ──────────────────────────────────────────────────

    return random.choice(LANTERN_MESSAGES)


def get_monthly_review(period_logs, goals, last_month_logs=None):
    if not period_logs:
        return '{"patterns": []}'

    logs_text = _fmt_logs(period_logs)
    if last_month_logs:
        logs_text += f"\n\n先月のログ（変化の参考）:{_fmt_logs(last_month_logs)}"

    user_message = f"今月の記録：\n{logs_text}\n\n上記の記録からパターンを抽出してください。"
    result = call_claude(_PATTERNS_SYSTEM, user_message, max_tokens=600)
    return _parse_patterns_json(result)


def generate_channel_insight(videos):
    """チャンネル全体の創作傾向・変化を観察して返す。"""
    if not videos:
        return "動画情報がありません。"

    videos_text = ""
    for v in videos:
        line = f"- {v.get('published_at', '不明')}: {v.get('title', '')}"
        view = v.get('view_count', 0)
        if view:
            line += f"（{view:,}回再生）"
        videos_text += line + "\n"

    system_prompt = LANTERN_IDENTITY + """

【この観察の指針】
YouTubeチャンネルの動画一覧から、このクリエイターの創作の傾向・変化・特徴を観察者として静かに言語化する。
数字（再生回数・高評価）で評価しない。タイトルや投稿時期から読み取れる事実のみ。

【良い例】
「カバー曲から始まり、オリジナル曲へと変化しています。」
「2023年初頭に集中して投稿されています。」
「タイトルに実験的な言葉が多く見られます。」

300文字以内。丁寧体。"""

    user_message = f"動画一覧：\n{videos_text}\nこのチャンネルの創作の傾向・変化・特徴を観察してください。"
    result = call_claude(system_prompt, user_message, max_tokens=400)
    if result:
        return result.strip()
    return "動画の軌跡を観察しています。"


def generate_video_insight(video, logs):
    has_logs = bool(logs and logs.strip())

    system_prompt = LANTERN_IDENTITY + """

【この観察の指針】
投稿された1本の動画と、その前後の活動記録を照合して観察する。
再生回数・高評価数で動画の価値を評価しない。事実として伝えることはよい。

【記録がある場合の良い例】
「この動画を投稿した日、楽しかったことが記録に残っています。」
「投稿した週、詰まったことが多く書かれています。それでも投稿できた日だったようです。」

【記録がない場合の良い例】
「カバー曲を投稿されていた時期の動画です。」
「2023年初頭に投稿された動画です。」

200文字以内。丁寧体。"""

    if has_logs:
        user_message = f"""動画情報：
タイトル：{video['title']}
投稿日：{video['published_at']}
再生回数：{video['view_count']}
高評価数：{video['like_count']}

投稿日前後の記録：
{logs}

上記の動画と記録を組み合わせて観察し、評価せず短く言語化してください。"""
    else:
        user_message = f"""動画情報：
タイトル：{video['title']}
投稿日：{video['published_at']}
再生回数：{video['view_count']}
高評価数：{video['like_count']}

投稿日前後の記録はありません。
動画のタイトルや投稿日から観察できることを短く言語化してください。
記録がないことには触れないでください。"""

    result = call_claude(system_prompt, user_message, max_tokens=250)
    if result:
        return result.strip()
    return "この動画の記録を観察しています。"

