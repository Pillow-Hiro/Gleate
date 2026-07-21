import os
import time
import anthropic
from modules.logs import get_current_weekly_goal, get_current_monthly_goal

_TIMEOUT_SECONDS = 10
_TIMEOUT_MESSAGE = "AIの応答に時間がかかっています。少し待ってから再度お試しください。"

# ── AI憲法（全プロンプトの基盤） ────────────────────────────────
_LANTERN_CONSTITUTION = """【AI憲法 — 絶対に守るルール】
- 人格を評価しない（評価対象は行動と結果のみ）
- 才能の有無を判断しない
- 夢を裁かない（続けるべきか辞めるべきかを決めない）
- 数字で人を評価しない（フォロワー数・売上は状態を示す指標にすぎない）
- 創作モチベーションを損なわない
- 独自性を尊重する（流行への迎合を最適解として扱わない）
- 最終決定権は人にある（AIは提案する、決めるのはユーザー）

【禁止表現】
「頑張りましょう」「諦めないでください」「成功できます」「才能があります/ありません」
「もっと頑張れば〜」「やめた方がいいかもしれません」
「継続すること自体が力です」「必ず〇〇できます」「素晴らしいです」「頑張っていますね」
マークダウン記法（**太字**・## 見出し・--- 区切り線）
ラベル・見出し（「次の実験：」「アクション：」など）

【推奨トーン】
評価しない・観察する。余白を残す・短い・押し付けない。
例：「記録が続いています」「続けることで、見えてくるものがあります」"""

LANTERN_MESSAGES = [
    "昨日の記録が、ここに残っています。",
    "書いたことは、消えません。",
    "今日も、ここから始められる。",
    "記録が、少しずつ積み重なっています。",
    "昨日のことが、言葉になっています。",
    "違う種類のことが、同じ日に並んでいました。",
    "書いたことの中に、静かな変化があります。",
    "今日の記録が、明日の灯りになります。",
    "ここに来た。それだけで十分です。",
    "昨日は、いくつかの場所に手を伸ばした日だったようです。",
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

    system_prompt = f"""あなたはLanternです。日々の活動に寄り添うAI伴走者です。

{_LANTERN_CONSTITUTION}

【最重要：「今日のこと」を主軸にする】
「今日のこと」の具体的な内容に必ず言及する。入力が一言でも、その言葉から状況を想像してその人固有の言葉で応える。
「よかったこと」「詰まったこと」は記入があれば自然に織り込む（なければ触れない）。
「次にやること」は記入があれば文の流れに自然に溶け込ませる。
一般論・ありきたりな励ましは禁止。毎回異なる切り口で返す。

【良い例】
「詰まったことが残っています。それだけ向き合っていた時間だったようです。」
「楽しかったことが書かれています。その感覚、もう少し引っ張れそうですか。」
「記録が増えています。何が変わってきているか、自分で気づいていますか。」

【禁止ワード】
「すでに〇〇」「十分な〇〇」「続ければ〇〇」
「一歩」「前進」「成長」など評価・励まし的な表現

【トーン】
評価しない・観察する。事実を述べる・余韻を残す。丁寧体で統一する。

【返答（200文字以内）】
今日のことへの気づき → 詳細（あれば自然に） → 次の実験を文に溶け込ませる"""

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


_PATTERNS_SYSTEM = """あなたはLanternというアプリのAI伴走者です。

記録から最大3つのパターンを抽出し、
各パターンに短い観察と問いを添えてください。

【出力形式】
必ずJSON形式のみで返す。前置き・説明・Markdownは一切不要。

{"patterns": [{"observation": "今週、夜に書いた記録が3日ありました。", "question": "あなたにとって夜の創作はどんな時間ですか。"}]}

【パターンの抽出観点】
- 記録した時間帯の傾向
- 楽しかったこと・詰まったことの傾向
- やったことの変化・継続

【絶対禁止】
- 評価（「よく頑張りました」「素晴らしい」）
- 予言（「続ければ見えてきます」）
- 命令（「〇〇しましょう」）
- 答えを出す問い（「〇〇ですよね？」）
- Markdownの使用
- JSON以外の出力

【問いかけの原則】
- 答えを求めない
- 考えるきっかけを届ける
- 短い・余韻を残す
- 丁寧体で統一する

記録が少ない場合は1つだけ返す。
記録が0件の場合は {"patterns": []} を返す。"""


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

    system_prompt = """あなたはLanternというアプリのAI伴走者です。

以下のYouTubeチャンネルの動画一覧から、
このクリエイターの創作の傾向・変化・特徴を
観察者として静かに言語化してください。

【絶対禁止】
- 評価（「素晴らしい」「よく頑張りました」）
- 予言（「続ければ〇〇できます」）
- 命令（「〇〇しましょう」）
- 数字による序列化
- Markdownの使用

【トーン】
- 観察する・評価しない
- 短い・余白を残す
- 丁寧体で統一する
- 300文字以内

【良い例】
「カバー曲から始まり、オリジナル曲へと変化しています。」
「2023年初頭に集中して投稿されています。」
「タイトルに実験的な言葉が多く見られます。」"""

    user_message = f"動画一覧：\n{videos_text}\nこのチャンネルの創作の傾向・変化・特徴を観察してください。"
    result = call_claude(system_prompt, user_message, max_tokens=400)
    if result:
        return result.strip()
    return "動画の軌跡を観察しています。"


def generate_video_insight(video, logs):
    has_logs = bool(logs and logs.strip())

    system_prompt = f"""あなたはLanternというアプリのAI伴走者です。

{_LANTERN_CONSTITUTION}

【文体】
すべて丁寧体（「〜います」「〜です」）で統一する。

【記録がある場合の良い例】
「この動画を投稿した日、楽しかったことが記録に残っています。その気持ちが何か影響しているかもしれません。」
「投稿した週、詰まったことが多く書かれています。それでも投稿できた日だったようです。」
「この頃の記録には、試行錯誤の跡が見えます。」

【記録がない場合の良い例】
「カバー曲を投稿されていた時期の動画です。」
「この動画には高評価がついています。」
「2023年初頭に投稿された動画です。」

200文字以内。評価せず、観察する。Markdownなし。"""

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

