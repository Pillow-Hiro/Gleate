# Lantern v1.0 UX/UIレビュー

レビュー日: 2026-07-22
対象バージョン: v1.0
対象ファイル: Home.jsx / Journal.jsx / Dashboard.jsx / Settings.jsx / Sidebar.jsx / HamburgerMenu.jsx / modules/ai.py

---

## 良い点

**デザインシステムの完成度**
cream/stone/parchment/forest/sage のカラーパレット、Noto Serif JP（display）+ Noto Sans JP（body）の組み合わせ、uppercase tracking スタイルが全画面で一貫している。ダークモードは `--color-primary` 系の夜の書斎変数が整理されており、ライト・ダーク両方でトーンが崩れていない。

**入力負荷の最小化が実現できている**
Home の RecordForm は「今日のこと（5行）」「次にやること（2行）」だけが常時表示。詳細フィールドは折りたたみで隠れており、1分以内記録の設計が守られている。

**AI憲法がコードに実装されている**
`_LANTERN_CONSTITUTION` が全 AI エントリポイントで参照され、禁止ワードリストが明示的。`_PATTERNS_SYSTEM` の observation + question 形式は「答えを求めない問い」を正しく実現している。

**Journal の ReviewSection 設計**
localStorage キャッシュ（`lantern-review-{type}`）で再訪時に即表示、フェードアニメーション付き再生成、スケルトンローダーが完成している。「振り返る」ボタンを押すまで何も表示しない設計が、ユーザーの主体性を守っている。

**インライン編集の完成度**
LogDetail の editing/editForm/saving 状態管理が明確で、保存失敗時に編集状態を維持するフォールバックも適切。

**Dashboard の節制**
チャンネル統計（登録者数・再生回数）は「アナリティクスを見る」折りたたみ内にデフォルト非表示。数字を前面に出さない設計が Lantern の理念と一致している。

---

## 問題点

### Must（すぐに直すべき）

#### M1: 「今週の発見」のテンプレート文がLanternトーン違反

場所: Home.jsx:396-415

現在の文:
```
「〇〇」が楽しかったこととして残っています。何がそうさせているのか、少し深めてみると見えてくるものがありそうです。
「〇〇」が次の実験として残っています。そこから何かが動き始めるかもしれません。
夜の時間帯に記録が続いています。朝に書くとどう変わるか、試してみるのも面白いかもしれません。
```

違反内容:
- 「見えてくるものがありそうです」→ CLAUDE.md禁止「続ければ〇〇できます」と同構造の予言
- 「動き始めるかもしれません」→ 同上
- 「朝に書くとどう変わるか」→ 夜型クリエイターへの暗黙の価値付け（CLAUDE.md「独自性を尊重する」違反）

#### M2: Skeleton コンポーネントが旧レイアウト（横スクロール）のまま

場所: Dashboard.jsx:276-298

VideoTimeline は3カラムgridに変更済みだが、ローディング中に表示される Skeleton が flexRow / width:200px の旧レイアウトのまま。ロード中と表示後でレイアウトが大きく食い違い、ガタつきが発生する。

#### M3: 「今日の灯り」が記録保存のたびに再取得される

場所: Home.jsx:288, Home.jsx:373

`onSaved()` → `refreshData()` → `refreshTick++` → quote も再取得。「今日の灯り」は1日1回の生成であるべきものが、記録のたびに変わる。現在は固定メッセージランダム選択なので体験上の問題は小さいが、将来 AI 生成に戻したときに毎回 API コールが走る設計的負債になる。

---

### Should（近いうちに直すべき）

#### S1: ストリークロジックがHomeとSettingsで別実装・不一致

場所: Home.jsx:317-330 / Settings.jsx:44-55

| ファイル | ロジック |
|---|---|
| Home.jsx | 今日に記録がなければ昨日から遡る |
| Settings.jsx | 無条件に今日から遡る |

同じ「連続日数」なのに異なる数値を返す可能性がある。`useStreak(logs)` カスタムフックとして共通化すべき。

#### S2: Settingsのテーマ切り替えボタンだけ絵文字

場所: Settings.jsx:88-89

`☀️ ライトに切替` / `🌙 ダークに切替` の文字絵文字。Sidebar と HamburgerMenu は SVG `ThemeIcon` コンポーネントで統一されているのに Settings だけ不一致。

#### S3: Dashboard「Lanternに聞く」ボタンのdisabled理由が不明

場所: Dashboard.jsx:529

`disabled={channelInsightLoading || !videos?.length}` — `videos` が `null`（データ取得中）でも `[]`（動画0件）でもどちらも disabled になり、ユーザーには理由が分からない。

#### S4: Journal画面の情報密度がモバイルで重い

カレンダー → 選択日詳細 → 週次振り返り → 月次振り返り → 検索 → ログ一覧 が縦一列。モバイルでは体感的に長い。特に「今週の振り返り」「今月の振り返り」のセクションがデフォルト展開されているため、ログ一覧まで辿り着くスクロール量が多い。

#### S5: ReviewSection のキャッシュが「今週のデータか」を確認していない

場所: Journal.jsx:302-310

`generatedAt` を localStorage に保存しているが、「生成日が先週か今週か」のチェックがない。月曜に「先週の振り返り」を生成し、翌週の月曜に Journal を開いても先週のパターンが表示されたままになる。

---

### Could（将来的に検討）

#### C1: 創作カレンダーが単色（amber）で CLAUDE.md の4色仕様が未実装

CLAUDE.md 仕様: 🟩創作した / 🟦投稿した / 🟨振り返りした / 🟪実験した
ログに活動種別フィールドがないため、DB 設計を含む大きな変更が必要。

#### C2: 月グルーピングの境界に視覚的メリハリが薄い

月のラベル行が `text-xs text-ink-soft` と控えめで、長い一覧では月の境界が分かりにくい。

#### C3: カレンダーで記録のない日を選択したときの空状態に導線がない

「この日の記録はありません」のみ表示（Journal.jsx:499）。「Home で記録する」への導線が薄い。

---

## 各画面の改善案

### Home

**M1 対応: 今週の発見 テンプレート文修正**

```js
// 改善後
if (latestEnjoyable)
  observations.push(`「${snip(latestEnjoyable)}」が楽しかったと残っています。`)

if (latestNext)
  observations.push(`「${snip(latestNext)}」が次の実験として残っています。`)

if (latestStruggled && !latestEnjoyable)
  observations.push(`「${snip(latestStruggled)}」が詰まったこととして残っています。それでも記録は続いています。`)

if (eveningCount >= 2)
  observations.push('夜の時間帯に記録が続いています。')
```

原則: 観察だけで終わる。「〜すると〜かもしれません」の二重構造を作らない。問いかけは ReviewSection の AI 生成に任せる。

**M3 対応: 今日の灯りキャッシュ**

```js
// Home.jsx の quote 取得前にチェック
const cached = JSON.parse(localStorage.getItem('lantern-quote') || 'null')
if (cached?.date === todayStr()) {
  setQuote(cached.quote)
} else {
  // API 取得後に保存
  localStorage.setItem('lantern-quote', JSON.stringify({ date: todayStr(), quote: quoteData.quote }))
}
```

---

### Journal

**S4 対応: ReviewSection をデフォルト折りたたみに**

ReviewSection の初期状態を折りたたみにして、localStorage にパターンがある場合のみ展開表示する。またはセクション見出しをタップで開閉できるようにする。

**S5 対応: キャッシュ有効期限チェック**

```js
// 今週の月曜日以降に生成されたかを確認
const thisWeekMonday = new Date()
thisWeekMonday.setDate(thisWeekMonday.getDate() - thisWeekMonday.getDay() + 1)
thisWeekMonday.setHours(0, 0, 0, 0)
const isStale = !generatedAt || new Date(generatedAt) < thisWeekMonday
// isStale なら patterns を null にリセット
```

**C3 対応: 空状態の導線追加**

```jsx
{selectedDate && !selectedLog && (
  <div className="text-center mt-3 space-y-2">
    <p className="text-xs text-ink-faint">この日の記録はありません</p>
    <a href={`/?date=${selectedDate}`} className="text-xs text-forest hover:underline">
      この日の記録を書く
    </a>
  </div>
)}
```

---

### Dashboard

**M2 対応: Skeleton を3カラムに修正**

```jsx
function Skeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
      {[1, 2, 3].map(i => (
        <div key={i} className="animate-pulse">
          <div className="h-2.5 w-20 bg-parchment rounded mb-2" />
          <div className="w-full aspect-video bg-parchment rounded-lg" />
          <div className="h-3 bg-parchment rounded w-4/5 mt-2" />
          <div className="h-2.5 bg-parchment rounded w-2/5 mt-1.5" />
        </div>
      ))}
    </div>
  )
}
```

**S3 対応: disabled 理由の明示**

```jsx
const insightDisabledReason = dataLoading
  ? '動画を取得中'
  : !videos?.length
    ? '動画がありません'
    : null

<button
  disabled={channelInsightLoading || !!insightDisabledReason}
  title={insightDisabledReason ?? undefined}
  ...
>
```

---

### Settings

**S1 対応: ストリーク共通化**

`src/lib/streak.js` を作成し、Home と Settings で同じロジックを使う。

```js
// src/lib/streak.js
export function calcStreak(logs) {
  const logSet = new Set(logs.map(l => l.date))
  const start = new Date()
  if (!logSet.has(localDateStr(start))) start.setDate(start.getDate() - 1)
  let count = 0
  const check = new Date(start)
  for (let i = 0; i < 365; i++) {
    if (!logSet.has(localDateStr(check))) break
    count++
    check.setDate(check.getDate() - 1)
  }
  return count
}
```

**S2 対応: テーマボタン統一**

Settings の `☀️ ライトに切替` / `🌙 ダークに切替` テキストを、ThemeIcon SVG + ラベルに変更する。

---

## AI人格の改善案

### 問いかけ型振り返りは高品質

`_PATTERNS_SYSTEM`（ai.py:216-246）の設計は優れている。observation（事実の観察）+ question（余韻を残す問い）の分離が、「答えを求めない」Lantern の姿勢を正確に実装している。

良い例（現在の実装から）:
```
observation: "今週、夜に書いた記録が3日ありました。"
question: "あなたにとって夜の創作はどんな時間ですか。"
```

### 改善が必要な箇所: LANTERN_MESSAGES の1件

現在: `"今日のことを、言葉にしてみてください。"`
問題: 「〜してみてください」は命令形に近い。CLAUDE.md「命令しない」に抵触。

改善案: `"今日のことが、言葉を待っています。"`

### 「今週の発見」テンプレートの設計原則

テンプレート文がどうしても「パターン→推奨行動」の構造になりやすく、Lantern のトーンを保つのが難しい。問いかけはなく、短い観察事実だけにする。

Lanternらしいテンプレート文の原則:
1. 事実を述べる（「〇〇が残っています」）
2. 観察で終わる（「〜かもしれません」で続けない）
3. 対比を置く場合は評価にしない（「詰まっていた。それでも記録は続いています。」）

---

## 思想監査（AI Philosopher）

### Lanternの思想に沿っているか

守られている:
- 「評価しない・観察する」— AI プロンプト全体で一貫。`generate_channel_insight` でも「数字による序列化」を明示禁止している
- 「最終決定権は人にある」— ReviewSection は「振り返る」ボタンを押すまで何も生成しない設計
- 「独自性を尊重する」— コアのプロンプトレベルでの違反はゼロ
- Settings「評価しない、決めない、照らすだけ。」— コンセプト説明として完璧

グレーゾーン:
- Home.jsx:409「朝に書くとどう変わるか」— 夜型クリエイターへの暗黙の価値付け
- LANTERN_MESSAGES「今日のことを、言葉にしてみてください。」— 命令形が微妙

明確な違反:
- Home.jsx:396「見えてくるものがありそうです」— CLAUDE.md 禁止表現「続ければ〇〇できます」と同構造の予言

### AIが伴走者の立場を維持できているか

Journal の ReviewSection 設計は完成度が高く、「ボタンを押した人だけに届く」という設計が伴走者の受動的な姿勢を体現している。Dashboard の「Lanternに聞く」ボタンも同様。

一方、Home の「今週の発見」はユーザーがボタンを押さなくても自動表示されるため、AI が自動的に語りかける構造になっている。内容がテンプレートであることを含め、この画面だけ設計哲学の一貫性がやや薄い。

### 独自の価値を強める改善か

今回特定した改善は、いずれも「削ること・余白を増やすこと」を中心としている。これは Lantern の理念「思想を体験として提供する」に最も沿った方向性。追加するより引き算する設計変更が、Lantern らしさを強化する。

v1.1 で最も価値のある1本の修正: M1（今週の発見のテンプレート文短縮）。小さいコード変更だが、毎日 Home を開くユーザーが最も多く触れる文章であり、思想の体験として届くかどうかの分岐点になる。

---

## 優先順位サマリー

| 優先度 | 番号 | 内容 | 工数概算 |
|---|---|---|---|
| Must | M1 | 今週の発見テンプレート文修正 | 小 |
| Must | M2 | Skeleton を3カラムgridに修正 | 小 |
| Must | M3 | 今日の灯りキャッシュ（localStorage） | 小 |
| Should | S1 | ストリークロジック共通化 | 小 |
| Should | S2 | Settingsテーマボタンをアイコン統一 | 小 |
| Should | S3 | Dashboard disabled状態のUI分岐 | 小 |
| Should | S4 | Journal ReviewSection デフォルト折りたたみ | 小 |
| Should | S5 | ReviewSection キャッシュ有効期限チェック | 小 |
| Could | C1 | 創作カレンダー4色化 | 大（DB設計含む） |
| Could | C2 | 月グルーピング視覚的強化 | 小 |
| Could | C3 | 空状態の導線追加 | 小 |
