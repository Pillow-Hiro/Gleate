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
    "あなたの道は、あなたが照らす。",
    "今日の記録が、あなたの灯りになる。",
    "答えは、あなたの中にある。",
    "自分の言葉で、自分の道を。",
    "記録が、ここに残っています。",
    "書いたことは、消えません。",
    "今日も、ここから始められる。",
    "あなたが書いたことが、あなたを照らす。",
    "灯りは、外から来るのではない。",
    "今日のことを、自分の言葉で残してください。",
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
    "あなたの記録が、あなたの灯りになる。",
    "書いた言葉は、ここに残っている。",
    "灯りは、外から来るのではない。",
    "自分の言葉で、自分の道を照らす。",
    "今日のことが、言葉になる。",
]

_SPLASH_FALLBACKS_ZEN = [
    "動かずして、動くものを見よ。",
    "水は低きに流れ、やがて海になる。",
    "花は散るから美しい。",
    "風は見えないが、木は揺れる。",
    "静かな水面に、空が映る。",
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
    #     "あなたの記録が、ここに残っている。",
    #     "書いた言葉は、消えない。",
    #     "今日のことが、言葉になる。",
    #     "灯りは、外から来るのではない。",
    #     "自分の言葉で、自分の道を照らす。",
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


def generate_timeline_reflection(past_logs, current_logs, months_ago):
    """months_ago ヶ月前の同週と現在の記録を比較して観察・問いを生成する。"""
    import json as _json, re as _re

    system_prompt = LANTERN_IDENTITY + f"""

【タイムライン振り返りの原則】
- {months_ago}ヶ月前の記録と現在の記録を静かに観察する
- 変化を評価しない・良い悪いを判断しない
- ユーザー自身の言葉をそのまま使う
- 過去を美化しない・現在を過大評価しない

【出力形式】
JSONのみで返す。前置き不要。Markdownなし。
{{"observation": "観察テキスト（1〜2文）", "question": "答えを求めない問い（1文）"}}"""

    past_text = _fmt_logs(past_logs) if past_logs else "（記録なし）"
    current_text = _fmt_logs(current_logs) if current_logs else "（記録なし）"

    user_message = f"""{months_ago}ヶ月前の記録：
{past_text}

現在の直近の記録：
{current_text}

過去と現在を観察して、評価せず静かに言語化してください。"""

    raw = call_claude(system_prompt, user_message, max_tokens=200)
    if not raw:
        return {"observation": "記録が積み重なっています。", "question": "今、何を感じますか。"}

    raw = raw.strip()
    raw = _re.sub(r'^```(?:json)?\s*', '', raw)
    raw = _re.sub(r'\s*```$', '', raw)

    try:
        parsed = _json.loads(raw)
        if "observation" in parsed:
            return parsed
    except _json.JSONDecodeError:
        m = _re.search(r'\{.*\}', raw, _re.DOTALL)
        if m:
            try:
                parsed = _json.loads(m.group())
                if "observation" in parsed:
                    return parsed
            except _json.JSONDecodeError:
                pass

    return {"observation": "記録が積み重なっています。", "question": "今、何を感じますか。"}


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


def generate_milestone_reflection(logs, days):
    """days 日間の記録を観察して節目の振り返りを生成する。"""
    import json as _json, re as _re

    system_prompt = LANTERN_IDENTITY + f"""

【節目の振り返りの原則】
- {days}日間の記録を静かに観察する
- 継続を称えない・評価しない
- ユーザー自身の言葉をそのまま使う
- 事実とパターンを観察して伝える
- 問いを1つ添える

【出力形式】
JSONのみで返す。前置き・Markdownなし。
{{"observation": "観察テキスト（1〜2文）", "question": "答えを求めない問い（1文）"}}

【禁止】
「{days}日間、よく続けました」などの継続への称賛・「これからも続けましょう」などの励まし"""

    logs_text = _fmt_logs(logs) if logs else "（記録なし）"
    user_message = f"""{days}日間の記録：
{logs_text}

この期間の記録を観察して、評価せず静かに言語化してください。"""

    raw = call_claude(system_prompt, user_message, max_tokens=200)
    if not raw:
        return {"observation": "記録が積み重なっています。", "question": "この期間、何が残りましたか。"}

    raw = raw.strip()
    raw = _re.sub(r'^```(?:json)?\s*', '', raw)
    raw = _re.sub(r'\s*```$', '', raw)

    try:
        parsed = _json.loads(raw)
        if "observation" in parsed:
            return parsed
    except _json.JSONDecodeError:
        m = _re.search(r'\{.*\}', raw, _re.DOTALL)
        if m:
            try:
                parsed = _json.loads(m.group())
                if "observation" in parsed:
                    return parsed
            except _json.JSONDecodeError:
                pass

    return {"observation": "記録が積み重なっています。", "question": "この期間、何が残りましたか。"}


def generate_keyword_frequency(logs_text):
    """ログテキストから頻出単語と出現回数を抽出して返す。感情分類・評価は行わない。"""
    import json as _json, re as _re

    if not logs_text.strip():
        return []

    system_prompt = """あなたはテキスト処理ツールです。与えられたログテキストから頻出単語を抽出し、出現回数をカウントします。

【絶対に行ってはいけないこと】
- 感情・評価（ポジティブ/ネガティブ）の分類
- 変化・成長・傾向へのコメント
- 自由文・解釈・説明の出力

【出力形式】
JSONのみ。前置き・説明・Markdownは一切不要。
{"keywords": [{"word": "単語", "count": 数値}, ...]}

【抽出ルール】
- 名詞・動詞・形容詞を対象にする（助詞・助動詞・記号は除外）
- 固有名詞（人名・地名・ツール名・作品名）も含める
- 出現回数の多い順に最大10件を返す
- 出現回数が1回のみの単語は含めない
- 記録が少ない場合は {"keywords": []} を返す"""

    user_message = f"以下のログテキストから頻出単語を抽出してください。\n\n{logs_text}"

    raw = call_claude(system_prompt, user_message, max_tokens=400)
    if not raw:
        return []

    raw = raw.strip()
    raw = _re.sub(r'^```(?:json)?\s*', '', raw)
    raw = _re.sub(r'\s*```$', '', raw)

    try:
        parsed = _json.loads(raw)
        if "keywords" in parsed and isinstance(parsed["keywords"], list):
            return [
                {"word": str(k.get("word", "")), "count": int(k.get("count", 1))}
                for k in parsed["keywords"]
                if k.get("word") and k.get("count", 0) > 1
            ]
    except (_json.JSONDecodeError, TypeError, ValueError):
        m = _re.search(r'\{.*\}', raw, _re.DOTALL)
        if m:
            try:
                parsed = _json.loads(m.group())
                if "keywords" in parsed and isinstance(parsed["keywords"], list):
                    return [
                        {"word": str(k.get("word", "")), "count": int(k.get("count", 1))}
                        for k in parsed["keywords"]
                        if k.get("word") and k.get("count", 0) > 1
                    ]
            except Exception:
                pass

    return []
