import os
import time
import anthropic
from modules.logs import get_current_weekly_goal, get_current_monthly_goal

# 使う模型（2026-09-13・作者の指示「有料だけ Opus 5、今日の灯りは Sonnet 5」）。
#
# ## 2つ持つ
#
# 無料側は**毎日呼ばれる**。今日の灯り・記録の応答・手がかり。
# 有料側は**月に1回か、押したときだけ**。過去との対話、月次の振り返り、
# 繋いだ場所の読み解き。
#
# 呼ばれる回数が二桁違うので、同じ模型にする理由が無い。
# **深く見てほしい所にだけ重いものを置く。**
#
# 分け方の正は `main.py` の `@require_paid` と、月次だけを有料にしている
# `reviews` の判定。**「週次の振り返り」は無料**なので、ここでも既定側。
#
# 1日に何回まで呼べるかは `modules/plan.py` が持つ。
_MODEL_DEFAULT = "claude-sonnet-5"
_MODEL_DEEP = "claude-opus-5"

_TIMEOUT_SECONDS = 10

# 深掘りだけの待ち時間。**3か月分を読み、見立てまで書く**ので長くかかる。
# gunicorn の `--timeout 60`（`Procfile`）より短く保つこと
_DEEP_TIMEOUT_SECONDS = 40
# **画面では「AI」と名乗らない**（2026-08-18）。
# 他の場所は全部 Gleate を主語にしている（Gleateが観察したこと・
# Gleateに聞く）のに、ここだけ「AIの応答」と書いていた。
#
# **改名が届いていなかった**（2026-09-13）。2026-09-10 の改名は
# `client/` しか通しておらず、モデルは自分を Lantern と名乗り続けていた。
# 識別子（`LANTERN_IDENTITY` など）は据え置く——`lantern-glow` を
# 残したのと同じ理由で、外から見えない名前は動かさない。
# 「静かな伴走者」という設定は、名乗り方が混ざると薄くなる。
_TIMEOUT_MESSAGE = "Gleateの応答に時間がかかっています。少し待ってから、もう一度押せます。"

# ── AI憲法（全プロンプトの基盤） ────────────────────────────────
LANTERN_IDENTITY = """あなたはGleateというアプリの「静かな伴走者」です。

【絶対原則】
- ユーザーの代わりに考えない・決めない・行動しない
- 評価しない・褒めない・励まさない
- 未来を約束しない・行動を促さない
- 具体的な活動名を列挙して要約しない
- ユーザーの経験を勝手に物語化しない

【あなたがすること・しないこと】
1. 記録を並べる ……… する
2. 差分を出す ………… する
3. 意味づけする ……… **しない。それは書いた人だけがやる**

「発見した」「気づいた」「〜ということでしょう」「つまり〜です」は
3に入っている。**あなたは2で止まる。**

【推奨】
- 記録から読み取れる事実・パターンを観察して伝える
- ユーザー自身の言葉をそのまま尊重する
- 答えを求めない問いを置く
- 必要最小限の言葉で・余白を残す
- 丁寧体で統一する
- 問いは「。」で終える。**「？」を使わない**
  （答えを求めない問いだから。答えを迫る形にしない）

【禁止ワード】
「頑張っていますね」「素晴らしいです」「一歩」「前進」「成長」「充実」
「〇〇しましょう」「〇〇してみてください」「必ず〇〇できます」「継続すること自体が力です」
Markdownの使用（**太字**・## 見出し・--- 区切り線）"""


# 人格の下に、その場の指示を足す。**足し方をここに1つだけ持つ。**
#
# 2026-08-18 まで、各関数が自分で人格に文字列を継ぎ足していた。見出しが
# 【この応答の指針】【この観察の指針】【この一言について】
# 【タイムライン振り返りの原則】【節目の振り返りの原則】と5通りあり、
# 字数と文体の指定も毎回違う書き方だった。
#
# **形がばらけると中身もばらける。** 実際「見つけた」と「観察」が場所に
# よって混ざり、2026-08-18 の言葉の精査でまとめて直すことになった。
#
# - `purpose` … その場で何をするか。**必ず【】1つに収める**
# - `body`    … 指針・良い例・悪い例。ここだけが場ごとに違う
# - `closing` … 字数と文体。**【返し方】に固定する**
#
# 人格そのものを渡さない道を作らないこと。`tests/test_prompts.py` が
# 「人格を渡していない関数」を落とす。
def lantern_prompt(purpose, body, closing=""):
    parts = [LANTERN_IDENTITY, "", "【" + purpose + "】", body.strip()]
    if closing:
        parts += ["", "【返し方】", closing.strip()]
    return chr(10).join(parts)

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
    "今日のことは、自分の言葉で残せる。",
]


# ── Claude への通り道。**ここが唯一の口** ──────────────────
#
# 2026-08-18 まで2本あった（`call_claude` と `call_claude_with_history`）。
# 模型・待ち時間・失敗の扱いが両方に書いてあり、片方だけ直す余地があった。
# **履歴つきの方は呼び出し元がゼロ**だったので消した。
# 増やすときは、この1本に引数を足すこと。
#
# **失敗しても投げない。** `None` を返すか、待ちすぎたときだけ
# `_TIMEOUT_MESSAGE` を返す。呼ぶ側は `if result:` で受けて、
# その場に合った断りを返す。
def _first_text(message):
    """返ってきた中から、**最初の文字ブロック**を取る。

    ## `content[0].text` を決め打ちしていた（2026-09-13）

    模型を Opus 5 に替えた日、有料の5つが全部**静かに定型文へ落ちた。**

        'ThinkingBlock' object has no attribute 'text'

    返事の先頭が考えごとのブロックで、`.text` を持っていない。
    例外は握りつぶされ `None` になり、呼ぶ側は断りを返す——
    **動くので気づけない。**画面には「まだ並べられるほどの記録が
    ありません」と出ていた。

    その日、模型名が通ることは確かめていた。**返ってきたものを
    読めるかは確かめていなかった。**`max_tokens=5` で叩いて
    `usage` だけ見ていたので、この行を通っていない。

    形の決め打ちをやめる。文字のブロックを探して返す。
    """
    for block in getattr(message, "content", None) or []:
        text = getattr(block, "text", None)
        if text:
            return text
    return None


def call_claude(system_prompt, user_message, max_tokens=300, model=None, timeout=None):
    """`model` を渡さなければ既定側（無料の毎日のもの）。

    **有料の入口だけが `_MODEL_DEEP` を渡す。**どれが有料かは
    `main.py` の `@require_paid` が正で、`tests/test_ai_models.py` が
    その対応を見張る。

    `timeout` を渡さなければ `_TIMEOUT_SECONDS`。**3か月分を読む深掘りだけ延ばす**
    （`generate_deepen`）。
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    client = anthropic.Anthropic(api_key=api_key, timeout=timeout or _TIMEOUT_SECONDS)
    start = time.time()
    chosen = model or _MODEL_DEFAULT
    print(f"[AI] リクエスト開始: {time.strftime('%H:%M:%S')} / {chosen}")
    try:
        message = client.messages.create(
            model=chosen,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
        print(f"[AI] リクエスト完了: {time.time() - start:.2f}秒")
        return _first_text(message)
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
    # **憲法の下に置く。**
    #
    # 2026-08-08 まで、この2つだけ LANTERN_IDENTITY を渡していなかった。
    # 「説教せず」「才能・努力・結果を評価しない」とは書いてあったが、
    # 禁止ワード（頑張って・成長・一歩・前進・〇〇しましょう）は
    # 効いていなかった。**起動画面は利用者が最初に見る言葉**なので、
    # ここだけ憲法の外に置く理由が無い。
    if quote_type == "zen":
        system_prompt = lantern_prompt(
            "この一言の指針",
            """禅の言葉の質感で、自然や静けさを感じる短い一言を1文だけ置く。
説教しない。ただ静かに置く。""",
            "30文字以内。丁寧体。前置きも引用符も付けない。",
        )
        fallbacks = _SPLASH_FALLBACKS_ZEN
    else:
        system_prompt = lantern_prompt(
            "この一言の指針",
            """温かく、本質をついた短い一言を1文だけ置く。
才能・努力・結果を評価しない。自然に心に届く言葉。""",
            "30文字以内。丁寧体。前置きも引用符も付けない。",
        )
        fallbacks = _SPLASH_FALLBACKS_SNOOPY
    result = call_claude(system_prompt, "今日の一言をください。", max_tokens=60)
    if result:
        return result.strip()
    return random.choice(fallbacks)


# 灯りに渡す過去の記録の数（2026-09-05・作者から「回答の質が悪い。
# 淡々と事実を述べているだけ」）。
#
# **3件では差分が出せなかった。**
#
# 人格は「1. 記録を並べる ……… する / 2. 差分を出す ……… する」と
# 定めているのに、渡していたのは**直近3件の「やったこと」だけ**。
# 前にも同じことを書いていたか、何が変わったかを言おうにも材料が無い。
# 残る手は「読み取れた事実を言う」だけで、それが淡々として見えていた。
#
# さらに 2026-09-04 に書く欄を1つへ絞ったので、
# **よかったこと・困ったこと・次にやることはほぼ空になった。**
# 材料は減る一方だった。
#
# 14件にしても数百文字。**言えることを増やすのに、いちばん安い手。**
PAST_FOR_LIGHT = 14


def get_ai_response(log_entry, past_logs, goals=None):
    past_context = ""
    if past_logs:
        recent = past_logs[-PAST_FOR_LIGHT:]
        past_context = "\n\n【これまでの記録】\n"
        for p in recent:
            past_context += f"- {p['date']}: {_plain(p, 'created')}\n"
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

    system_prompt = lantern_prompt(
        "この応答の指針",
        """**記録の中から一つだけ拾って、それに応える。**
全部の項目に触れない。順番に並べない。要約しない。

拾うのは、書いた人がその日いちばん近くにいたと思われる一つ。
出来事そのものでも、そこに含まれる場面でもよい。

拾ったものに対して、次のどれかを置く。
- **これまでの記録と重なるなら、そう言う**
- 読み取れた事実を、評価せずに言う
- 答えを求めない問いを置く

**重なりが見えるときは、それを先に選ぶ。**
同じ言葉が前にも出ている、前は違うことを書いていた、間が空いていた——
そこに触れられるのは、これまでを持っているあなただけです。
今日の記録だけを言い換えたものは、書いた人がもう知っている。

ただし**意味づけはしない。**「だから慣れてきた」「つまり進んでいる」は
3に入っている。並べて、止まる。

書かれていない気持ちを推測して代弁しない。
「〜だったのでしょう」と決めつけず、「〜でしたか」と開いたままにする。

【悪い例（そのまま並べ直しただけ）】
「App Storeへの配信準備が、今日のことです。」
　→ 書いてあることを言い換えただけ。何も足していない。
「ドメインや認証まわりの登録が、困ったこととして残っています。」
　→ 項目名をなぞっている。記録の中身ではなく、フォームの話になっている。
「困ったことが残っています。それだけ向き合っていた時間だったようです。」
　→ 項目名＋一般論。どの記録にも当てはまる文は、その人の記録ではない。

【良い例（一つを拾って応えている）】
「自分のアプリをスマホで触れた瞬間があったようです。その感覚は、どんなものでしたか。」
「『熱海旅行』という言葉が、今日の記録に残っています。」
「登録の手続きに時間がかかった日でした。あなたにとって、待つ時間はどんな時間でしょう。」
「今日は短い記録でした。それでもここに残っています。」

【良い例（これまでと重ねている）】
「同じ手続きのことを、先週も書いていました。」
「『編集』という言葉が、しばらく出ていませんでした。」
「三日続けて、同じところで止まっているようです。そこに何がありますか。」
「間が空いたあとの記録でした。」""",
        """一つを拾い、一言か二言で終える。**言い切らずに余白を残す。**
これまでと重なるものがあれば、そちらを選ぶ。
120文字以内。丁寧体。""",
    )

    user_message = f"""今日のログです。{past_context}{goals_context}

【今日のこと（メイン）】
{_plain(log_entry, 'created', '（未記入）')}

【詳細（補足）】
よかったこと: {_plain(log_entry, 'enjoyable', '（未記入）')}
困ったこと: {_plain(log_entry, 'struggled', '（未記入）')}
次にやること: {_plain(log_entry, 'next', '（未記入）')}"""

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


# 記録の項目を読む唯一の口。**AI に渡すものは必ずここを通す。**
#
# 2026-08-13 に「やったこと」を Markdown で装飾できるようにした。
# `**強い**` や `- 箇条書き` がそのまま渡ると、記法が
# 「その人の言葉」として扱われ、応答にも `**` が混ざる。
#
# `tests/test_prompts.py` が、この関数を通さずに記録を読む書き方を弾く。
def _plain(log, key, default=""):
    from modules.markdown import strip_markdown

    return strip_markdown(log.get(key) or "") or default


def _fmt_logs(logs):
    text = ""
    for log in logs:
        # 写真だけの記録は本文が空になる。中身の無い行をAIに渡すと
        # 「2026-08-01: 」という無意味な入力になるためスキップする。
        if not any(log.get(k) for k in ("created", "enjoyable", "struggled", "next")):
            continue
        text += f"\n{log['date']}: {_plain(log, 'created')}"
        if log.get("enjoyable"):
            text += f"（よかったこと: {_plain(log, 'enjoyable')}）"
        if log.get("struggled"):
            text += f"（困ったこと: {_plain(log, 'struggled')}）"
        # **「次にやること」が抜けていた**（2026-09-13）。
        # 中身があるかの判定には数えているのに、本文には足していなかった。
        # それだけ書いた日は `2026-08-01: ` という空行になり、
        # スキップが防ぐはずだったものがそのまま通っていた。
        #
        # そして抽出観点には「やったことの変化・継続」がある。
        # **見せていないものについて傾向を訊いていた。**
        if log.get("next"):
            text += f"（次にやること: {_plain(log, 'next')}）"
    return text


def _shape(raw):
    """AI出力の形だけを返す。**本文はログに出さない。**

    AI憲法の原則2に従い、AIは利用者が実際に残した言葉を引用する。
    つまり AI の出力には記録の中身が混ざる。
    Render のログは保存され、あとから読める。記録アプリのサーバーログに
    記録の中身を残さない。

    解析に失敗した原因（空・途中で切れた・JSON以外が混ざった）は
    長さと先頭の文字種だけで足りる。
    """
    if not raw:
        return "空の応答"
    head = raw.lstrip()[:1]
    return f"{len(raw)}文字 先頭={head!r}"


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
    # ここに来るのはAI出力がJSONとして読めなかった時だけ。
    # 空のフォールバックを黙って返すとUI上は「パターンなし」と区別がつかないため記録する。
    print(f"[AI] JSON解析に失敗（patterns）。{_shape(raw)}")
    return '{"patterns": []}'


def _drop_blank_questions(raw):
    """空の問いを落とす（2026-09-13）。

    「観察が事実を置くだけで足りるときは、問いを省いてよい」と許した
    ところ、鍵を消すのではなく `"question": ""` が返ってきた。
    画面は中身を見ずに描くので、**空の行が空いたまま残る。**

    **プロンプトで頼んだことを、受け取る側でも確かめる。**
    """
    import json as _json

    try:
        data = _json.loads(raw)
    except (_json.JSONDecodeError, TypeError):
        return raw
    for p in data.get("patterns", []) or []:
        if isinstance(p, dict) and not str(p.get("question") or "").strip():
            p.pop("question", None)
    return _json.dumps(data, ensure_ascii=False)


def _first_pattern(raw):
    """観察を**1つに切る**（2026-09-13）。

    プロンプトで「1つだけ」と頼んでいるが、**受け取る側でも確かめる**
    （`_drop_blank_questions` と同じ考え方）。2つ目以降は捨てる。
    """
    import json as _json

    try:
        data = _json.loads(raw)
    except (_json.JSONDecodeError, TypeError):
        return raw
    patterns = data.get("patterns")
    if isinstance(patterns, list):
        data["patterns"] = patterns[:1]
    return _json.dumps(data, ensure_ascii=False)


def _attach_fact(raw, facts):
    """観察が使った事実を、**サーバーが数えたもの**に差し替える（2026-09-13）。

    モデルに返させるのは番号だけ。語・日付・件数は、ここで数えた事実から付ける。
    **文の中の日付は信用しない**——事実を渡しても、文の中で置き場所を
    間違えることがある（月次が「その間の9月11日」と書いた。11日は期間の最後だった）。

    深掘りは、この事実を広げる。**知らない番号は捨てる。**作られた番号を
    事実として画面に出さない。番号でない形（事実そのものを書いてきた等）も信用しない。
    """
    import json as _json
    from modules import facts as _facts

    try:
        data = _json.loads(raw)
    except (_json.JSONDecodeError, TypeError):
        return raw
    for p in data.get("patterns", []) or []:
        if not isinstance(p, dict):
            continue
        item = _facts.find_item(facts, p.get("fact"))
        if item:
            p["fact"] = item
        else:
            p.pop("fact", None)
    return _json.dumps(data, ensure_ascii=False)


# 週と月で別のプロンプトを持つ（2026-09-13・作者との壁打ち）。
#
# ## 同じものを使っていた
#
# それまで `get_weekly_review` と `get_monthly_review` が1つを共有して
# いた。抽出観点も3つとも同じ。**月次は「長い週次」になっていた。**
# 1か月でしか見えないもの——続いた話題、途中で消えた話題、書いてから
# あとで現れたもの——を1つも頼んでいなかった。
#
# ## 時間帯を扱わせない
#
# 旧い抽出観点の筆頭は「記録した時間帯の傾向」で、例は
# 「今週、夜に書いた記録が3日ありました」だった。
# **`_fmt_logs` は時刻を渡していない。**知りようのないことを頼み、
# 断定した言い方の見本まで見せていた。
#
# しかも同じ観察を、無料の「今週の発見」が `saved_at` を実際に見て
# 出している（`client/components/WeeklyDiscovery.jsx`）。
# **無料のほうが正確で、速くて、ただだった。**持ち場を分ける。
#
# ## 数はモデルに数えさせない
#
# 数えた事実を `modules/facts.py` が付けて渡す。モデルがやるのは
# **どれを言うかと、どう問うか**だけ。数が合わなくなる道を塞ぐ。

# ## 観察は1つ（2026-09-13・作者の判断）
#
# それまで「最大3つ」。**3という数の理由は記録に残っていなかった。**
# `REVIEW_v0.5.md` の提案にそう書かれ、そのまま残っていただけ。
# しかも提案の見本は2つとも今の憲法に反する——時刻を渡していない
# 「夜に3日」と、「？」で未来の行動へ誘う問い。
#
# 違う話を3つ求めると埋め草が出る。1週間の記録に、互いに違う
# 確かな観察が3つあることはまず無い。そして問いが3つ並ぶと、
# **考えることを3つ課される**画面になる。静かな伴走と逆を向く。
#
# 受け取る側でも1つに切る（`_first_pattern`）。

_COUNTING_RULE = """【数について】
数は【数えた事実】に書いてあるものだけを使う。自分で数えない。
そこに無い数には触れない。記録した時刻は渡されていないので、
時間帯や曜日の傾向には触れない。

【触れないこと】
記録がなかった日・空いた期間・記録の少なさには触れない。
**無いことを言うと、書けと押す形になる。**
言えることが少ない日は、少ないまま1つだけ返す。

項目名（やったこと・よかったこと・困ったこと・次にやること）を
主語にしない。どの記録にも当てはまる文は、その人の記録ではない。

観察が事実を置くだけで足りるときは、問いを省いてよい。

【使った事実】
観察が【数えた事実】のどれかに立っているなら、その番号（F1 など）を "fact" に入れる。
番号は【数えた事実】に書いてあるものだけを使い、作らない。
どの事実にも立たない観察なら "fact" は入れない。"""


_WEEKLY_SYSTEM = lantern_prompt(
    "この観察の指針",
    """この一週間の記録を読み、観察を1つだけ返してください。
見るのは書かれた中身です。同じところで立ち止まっていること、
書き方が変わったこと、同じ語が続いていること。

言えることがいくつあっても、いちばん確かなものを1つだけ選ぶ。

【出力形式】
必ずJSON形式のみで返す。前置き・説明・Markdownは一切不要。

{"patterns": [{"observation": "観察（1〜2文）", "question": "答えを求めない問い（1文・省略可）", "fact": "使った事実の番号（省略可）"}]}

【良い例】
{"observation": "「音が合わない」が、3日の記録と21日の記録に出ています。", "question": "同じところで立ち止まるとき、何が起きているのでしょう。", "fact": "F1"}

【悪い例】
{"observation": "今週は夜に書いた記録が3日ありました。", "question": "夜はどんな時間ですか。"}

"""
    + _COUNTING_RULE
    + """

patterns には1つだけ入れる。記録が0件の場合は {"patterns": []} を返す。""",
)


_MONTHLY_SYSTEM = lantern_prompt(
    "この観察の指針",
    """この一か月の記録を読み、観察を1つだけ返してください。
見るのは**週をまたいで初めて見えること**です。月のはじめから終わりまで
続いている話題、途中から見えなくなった話題、いちど離れて戻ってきた話題。

一週間を見れば分かることは返さない。言えることがいくつあっても、
いちばん確かなものを1つだけ選ぶ。

【出力形式】
必ずJSON形式のみで返す。前置き・説明・Markdownは一切不要。

{"patterns": [{"observation": "観察（1〜2文）", "question": "答えを求めない問い（1文・省略可）", "fact": "使った事実の番号（省略可）"}]}

【良い例】
{"observation": "「台本」は月のはじめから終わりまで記録に出ていて、「告知」は中ほどで見えなくなっています。", "question": "見えなくなったほうを、いまどこに置いていますか。"}

【悪い例】
{"observation": "今月もよく書けていて、続けられています。", "question": "来月は何をしますか。"}

"""
    + _COUNTING_RULE
    + """

patterns には1つだけ入れる。記録が0件の場合は {"patterns": []} を返す。""",
)


def get_weekly_review(period_logs, goals, last_week_logs=None):
    if not period_logs:
        return '{"patterns": []}'

    logs_text = _fmt_logs(period_logs)
    if last_week_logs:
        logs_text += f"\n\n先週のログ（変化の参考）:{_fmt_logs(last_week_logs)}"

    from modules import facts as _facts

    # **数えた事実は1回だけ数え、渡すのにも差し替えるのにも使う**
    facts = _facts.period_facts(period_logs, 7)
    user_message = (
        f"週の記録：\n{logs_text}\n\n"
        f"【数えた事実】\n{_facts.as_text(facts)}\n\n"
        "上記の記録から観察を返してください。"
    )
    result = call_claude(_WEEKLY_SYSTEM, user_message, max_tokens=600)
    return _attach_fact(
        _first_pattern(_drop_blank_questions(_parse_patterns_json(result))), facts
    )


_DAILY_QUOTE_SYSTEM = lantern_prompt(
    "この一言の指針",
    """昨日の記録を読んで、今朝そっと置く一言を書きます。

書き方：
- 昨日の記録の具体的な内容に触れる（一般論にしない）
- 評価せず、観察する。または答えを求めない問いを置く
- 記録がなかった日・空いた期間には一切触れない
- 40文字以内。自然な日本語の一文のみ。前置きも引用符も付けない

例：「難しいと感じたことも、記録に残っています。」
例：「昨日書いた言葉が、ここにあります。」
例：「あなたにとって、あの時間はどんな時間でしたか。」""",
)


def get_daily_quote(yesterday_log=None):
    """今日の灯りを生成し、(quote, source) を返す。

    - 前日の記録がある → その内容を読んでAIが一言を生成（source='ai'）
    - 前日の記録がない → LANTERN_MESSAGES から返す（source='fallback'・AI呼び出しなし）

    離脱期間への言及を構造的に避けるため、前日以外のログはAIに渡さない。
    """
    import random

    if not yesterday_log:
        return random.choice(LANTERN_MESSAGES), "fallback"

    fields = [
        ("やったこと", _plain(yesterday_log, 'created')),
        ("よかったこと", _plain(yesterday_log, 'enjoyable')),
        ("困ったこと", _plain(yesterday_log, 'struggled')),
        ("次にやること", _plain(yesterday_log, 'next')),
    ]
    content_lines = [f"{label}: {value}" for label, value in fields if value]
    if not content_lines:
        return random.choice(LANTERN_MESSAGES), "fallback"

    user_message = "昨日の記録：\n" + "\n".join(content_lines) + "\n\nこの記録を読んで、今朝の一言を。"
    result = call_claude(_DAILY_QUOTE_SYSTEM, user_message, max_tokens=70)

    # call_claude はタイムアウト時にユーザー向けの文言を返すため、灯りとして表示させない
    if not result or result == _TIMEOUT_MESSAGE:
        return random.choice(LANTERN_MESSAGES), "fallback"

    quote = result.strip().strip("「」\"'")
    if not quote:
        return random.choice(LANTERN_MESSAGES), "fallback"
    return quote, "ai"


def get_monthly_review(period_logs, goals, last_month_logs=None):
    if not period_logs:
        return '{"patterns": []}'

    logs_text = _fmt_logs(period_logs)
    if last_month_logs:
        logs_text += f"\n\n先月のログ（変化の参考）:{_fmt_logs(last_month_logs)}"

    from modules import facts as _facts

    # **数えた事実は1回だけ数え、渡すのにも差し替えるのにも使う**
    facts = _facts.period_facts(period_logs, 30)
    user_message = (
        f"今月の記録：\n{logs_text}\n\n"
        f"【数えた事実】\n{_facts.as_text(facts)}\n\n"
        "上記の記録から観察を返してください。"
    )
    result = call_claude(_MONTHLY_SYSTEM, user_message, max_tokens=600, model=_MODEL_DEEP)
    return _attach_fact(
        _first_pattern(_drop_blank_questions(_parse_patterns_json(result))), facts
    )


# 深掘り（2026-09-13・作者との壁打ち）。**有料・Opus 5。**
#
# ひとつの観察を、この3か月の記録に戻して深める。この場所でだけ
# Gleate の見立て（解釈の候補）を置いてよい（`CLAUDE.md`）。
#
# **語ではなく記録で読む。**語の一致を足場にすると、同じ話の記録が落ち、
# 違う話の記録が混ざり、語から本人の書いていない話ができる
# （作者「単語だけで推測するの？全くの見当外れになって、危険じゃない？」）。
#
# 返ってきた日付と引用は `modules/deepen.py` が実在する記録に照らして通す。
_DEEPEN_SYSTEM = lantern_prompt(
    "この深掘りの指針",
    """ひとつの観察を、この3か月の記録に戻して深めます。
**この場所でだけ、見立て（解釈の候補）を置いてよい。**
決めつけない。「つまり〜です」「〜な人です」と言わず、「〜かもしれません」と候補として置く。

【読み方】
- 観察と同じ話をしている記録を探す。**語が同じかどうかではなく、書かれた文で判断する。**
- 同じ語でも違う話なら含めない。違う言い方でも同じ話なら含める。
- 本人が書いていないことを、書いてあったことのように言わない。
- **書かれていないことを、無かったことのように言わない。**「その日は音に触れていない」とは言えない——書いていないだけかもしれない。
- 同じ話に見える記録が無ければ、found を false にして、何も作らない。

【返すもの】
- records … 同じ話として読んだ記録。日付と、その記録の中の文をそのまま抜き出した quote。多くて8件
- readings … 見立ての候補。多くて2つ。1つに決めない。dates に、その見立ての根拠にした記録の日付を入れる
- question … 見立てを受けて深めた問い。1文。答えを迫らない。「。」で終える

評価しない・褒めない・励まさない。行動を勧めない（「〇〇しましょう」「〜してみては」を使わない）。
箇条書きの報告口調にしない。

【出力形式】
必ずJSON形式のみで返す。前置き・説明・Markdownは一切不要。
{"found": true, "records": [{"date": "2026-09-02", "quote": "記録の中の文をそのまま"}], "readings": [{"text": "見立て（1〜2文）", "dates": ["2026-09-02"]}], "question": "深めた問い"}

【良い例】
{"found": true, "records": [{"date": "2026-09-02", "quote": "音響の調整が難しい"}, {"date": "2026-09-11", "quote": "音響の調整にまた手間取った"}], "readings": [{"text": "2日も11日も、音そのものより、合わせる手間のほうに言葉が向いているのかもしれません。", "dates": ["2026-09-02", "2026-09-11"]}], "question": "合わせようとしていたのは、音そのものだったのでしょうか。"}

【悪い例】
{"found": true, "records": [], "readings": [{"text": "あなたは完璧主義な傾向があります。", "dates": []}], "question": "次は音響の本を読んでみてはどうですか？"}""",
)


def generate_deepen(observation, question, logs):
    """観察を3か月分の記録に戻して深める。**画面にそのまま出せる形**を返す。

    読むのはモデル、確かめるのは `modules/deepen.py`。
    **読めなかったときは None。**「見つからなかった」（found: false）とは分ける。
    """
    import json as _json
    import re as _re
    from modules import deepen as _deepen

    if not observation or not logs:
        return _deepen.empty()

    asked = f"（そのとき添えた問い: {question}）\n" if question else ""
    user_message = (
        f"【深掘りする観察】\n{observation}\n{asked}\n"
        f"【この3か月の記録】{_fmt_logs(logs)}\n\n"
        "上記の記録を読んで返してください。"
    )
    raw = call_claude(
        _DEEPEN_SYSTEM, user_message, max_tokens=1500,
        model=_MODEL_DEEP, timeout=_DEEP_TIMEOUT_SECONDS,
    )
    if not raw or raw == _TIMEOUT_MESSAGE:
        return None

    text = _re.sub(r'^```(?:json)?\s*', '', raw.strip())
    text = _re.sub(r'\s*```$', '', text)
    data = None
    try:
        data = _json.loads(text)
    except _json.JSONDecodeError:
        m = _re.search(r'\{.*\}', text, _re.DOTALL)
        if m:
            try:
                data = _json.loads(m.group())
            except _json.JSONDecodeError:
                data = None
    if data is None:
        print(f"[AI] JSON解析に失敗（deepen）。{_shape(raw)}")
        return None
    return _deepen.ground(data, logs)


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

    system_prompt = lantern_prompt(
        "この観察の指針",
        """YouTubeチャンネルの動画一覧から、このクリエイターの創作の傾向・変化・特徴を観察者として静かに言語化する。
数字（再生回数・高評価）で評価しない。タイトルや投稿時期から読み取れる事実のみ。

【良い例】
「カバー曲から始まり、オリジナル曲へと変化しています。」
「2023年初頭に集中して投稿されています。」
「タイトルに実験的な言葉が多く見られます。」""",
        "300文字以内。丁寧体。",
    )

    user_message = f"動画一覧：\n{videos_text}\nこのチャンネルの創作の傾向・変化・特徴を観察してください。"
    result = call_claude(system_prompt, user_message, max_tokens=400, model=_MODEL_DEEP)
    if result:
        return result.strip()
    # **失敗したときの戻り値。** 2026-08-18 まで「観察しています。」と
    # 返していたが、進行中に読める。来ないものを待たせるのは嘘と同じ。
    return "いまは観察を届けられませんでした。"


def generate_stream_insight(streams):
    """配信の傾向を観察して返す。

    YouTubeと違い、配信は開始時刻と長さを持つ。
    時間帯や長さは事実として観察してよいが、
    「もっと長く配信すべき」のような助言は行わない。
    """
    if not streams:
        return "配信の記録がありません。"

    streams_text = ""
    for s in streams:
        started = (s.get("started_at") or "")[:16].replace("T", " ")
        line = f"- {started or '不明'}: {s.get('title', '')}"
        seconds = s.get("duration_seconds")
        if seconds:
            line += f"（{seconds // 3600}時間{(seconds % 3600) // 60}分）"
        view = s.get("view_count", 0)
        if view:
            line += f"（{view:,}回視聴）"
        streams_text += line + "\n"

    system_prompt = lantern_prompt(
        "この観察の指針",
        """配信の一覧から、この人の活動の傾向・変化・特徴を観察者として静かに言語化する。
視聴数・フォロワー数で配信の価値を評価しない。事実として伝えることはよい。
配信の時間帯や長さは観察の材料にしてよい。ただし助言はしない。

【良い例】
「夜に始まる配信が多く記録されています。」
「3時間を超える配信が続いています。」
「タイトルに『作業』という言葉が繰り返し現れます。」

【悪い例】
「もっと長く配信すると伸びます。」
「この配信は反応が良かったようです。」
「配信頻度を上げましょう。」""",
        "300文字以内。丁寧体。",
    )

    user_message = f"配信一覧：\n{streams_text}\nこの活動の傾向・変化・特徴を観察してください。"
    result = call_claude(system_prompt, user_message, max_tokens=400, model=_MODEL_DEEP)
    if result:
        return result.strip()
    # **失敗したときの戻り値。** 2026-08-18 まで「観察しています。」と
    # 返していたが、進行中に読める。来ないものを待たせるのは嘘と同じ。
    return "いまは観察を届けられませんでした。"


def generate_timeline_reflection(past_logs, current_logs, months_ago):
    """months_ago ヶ月前の同週と現在の記録を比較して観察・問いを生成する。"""
    import json as _json, re as _re

    system_prompt = lantern_prompt(
        "この振り返りの指針",
        f"""- {months_ago}ヶ月前の記録と現在の記録を静かに観察する
- 変化を評価しない・良い悪いを判断しない
- ユーザー自身の言葉をそのまま使う
- 過去を美化しない・現在を過大評価しない

【出力形式】
JSONのみで返す。前置き不要。Markdownなし。
{{"observation": "観察テキスト（1〜2文）", "question": "答えを求めない問い（1文）"}}""",
    )

    past_text = _fmt_logs(past_logs) if past_logs else "（記録なし）"
    current_text = _fmt_logs(current_logs) if current_logs else "（記録なし）"

    user_message = f"""{months_ago}ヶ月前の記録：
{past_text}

現在の直近の記録：
{current_text}

過去と現在を観察して、評価せず静かに言語化してください。"""

    raw = call_claude(system_prompt, user_message, max_tokens=200, model=_MODEL_DEEP)
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

    # AI出力がJSONとして読めなかったか、observation キーが欠けていた場合。
    # 固定文言のフォールバックはAI生成と見分けがつかないため記録する。
    print(f"[AI] JSON解析に失敗（timeline_reflection）。{_shape(raw)}")
    return {"observation": "記録が積み重なっています。", "question": "今、何を感じますか。"}


def generate_video_insight(video, logs):
    has_logs = bool(logs and logs.strip())

    system_prompt = lantern_prompt(
        "この観察の指針",
        """投稿された1本の動画と、その前後の活動記録を照合して観察する。
再生回数・高評価数で動画の価値を評価しない。事実として伝えることはよい。

【記録がある場合の良い例】
「この動画を投稿した日、『気持ちよかった』という言葉が記録に残っています。」
「投稿の前後に、制作について書かれた日が続いていました。」

【避けること】
記録フォームの項目名を主語にしない。
「困ったことが多く書かれています」は、記録ではなく入力欄の話になっている。
書かれた言葉そのものを引くか、起きた事実を言う。

【記録がない場合の良い例】
「カバー曲を投稿されていた時期の動画です。」
「2023年初頭に投稿された動画です。」""",
        "200文字以内。丁寧体。",
    )

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

    result = call_claude(system_prompt, user_message, max_tokens=250, model=_MODEL_DEEP)
    if result:
        return result.strip()
    # **失敗したときの戻り値。** 2026-08-18 まで「観察しています。」と
    # 返していたが、進行中に読める。来ないものを待たせるのは嘘と同じ。
    return "いまは観察を届けられませんでした。"


def generate_milestone_reflection(logs, days):
    """days 日間の記録を観察して節目の振り返りを生成する。"""
    import json as _json, re as _re

    system_prompt = lantern_prompt(
        "この振り返りの指針",
        f"""- {days}日間の記録を静かに観察する
- 継続を称えない・評価しない
- ユーザー自身の言葉をそのまま使う
- 事実とパターンを観察して伝える
- 問いを1つ添える

【出力形式】
JSONのみで返す。前置き・Markdownなし。
{{"observation": "観察テキスト（1〜2文）", "question": "答えを求めない問い（1文）"}}

【禁止】
「{days}日間、よく続けました」などの継続への称賛・「これからも続けましょう」などの励まし""",
    )

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

    # AI出力がJSONとして読めなかったか、observation キーが欠けていた場合。
    print(f"[AI] JSON解析に失敗（milestone_reflection）。{_shape(raw)}")
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
            except (_json.JSONDecodeError, TypeError, ValueError):
                pass

    # 空リストは「頻出語なし」と見分けがつかないため、解析失敗として記録する。
    print(f"[AI] JSON解析に失敗（keywords）。{_shape(raw)}")
    return []


# ── 手がかり ─────────────────────────────────────────────────
#
# **2026-09-02 に足した。** それまで AI にできるのは2つだけだった
# （記録を並べる・変化を示す）。3つ目として
# **「本人が過去に取った手を差し出す」**を足す。
#
# ## なぜ足せるのか
#
# 助言と衝突するように見えるが、**出どころを本人の記録に限れば衝突しない。**
#
#   「配信頻度を上げると伸びます」  → 伸びを基準にした評価。外から来ている
#   「3月に同じところで止まって、
#     そのとき一つ抜いたと書いています」 → 本人が既に持っている手
#
# 後者は評価していない。約束もしていない。**次にやることの手がかりにはなる。**
#
# ## 実データで確かめた（2026-09-02）
#
# 作者の28件で10回まわし、**成立したのは1件**だった。
# 残り9件は「見つかりませんでした」。原因は記録の薄さで、
# **「困ったこと」が書かれた日だけが成立した。**
#
# だから呼ぶ側は、その欄が空なら `hint_question` の方を使う。
# 判定は `main.py` が行う。**AI に判定させない**（安く・確実に決まる）。

_HINT_BODY = """**書いた本人が過去に取った手を、いま詰まっているところへ差し出す。**

材料は本人の記録だけ。一般論・世間で言われていること・
数字から導いた改善案は使わない。**外から持ち込まない。**

## 手がかりの条件（すべて満たすときだけ出す）

1. いまの記録に、**引っかかっているところがある**
2. 過去の記録に、**同じ種類の引っかかり**がある
3. そのとき本人が**何かをした**——手を打った、やり方を変えた、
   別のことに移った。その行いが記録に書かれている

**3 が要。** 何をしたかが書かれていなければ、手がかりにならない。

## 出せないときは、一文で終える

条件が揃わなければ、**次の一文だけを返す。**

「似た場面は、これまでの記録の中には見つかりませんでした。」

理由も、惜しい候補も、日付の羅列も添えない。**一文で終える。**

**時期が近いことは手がかりではない。** 「同じ並びになっています」
「その前後に別の記録があります」は、並べただけで何も差し出していない。
これを結論にするくらいなら、見つからなかったと言う。

## 良い例

「3月14日に『構成が決まらない』と書いて、その次の日に
『思い切って一つ抜いた』と残しています。同じ手が使えるかもしれません。」

「去年の11月にも同じところで止まっていて、そのときは
『人に見せてから決めた』と書いています。」

「似た場面は、これまでの記録の中には見つかりませんでした。」

## 悪い例

「7月16日に『時間がかかった』と書いて、その翌日も作業を続けています。
同じ並びになっています。」
　→ **何をしたかが無い。** 時期が近いだけ

「休息を取ることをおすすめします。」
　→ 外から持ち込んだ一般論。記録の中に無い

「この調子で続ければ、形になります。」
　→ 未来の約束。評価でもある

「投稿の頻度を上げると反応が増えます。」
　→ 数字を基準にした改善案。最も遠い"""

_HINT_CLOSING = """**一つだけ差し出す。** 複数並べない。段落を分けない。
いつの記録かを添える（日付か、おおよその時期）。
**2文まで。120文字以内。** 丁寧体。断定しない。"""

HINT_NOT_FOUND = "似た場面は、これまでの記録の中には見つかりませんでした。"


def generate_hint(entry, past_logs):
    """過去の記録から、いまの詰まりへの手がかりを一つ返す。

    見つからなければ `HINT_NOT_FOUND` を返す。**空文字にしない**——
    呼ぶ側が「失敗」と「見つからなかった」を見分けられなくなる。
    """
    if not past_logs:
        return HINT_NOT_FOUND

    def _row(l):
        parts = [_plain(l, "created")]
        for label, key in (("よかった", "enjoyable"), ("困った", "struggled"), ("次に", "next")):
            v = _plain(l, key, "")
            if v:
                parts.append(f"{label}:{v}")
        return f"- {l.get('date', '')}: " + " / ".join(p for p in parts if p)

    user_message = f"""【いまの記録】
{_row(entry)}

【これまでの記録】
{chr(10).join(_row(l) for l in past_logs)}

いまの記録の中で引っかかっているところに、過去の記録から手がかりを一つ差し出してください。"""

    result = call_claude(lantern_prompt("この手がかりの指針", _HINT_BODY, _HINT_CLOSING),
                         user_message, max_tokens=250)
    return result.strip() if result else HINT_NOT_FOUND


# ── 手がかりのための問い ──────────────────────────────────────
#
# **材料が足りないときに、一つだけ聞く。**
#
# 書く瞬間は一行のままにしておきたい（記録しやすさの4段の2）。
# だが手がかりには詰まりと打った手が要る。**同じ入力に両方を負わせない。**
#
# 集めるのは「手がかりが欲しい」と思った瞬間にする。
# **そのとき人は詰まっている。**一番濃いところで聞ける。
#
# 答えは「困ったこと」に入る。新しい欄も表も作らない。

_QUESTION_BODY = """**いまの記録を読んで、詰まっているところを一つだけ聞く。**

聞く相手は、手がかりを求めてボタンを押した人。
**いま何かに引っかかっている。**それが記録に書かれていないので聞く。

## 聞き方

- **記録に出てくる言葉を使う。** 一般的な問いにしない
- 答えが一行で書けるものにする
- **答えなくてもよい聞き方にする。**問い詰めない

## 良い例

記録が「アプリの要件定義の洗い出し」なら
　→「洗い出していて、決めきれなかったのはどこですか。」

記録が「1日中ゴロゴロしてた」なら
　→「動く気になれなかったのは、何が引っかかっていたからですか。」

記録が「読書」なら
　→「読んでいて、手が止まったところはありましたか。」

## 悪い例

「今日はどんな一日でしたか。」
　→ 記録を読んでいない。どの日にも使える

「なぜできなかったのですか。」
　→ 責めている

「明日は何をしますか。」
　→ 詰まりではなく予定を聞いている

「どう感じましたか。」
　→ 感情を聞いている。詰まりを集めたい"""

_QUESTION_CLOSING = """**問いを一つだけ返す。** 前置きも説明も添えない。
40文字以内。丁寧体。"""


def generate_hint_question(entry):
    """材料が足りないときの問いを一つ返す。取れなければ固定の一問。"""
    body = " / ".join(
        v for v in (
            _plain(entry, "created"),
            _plain(entry, "enjoyable", ""),
            _plain(entry, "next", ""),
        ) if v
    )

    result = call_claude(
        lantern_prompt("この問いの指針", _QUESTION_BODY, _QUESTION_CLOSING),
        f"【いまの記録】\n{body or '（未記入）'}\n\nこの記録から、詰まっているところを一つ聞いてください。",
        max_tokens=80,
    )
    # **固定の一問に落ちる。**答える場所が消えるより、当たり障りない方がまし
    if not result or result == _TIMEOUT_MESSAGE:
        return "いま、どこで止まっていますか。"
    return result.strip()
