# Lantern v1.2 全体レビュー

レビュー日: 2026-07-26
対象: Home.jsx, Journal.jsx, Dashboard.jsx, Settings.jsx, SplashScreen.jsx, modules/ai.py
観点: 1. Lanternの哲学との一致 2. AI憲法の遵守 3. UI/UXの完成度 4. 機能の一貫性

---

## 良い点

### 哲学・理念

- SplashScreen の FALLBACKS が全件、自灯明哲学に忠実な文言に統一
  （「灯りは、外から来るのではない。」等）
- 「今週の発見」（Home.jsx L322-344）がユーザーの言葉をそのまま引用し、
  評価せず問いで閉じる — AI憲法7原則を最もよく体現している箇所
- Settings の「コンセプト」文言が「静かに寄り添う、あなただけの伴走者。」に更新済み

### カラーシステム

- 深緑（今日の灯り・節目バナー）/ ティール（AIの観察）の役割分離が
  Home・Journal・Dashboard で一貫している
- 節目バナーの bg-white/10 内包カードが深緑の上に読みやすく浮かぶ設計

### AI実装

- LANTERN_IDENTITY をすべての AI 関数で共有しており、プロンプトの一貫性が確保されている
- get_ai_response() のシステムプロンプト（ai.py L146-161）が
  具体的な良い例を内包し、抽象的な指示になっていない
- generate_timeline_reflection() / generate_milestone_reflection() が
  {observation, question} のペアで返す — 哲学原則3「問いを置く」を構造として強制している

### UX

- 節目バナーの grid-rows-[0fr]/[1fr] アコーディオンが滑らか
- localStorage で既読管理 — 毎回表示されないことでバナーの重みが保たれる
- TimelineSection の月切り替え時に setData(null) でリセット（Journal.jsx L314）
  — 古いデータが残らない

---

## 問題点

### Must（必ず修正）

**M1. Home.jsx L281 — fallback quote の断定表現**

  現在: {quote || '今日も記録することが、すでに答えだ。'}
  問題: 「すでに答えだ」は断定表現。AI憲法7原則「ユーザーを正しい方向に導こうとしない」に違反。
        quote の取得失敗時にユーザーが見る文言。
  修正案: '今日の記録が、ここに残る。'

**M2. Journal.jsx L128 — placeholder に禁止ワード**

  現在: { field: 'next', label: '次にやること', placeholder: '次の一歩' }
  問題: 「一歩」は CLAUDE.md 禁止ワードリストに明記されている。
        記録フォームに毎回表示される。
  修正案: placeholder: '（任意）'

---

### Should（品質として修正を推奨）

**S1. streak 計算ロジックの不一致**

  Home.jsx L206-218: 「今日に記録がなければ昨日から遡る」処理あり
  Settings.jsx L44-55: 単純ループで今日から遡る（処理なし）
  問題: 今日未記録の場合に両画面で異なる数値が表示される。
  修正案: Home のロジックを Settings に適用する。

**S2. Journal.jsx L173 — ai_response カードのスタイル不一致**

  現在: bg-sage-light rounded-lg
  PatternCard: bg-sage-light/60 border border-sage/20 rounded-xl
  問題: 同じ「AIの観察」役割なのに LogDetail と PatternCard で見た目が異なる。

**S3. ai.py コメントアウト内に禁止ワードを含む旧フォールバック**

  ai.py L261-267 のコメント内
  「始める前の一歩が、一番遠い。」「続けることに、やがて意味が宿る。」等
  問題: AI生成を再開する際に誤って採用されるリスク。要整理。

---

### Could（改善の機会）

**C1. localDateStr() が5箇所に重複定義**

  Home / Journal / Settings / SplashScreen / ActivityCalendar
  候補: src/lib/date.js に切り出す。

**C2. get_daily_quote() が全コメントアウトでランダム返却のみ**

  「今日の灯り」はLanternの体験の中核なのに固定テキストのランダム選択。
  AI生成の再有効化が最もインパクトの大きい機能改善になる。

**C3. Dashboard.jsx L547 — インラインスタイルが残留**

  style={{ gridTemplateRows: analyticsOpen ? '1fr' : '0fr' }}
  ラウンド4で他箇所を Tailwind に変換したが、ここだけ残っている。

---

## 優先度の高い改善案 TOP3

### 1位 — Home.jsx L281 fallback quote の修正（M1）

影響範囲: Home.jsx 1行。修正コスト: 極小。
インパクト: 毎日ユーザーが目にする中核体験への違反。
変更: '今日も記録することが、すでに答えだ。' → '今日の記録が、ここに残る。'

### 2位 — Journal.jsx L128 placeholder の修正（M2）

影響範囲: Journal.jsx 1行。修正コスト: 極小。
インパクト: 記録フォームは最も使用頻度の高いUI要素。
変更: '次の一歩' → '（任意）'

### 3位 — streak 計算の Settings への統一（S1）

影響範囲: Settings.jsx のみ。修正コスト: 小。
インパクト: 「記録した日数」はユーザーが自分の継続を確認する唯一の数値。
           Home と違う数字が出ると信頼性が損なわれる。
変更: Home の streak ロジック（L206-218）を Settings にも適用する。
