# PROJECT_MAP.md — Lantern フロントエンド機能・ファイル対応表

作成日: 2026-07-26
最終更新: 2026-07-27（`lib/date.js` 追加・今日の灯りAI生成再開に伴い行番号を更新）

---

## 1. ページ一覧（frontend/src/pages/）

### Home.jsx　— ルート `/`

| コンポーネント | 表示箇所 | 機能 |
|---|---|---|
| `RecordForm`（内部定義） | Home | 記録入力フォーム（4項目）。POST /save でログを保存し、ai_responseを表示する |
| `Home`（default export） | Home | ページ全体。日付ヘッダー・節目バナー・今日の灯り・記録フォーム・今週の発見を表示する |

**Home内の主要セクション：**

| セクション名 | コード箇所 | 機能 | API |
|---|---|---|---|
| 日付ヘッダー | L221–L231 | 今日の日付と連続日数（streak）を表示する。streakは `lib/date.js` の `calcStreak()` | なし（ローカル計算） |
| **節目バナー** | L232–L270 | 記録開始から30/90/180日の節目にバナーを表示する。展開するとAI観察・問いを表示する | GET /api/milestone、GET /api/milestone/reflection |
| **今日の灯り** | L271–L284 | AIが前日の記録から生成した一言を深緑カードで表示する。前日の記録がない日は固定文 | GET /api/daily/quote |
| 記録フォーム | L285–L302 | 今日または過去日付の記録を入力・保存する（`?date=` クエリで過去日編集） | POST /save |
| **今週の発見** | L303–L355 | 過去7日間のログからテンプレート文を生成して表示する（**AIなし**） | なし（フロントエンドのみ） |

---

### Journal.jsx　— ルート `/journal`

2つのタブ（「記録」「振り返り」）を持つ。

| コンポーネント | 表示箇所 | 機能 |
|---|---|---|
| `LogDetail` | 記録タブ・モーダル | ログの詳細表示・編集・削除を行う。ai_responseをティールカードで表示する |
| `PatternCard` | 振り返りタブ | observation（観察）＋question（問い）の1ペアを表示するカード |
| `ReviewSection` | 振り返りタブ | 週次・月次の振り返りをAI生成して表示する（キャッシュはlocalStorage） |
| `TimelineSection` | 振り返りタブ | 「**過去との対話**」セクション（後述） |
| `LogItem` | 記録タブ | ログ一覧の折りたたみ行。タップでLogDetailを展開する |
| `Journal`（default export） | Journal全体 | タブ切り替え・ログ一覧・検索・カレンダー・モーダルを管理する |

**Journal記録タブの主要セクション：**

| セクション名 | コード箇所 | 機能 | API |
|---|---|---|---|
| 今月の灯りバッジ | L555–L562 | 今月の記録日数を表示するバッジ | なし |
| ActivityCalendar | L565 | 月別カレンダー。記録ありの日をamber色表示し、タップで詳細表示または新規モーダルを開く | なし |
| 検索ボックス | L583–L604 | created/enjoyable/struggled/next の全文検索（フロントのみ） | なし |
| 月別ログ一覧 | L625–L643 | 月ごとにグループ化したログ一覧（LogItem） | なし |
| 記録モーダル | L654–L713 | カレンダーで未記録日をタップした際に表示される記録フォーム | POST /save |

**Journal振り返りタブの主要セクション：**

| セクション名 | コード箇所 | 機能 | API |
|---|---|---|---|
| 今週の振り返り（ReviewSection） | L648 | 過去7日間の記録からAIがパターン（observation/question）を生成する | POST /api/review/generate?type=weekly |
| 今月の振り返り（ReviewSection） | L649 | 今月の記録からAIがパターンを生成する | POST /api/review/generate?type=monthly |
| **過去との対話**（TimelineSection） | L300–L410 | 1/3/6ヶ月前の同週ログと現在のログを並べ、AIが観察・問いを生成する | GET /api/timeline-reflection?months_ago= |

---

### Insights.jsx　— ルート `/insights`

AIによるコメントなし。ログデータを可視化・並列表示のみ。

| コンポーネント | 表示箇所 | 機能 |
|---|---|---|
| `LogSnapshot`（L30） | Insights過去比較 | 1件のログを日付・フィールド別に表示するカード |
| `KeywordSection`（L76–L137） | Insightsキーワード | 「**キーワードの変化**」セクション（後述） |
| `Insights`（default export） | Insights全体 | 記録密度マップ・過去比較・キーワードの3セクションを管理する |

**Insightsの主要セクション：**

| セクション名 | コード箇所 | 機能 | API |
|---|---|---|---|
| **記録密度マップ** | L160–L175 | ActivityCalendarを読み取り専用（onDateSelect=空）で表示する | なし（/api/logs） |
| **過去記録との比較** | L176–L200 | 1/3/6/12ヶ月前の最近傍ログと今日のログをカラム表示する（AIなし） | なし（/api/logs） |
| **キーワードの変化**（KeywordSection） | L76–L137 | 「Lanternに聞く」ボタンで直近1/3/6ヶ月のキーワードをAI抽出して表示する | GET /api/insights/keywords?period= |

---

### Dashboard.jsx　— ルート `/dashboard`

YouTube連携専用ページ。記録との接点はAPIが/api/logsを参照する箇所のみ。

| コンポーネント | 表示箇所 | 機能 |
|---|---|---|
| `SummaryCard` | Dashboard | 数値サマリーカード（総再生数・動画数など） |
| `AnalyticsSection` | Dashboard | 期間別再生回数折れ線グラフ（recharts使用） |
| `VideoTimeline` | Dashboard | 動画グリッド。1本ずつAI観察を取得できる |
| `Dashboard`（default export） | Dashboard全体 | YouTube OAuth連携・動画一覧取得・連携解除を管理する |

---

### Settings.jsx　— ルート `/settings`

| セクション | 機能 |
|---|---|
| アクティビティ | 記録した日数合計・現在の連続日数を表示する（/api/logsを取得してフロントで計算） |
| 表示 | ライト/ダークテーマ切り替えボタン |
| データ | ログのJSONエクスポート |
| アカウント | ログアウト（Supabase Auth） |
| Lanternについて | APP_VERSIONとコンセプト文 |

---

### Login.jsx　— ルート（未認証時）

Supabase Auth のメールアドレス＋パスワード認証（`signInWithPassword` / `signUp`）。
ログインと新規登録をボタンで切り替える1画面構成。

---

## 2. コンポーネント一覧（frontend/src/components/）

| ファイル名 | 使用箇所 | 機能 |
|---|---|---|
| `ActivityCalendar.jsx` | Journal（記録タブ）・Insights（記録密度） | 月別カレンダー。記録ありの日をamber色、今日をaccent色でハイライトする。Journal側はタップで日付選択、Insights側は読み取り専用 |
| `Sidebar.jsx` | md以上の全ページ左側 | PC/タブレット用固定サイドナビ。今日/記録/振り返り/ダッシュボード/設定の5項目 |
| `HamburgerMenu.jsx` | モバイル全ページ | モバイル用ドロワーナビ。Sidebarと同じ5項目 |
| `SplashScreen.jsx` | App起動時・Lanternロゴタップ時 | 起動画面。Unsplash背景 + AI一言（またはフォールバック文）を表示し4秒後に自動遷移する |

---

## 3. ライブラリ・ユーティリティ（frontend/src/）

| ファイル名 | 役割 |
|---|---|
| `lib/supabase.js` | Supabaseクライアント初期化・`authFetch()`（JWTをHeaderに付与するfetchラッパー）の提供 |
| `lib/date.js` | `localDateStr()` / `todayStr()` / `calcStreak()`。日付はローカルタイムゾーン基準（`toISOString()` はUTC変換で日付がずれるため使わない） |
| `constants.js` | `APP_VERSION`（現在 `v2.0`）のexport |
| `App.jsx` | BrowserRouterによるルーティング・Supabase Authセッション管理・テーマ状態管理 |
| `main.jsx` | Reactアプリのエントリーポイント |

---

## 4. 特定機能名と実装箇所の対応

| 機能名 | ファイル | コード箇所 | 説明 |
|---|---|---|---|
| **過去との対話** | Journal.jsx | L300–L410（`TimelineSection`） | 振り返りタブ内。1/3/6ヶ月前の同週ログとAI観察・問いを表示する |
| **今週の発見** | Home.jsx | L303–L355 | Homeの最下部。AIなし。テンプレートベースで観察文を生成する |
| **節目バナー** | Home.jsx | L232–L270、L152–L188（useEffect） | 30/90/180日節目にHomeの上部に表示するバナー |
| **今日の灯り** | Home.jsx / modules/ai.py | L271–L284 / `get_daily_quote()` | 前日の記録がある日のみAI生成。Supabase `daily_quotes` に1日1回キャッシュする |
| **過去記録との比較** | Insights.jsx | L176–L200 | 1/3/6/12ヶ月前の最近傍ログを今日と横並び表示する（AIなし） |
| **キーワードの変化** | Insights.jsx | L76–L137（`KeywordSection`） | 直近1/3/6ヶ月の頻出単語と出現回数をAI抽出して表示する |
| **記録密度マップ** | Insights.jsx | L160–L175 | ActivityCalendarを読み取り専用で表示する |

---

## 5. 重複・類似の懸念

### 懸念①：「過去との対話」（Journal）と「過去との比較」（Insights）が混在

| | Journal – 過去との対話（TimelineSection） | Insights – 過去との比較 |
|---|---|---|
| 表示場所 | Journal振り返りタブ | Insightsページ |
| 期間単位 | 1/3/6ヶ月前の「同週」のログ | 1/3/6/12ヶ月前の「最近傍1件」 |
| AI | あり（observation/question生成） | なし（生のログをそのまま表示） |
| 起動 | ボタン押下で都度生成 | ページ読み込み時に自動表示 |

**リスク：** 両機能とも「過去と今を見比べる」目的で、ユーザーから見ると重複に映る可能性がある。

---

### 懸念②：「今週の発見」（Home）と「今週の振り返り」（Journal）が類似

| | Home – 今週の発見 | Journal – 今週の振り返り（ReviewSection） |
|---|---|---|
| 表示場所 | Home最下部 | Journal振り返りタブ |
| 生成方法 | テンプレートベース（AIなし） | AI生成（POST /api/review/generate） |
| 内容 | 直近7日間のログからフィールド引用 | 直近7日間のログからパターン抽出 |

**リスク：** 「発見」と「振り返り」という名称の違いは意図的だが、コードを読まないと区別しにくい。

---

### 懸念③：`localDateStr` 関数の重複 — 解消済み（2026-07-27）

`frontend/src/lib/date.js` に `localDateStr` / `todayStr` / `calcStreak` を集約し、
Home・Journal・Insights・Settings・ActivityCalendar・SplashScreen の重複定義を削除した。
streak計算も Home・Settings の二重実装を `calcStreak()` に統一している。

---

### 懸念④：ルート名「Insights」とページ内容の乖離リスク

現在のルート `/insights`（ナビ表示名「振り返り」）はジャーナリング記録の振り返りページ。  
`/dashboard`（ナビ表示名「ダッシュボード」）はYouTube分析ページ。  
"Insights"という語はYouTube Studioでも使われるため、将来ユーザーが混乱する可能性がある。現状はナビの日本語表示名（「振り返り」）で区別できているため、即時修正は不要。

---

*このファイルはコードベースを読み取って生成した事実の記録です。推測・設計意図は含みません。*
