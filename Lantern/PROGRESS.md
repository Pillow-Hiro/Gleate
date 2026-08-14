# PROGRESS.md — 開発進捗記録

## 現在のバージョン：v2.0

---

## 完了済み

### 2026/06/10

**思想・設計**
- [x] プロジェクト思想・理念の言語化（Creator Companion Manifesto）
- [x] AI憲法の策定
- [x] チーム憲章策定（9つの役割定義）
- [x] CLAUDE.md 作成（開発ガイド・AI憲法・ロードマップ・チーム憲章）
- [x] MVP_SPEC.md 作成（MVP仕様書）
- [x] PROGRESS.md 作成（開発進捗記録）

**開発**
- [x] Flask + Python でMVP開発
- [x] Anthropic Claude API連携（claude-sonnet-4-6）
- [x] 毎日の創作ログ機能（4項目入力）
- [x] AI伴走コメント機能
- [x] 今週のまとめ表示
- [x] 過去ログ履歴ページ
- [x] .env によるAPIキー管理
- [x] APIキーなしのデモ動作モード

**インフラ・運用**
- [x] GitHubリポジトリ作成・管理（Private）
- [x] Render へのデプロイ（HTTPS対応）
- [x] 本番URL：https://creator-companion.onrender.com
- [x] Claude Code 導入（VS Code拡張機能）

---

## 完了済み（続き）

### 2026/06/10（追加）

**UI/UX改善（v0.1 polish）**
- [x] 「Creator Companion」ラベルの統一確認（index.html・logs.html）
- [x] ブログ感を削減 — チャット・日記寄りUIに変更（会話的ラベル、フォームからジャーナルへ）
- [x] 初回訪問者向けウェルカムノートを追加（is_first_visit条件で表示）
- [x] 継続日数の可視化 — 7日間アクティビティドット + ストリークバッジ
- [x] `get_streak()` 関数追加（North Star Metric: 継続日数の計算）
- [x] `get_recent_activity()` 関数追加（7日間ログ状況を配列で返す）

**AI Engineer（プロンプト改善）**
- [x] 「次の実験：」「アクション：」ラベル禁止をシステムプロンプトに明記
- [x] NGパターン全7項目をCLAUDE.mdと完全一致させた（才能判定・数字評価・継続否定・プレッシャー・流行迎合・人格評価・創作意欲毀損）

---

### 2026/06/10（追加2）

**UI/UX改善（日付表示・バッジ）**
- [x] 「今週の記録」見出しを日付範囲表示に変更（JS自動計算: 例「今週の記録　2026/06/09 〜 06/15」）
- [x] 週次目標ゴールチップラベルも日付範囲（コンパクト形式: 例「06/09〜06/15」）に変更
- [x] 継続日数バッジをリデザイン：🔥絵文字追加・サイズ拡大（0.72rem→0.875rem）・amber系カラーでコントラスト強化・「N日継続中」→「🔥 N日連続」

---

## 完了済み（続き）

### 2026/06/12

**リブランディング**
- [x] アプリ名を全ファイルで「Creator Companion」→「Lantern」に変更（templates/base.html・index.html・logs.html・goals.html・review.html、modules/ai.py、main.py）
- [x] ウェルカムテキストを更新（「あなたの毎日を記録して、Lanternと一緒に振り返りましょう。」）
- [x] モバイルハンバーガーメニューをページタイトルに被らないよう修正（フローティングボタン廃止→固定ヘッダーバー方式に変更、Lanternロゴを表示）
- [x] CLAUDE.md・PROGRESS.md・MVP_SPEC.mdの「Creator Companion」を「Lantern」に統一

**起動画面（Splash Screen）**
- [x] Unsplash API連携（自然・風景写真をランダム取得、6時間キャッシュ）
- [x] AI生成の朝の一言（30文字以内・スヌーピー風）、フォールバック5件
- [x] 4秒後またはタップでメイン画面へ遷移（プログレスバー表示）
- [x] 一日1回だけ表示（localStorage: lantern_splash_date）
- [x] Unsplash未設定時はグラデーション背景にフォールバック
- [x] 環境変数: UNSPLASH_ACCESS_KEY（Render・.envに追加が必要）

**AIプロンプト汎用化**
- [x] modules/ai.pyの「創作」を「活動」に変更（5箇所：システムプロンプト・user_message・フォールバック文）
- [x] 活動の種類を問わない汎用的な伴走者として機能するよう修正

---

## MVPレビュー（2026/06/13）

### 良かった点
- AIが主役になっていない（思想と一致）
- 入力項目が自然（継続重視の設計）
- 静かなUI（Notion・MUJI・Journal風）
- 数字依存していない

### 気になった点
- Lanternらしさがまだ弱い
- 感情価値が弱い（記録アプリ止まり）
- 振り返りが見えない

### 現時点の評価
- 思想：9/10
- UI：7.5/10
- UX：7/10
- 独自性：6/10
- 実現可能性：9/10

### 次のアクション
- 今日の灯りをホーム画面に配置
- ホーム画面を「今日の灯り→カレンダー→記録」の順に変更
- 振り返りを主役にする
- AI人格の磨き込み（スヌーピー・愛犬チョコのようなトーン）

---

## 完了済み（続き）

### 2026/07（v1.0〜v1.2）

**React + Vite フロントエンド移行（v0.2〜v1.0）**
- [x] React + Vite + Tailwind CSS v4 へ全面移行
- [x] Supabase PostgreSQL へデータ移行（JSONファイル廃止）
- [x] Supabase Auth 導入（メールアドレス＋パスワード認証）
- [x] Flask を API サーバー専用に再設計
- [x] Vercel フロントエンドデプロイ（lantern-inky-three.vercel.app）
- [x] Sidebar / HamburgerMenu / SplashScreen コンポーネント実装
- [x] Home / Journal / Dashboard / Insights / Settings ページ実装
- [x] ActivityCalendar コンポーネントを共通化（Home・Journal 両ページで再利用）
- [x] YouTube API 連携（Dashboard）

**AI・プロンプト**
- [x] LANTERN_IDENTITY 定数を modules/ai.py に統一（全 AI 関数で共有）
- [x] 今日の灯り（LANTERN_MESSAGES から random 返却）
- [x] 週次・月次パターン分析（get_weekly_review / get_monthly_review）
- [x] タイムライン振り返り API（GET /api/timeline-reflection・generate_timeline_reflection）
- [x] 節目の振り返り AI 関数（generate_milestone_reflection）

**UI 統一（ラウンド4）**
- [x] 非標準フォントサイズを Tailwind 標準に統一（text-[11px]→text-xs、text-[13px]→text-sm）
- [x] インラインスタイルを Tailwind クラスに変換（bg-background-info → bg-background-info）
- [x] カードの色を役割で統一（深緑 = Lanternの言葉 / ティール = AIの観察）
- [x] ボタンスタイルを全ページで統一

**機能追加（v1.0〜v1.2）**
- [x] ホーム画面 節目バナー（GET /api/milestone・localStorage 既読管理）
- [x] Journal 振り返りタブ タイムライン振り返りセクション（TimelineSection）
- [x] 節目バナー API 最適化：判定（/api/milestone）と AI 生成（/api/milestone/reflection）を分離、localStorage キャッシュでAnthropicAPI呼び出しを1デバイスあたり1回に削減

**文言・哲学対応**
- [x] SplashScreen FALLBACKS を AI 憲法準拠の文言に全置換（2026/07/25）
- [x] Home フォールバック文言修正：「すでに答えだ」→「今日の記録が、ここに残る。」（2026/07/26）
- [x] Journal・記録フォームの placeholder 修正：「次の一歩」→「（任意）」×2 箇所（L128・L692）（2026/07/26）
- [x] modules/ai.py コメントアウト内の禁止ワードを含む旧フォールバックを修正（2026/07/26）
- [x] バージョン番号 v0.6→v1.2 更新（constants.js）（2026/07/26）

**Insights機能**
- [x] Insightsページ新規作成（記録密度マップ・過去との比較）（2026/07/26）
- [x] Insightsキーワード変化機能：GET /api/insights/keywords?period=1m|3m|6m、localStorage 1日TTLキャッシュ、感情分類なし（2026/07/26）

**設計判断（変更なし）**
- [−] 「過去との対話」空状態メッセージ：検討の結果、現状維持で決定
- [−] マルチモーダル記録（写真・動画・作品・音楽）：個人開発のコスト制約を踏まえ一旦保留。設計書（DESIGN_multimodal_v1.3.md）は残す。代替案（画像圧縮・Cloudflare R2）を検討済み。テキストのみでの運用実績を見てから再検討。

**ドキュメント**
- [x] REVIEW_v1.2.md 作成（哲学・AI憲法・UI/UX・機能一貫性の4観点レビュー）
- [x] DESIGN_multimodal_v1.3.md 作成（マルチモーダル記録設計書・保留中）

---

### 2026/07/27（品質固め）

**今日の灯り AI生成の再開（REVIEW_v1.2 C2）**
- [x] `get_daily_quote()` を再実装（modules/ai.py）。戻り値を `(quote, source)` に変更
  - 前日の記録がある日のみAI生成する。前日記録がない日は `LANTERN_MESSAGES` を返し、AIを呼ばない
  - 理由：離脱期間への言及（「〇日ぶりですね」等）を、プロンプトの指示ではなく**入力データの構造**で禁止するため。前日以外のログをAIに渡さない
  - `call_claude()` はタイムアウト時に「AIの応答に時間がかかっています…」を返すため、この文言が灯りとして表示されないようガードを追加
  - 存在しない `_LANTERN_CONSTITUTION` を参照していた旧コメント（L259–321）を削除。コメントを外すだけでは `NameError` になる状態だった
- [x] Supabase `daily_quotes` テーブルを新設し、1ユーザー×1日1回だけ生成する構成に変更
  - `load_daily_quote()` / `save_daily_quote()` を modules/logs.py に追加
  - `/api/daily/quote` を「①キャッシュを引く ②なければ生成して保存」の順に変更（main.py）
  - レスポンスは `quote` キーを維持したまま `cached` を追加したため、フロント側は無改修
  - `unique (user_id, date)` により同日二重生成をDB側で防ぐ。制約違反は握り潰さずログに出し、表示は妨げない

```sql
create table public.daily_quotes (
  id         bigserial primary key,
  user_id    uuid        not null,
  date       date        not null,
  quote      text        not null,
  source     text        not null default 'fallback',
  created_at timestamptz not null default now(),
  constraint daily_quotes_user_date_unique unique (user_id, date),
  constraint daily_quotes_source_check check (source in ('ai', 'fallback'))
);
create index daily_quotes_user_date_idx on public.daily_quotes (user_id, date desc);
alter table public.daily_quotes enable row level security;
```

**日付・継続日数ロジックの共通化（REVIEW_v1.2 C1・S1）**
- [x] `frontend/src/lib/date.js` を新規作成（`localDateStr` / `todayStr` / `calcStreak`）
- [x] 6ファイルの重複定義を削除しimportに置換（ActivityCalendar・SplashScreen・Home・Insights・Journal・Settings）
- [x] streak計算を Home・Settings 双方から `calcStreak()` 呼び出しに統一
- [x] Journal.jsx の `localDateStr` / `todayStr` はどこからも呼ばれていないデッドコードだったため削除（ESLint `no-unused-vars` が1件解消）

**REVIEW_v1.2 の記載が実態と異なっていた項目（対応不要と判断）**
- [−] S1 streak数値の不一致：既に修正済みだった（Settings.jsx にHomeと同一の「今日未記録なら昨日起点」処理あり）。ただし実装の二重化は残っていたため上記で共通化した
- [−] S2 カードスタイル不一致：既に修正済みだった（LogDetail と PatternCard は同一クラス）
- [−] C3 インラインスタイル残留：レビューの前提が誤り。`gridTemplateRows` は Dashboard・Journal・Home の3箇所で一貫して使われており、開閉アニメの動的値のためインラインが妥当

---

### 2026/07/27（React Native移行 フェーズA-1：土台）

**方針決定**
- [x] Expo を採用（開発環境がWindowsのため、iOSビルドにmacOS実機が不要なEAS Buildが必須要件になる）
- [x] Expo Router（ファイルベース）・NativeWind v4 を採用
- [x] Web版は最終的にExpo Web出力へ統一する（現行 frontend/ はA7完了まで維持）
- [x] 同一リポジトリに mobile/ を追加する構成
- [x] DESIGN_react_native_v2.0.md 作成

**A1 実装**
- [x] mobile/ に Expo プロジェクト作成（SDK 57 / React Native 0.86 / React 19.2.3）
- [x] NativeWind v4 + Tailwind v3 設定。frontend/src/index.css の20トークンを global.css の
      CSS変数として移植し、ライト/ダーク両方を再現。クラス名はWeb版と同一
- [x] lib/supabase.js：AsyncStorage・detectSessionInUrl:false・RN向け authFetch
- [x] lib/date.js を frontend から移植（frontend/ 廃止まで重複する）
- [x] Expo Router：ルート認証ガード + 5タブ（今日/記録/振り返り/ダッシュボード/設定）
- [x] Login画面をWeb版の文言・認証方式のまま移植
- [x] Settings にログアウトのみ実装（認証ガードの往復確認用）
- [x] main.py の CORS に http://localhost:8081 を追加（Expo Webはブラウザ実行のため必要。
      RNのネイティブfetchはCORS対象外）

**判明した既存ドキュメントの誤り**
- CLAUDE.md・PROGRESS.md の「Supabase Auth（メールOTP認証）」は誤り。実装は
  signInWithPassword / signUp を使ったメールアドレス＋パスワード認証。mobile側は実装に合わせた
- `goals` テーブルは本番Supabaseに存在しない。`/goals/save` `/goals/suggest` `/goals/interview`
  `/api/vision` は参照先が無いまま例外を握り潰しており実質動作していない。移行対象外とする
- DESIGN_multimodal_v1.3.md は goals テーブルが存在する前提で書かれている

**つまずいた点**
- blankテンプレートに babel-preset-expo が同梱されておらず、babel.config.js を追加した時点で
  Metroが起動しなくなった。devDependency として明示的に追加して解決

**A1 テスト結果**
- Web bundle 成功（948モジュール・エラーゼロ）
- 未認証時に /login へ振り替わることを確認
- NativeWindのトークン適用を確認（bg-stone→rgb(240,238,234)、border-border→rgba(0,0,0,0.08)、
  bg-forest→rgb(45,74,62)、rounded-full→9999px）
- ダークモードのCSS変数切替を確認（cream 250 249 247 → 28 28 30）
- ブラウザコンソールエラーなし
- **未実施：実際のログインとタブ切替**（認証情報の入力が必要なため要手動確認）

---

### 2026/07/27（React Native移行 A2・A3）

**A2：Home画面**
- [x] RecordForm / MilestoneBanner / WeeklyDiscovery に分割して移植。文言・API・観察文の生成規則は変更なし
- [x] 動作確認済み（ログイン・今日の灯り表示・記録の保存）

**A3：Journal画面（移植元715行）**
- [x] ActivityCalendar（RNには ring がないため border に置換）
- [x] LogItem / LogDetail（表示・編集・削除）
- [x] ReviewSection（週次・月次）／ TimelineSection（過去との対話）
- [x] Journal本体：タブ切替・今月の灯りバッジ・検索・月別一覧・記録モーダル
- [x] lib/format.js を新設（日付表示・月グループ化などWeb版で Journal.jsx 内にあった関数を集約）

**RN移植で共通して変えた点**
- CSS grid の開閉アニメーションは条件付きレンダリングに置換
- localStorage → AsyncStorage。同期的に初期値を読めないため、ReviewSection は
  初期値を null 固定にして useEffect で復元する方式に変更
- モーダルは fixed 配置ではなく RN の Modal コンポーネント
- SVGアイコンはグリフに置換（react-native-svg を増やさない判断）

**ドキュメント修正**
- [x] CLAUDE.md・PROGRESS.md・PROJECT_MAP.md の「メールOTP認証」を実態
      （メールアドレス＋パスワード）に修正

**テスト結果**
- クリーン本番ビルド成功（870モジュール／1,449KB）
- A1〜A3の全18コンポーネントがバンドルに含まれることを確認
- 開発サーバーでコンソールエラーなし
- 未実施: ログイン後のJournal画面の操作確認（手動確認が必要）

---

### 2026/07/27（React Native移行 A4・A5）

**A4：Insights画面**
- [x] 記録密度マップ（ActivityCalendarを読み取り専用で表示）
- [x] 過去記録との比較（1/3/6/12ヶ月前の最近傍ログ）
- [x] キーワードの変化（KeywordSection・AsyncStorageで1日TTLキャッシュ）
- [−] 過去との比較はWeb版が sm 以上で横並びだったが、モバイルでは常に縦並びにした。
      横並びだと1カラムの幅が狭すぎて記録本文が読めないため

**A5：Settings・SplashScreen**
- [x] Settings：アクティビティ／テーマ切替／エクスポート／ログアウト／バージョン
- [x] SplashScreen：Animated APIでフェードイン、タップで閉じる
- [x] lib/theme.js を新設。Web版が localStorage + html.dark でやっていたテーマ管理を
      NativeWind の colorScheme API + AsyncStorage に置き換えた
- [x] constants.js（APP_VERSION）を移植

**つまずいた点**
- `expo-file-system` がWeb向けに解決できないモジュール（`pathUtilities`）を参照しており、
  Expo Webのバンドルが失敗した。`lib/exportLogs.js`（ネイティブ＝共有シート）と
  `lib/exportLogs.web.js`（Web＝Blobダウンロード）に分け、Metroのプラットフォーム別解決で
  切り替える方式にして解消。Webバンドルから `expo-file-system` が完全に消えることを確認済み
- SplashScreenの暗幕 `View` がタップを奪い、画面を閉じられなかった。`pointerEvents="none"` で解消

**テスト結果**
- クリーン本番ビルド成功（875モジュール／1,461KB）
- A1〜A5の全18項目がバンドルに含まれることを確認
- Webバンドルに `expo-file-system` が含まれないことを確認（0件）
- 開発サーバーでSplashScreenの描画とタップでの遷移を確認、コンソールエラーなし
- 未実施: ログイン後のSettings操作（テーマ切替・エクスポート）の確認

---

### 2026/07/27（React Native移行 A6：Dashboard・YouTube連携）

**OAuthのディープリンク対応（Google Cloud Console の変更は不要）**
- [x] `state` を `user_id|platform` 形式に変更（`build_state` / `parse_state` を youtube.py に追加）
- [x] `/api/youtube/auth-url?platform=app` でアプリからの開始を示す
- [x] コールバックが platform を見て戻り先を切り替える（Web=Vercel / アプリ=`lantern://dashboard`）
- [x] GoogleへのリダイレクトURIはFlaskのまま変更しないため、Console側の設定変更が不要
- [x] platform を含まない旧形式の state は web として扱い、既存Webフロントは無改修

**mobile側**
- [x] `expo-web-browser` の `openAuthSessionAsync` で認証セッションを開き、`lantern://dashboard`
      への復帰を戻り値で受け取る
- [x] 接続・連携解除・チャンネル情報・サマリーカード
- [x] `components/ViewsChart.jsx`：recharts はRN非対応のため `react-native-svg` で折れ線を自前描画
- [x] `components/VideoTimeline.jsx`：動画一覧と1本ごとのAI観察。Web版は最大3カラムだが
      モバイルは1カラム固定

**テスト結果**
- state の往復・旧形式の後方互換・リダイレクト先の切り替えをローカルで検証（全パターンOK）
- クリーン本番ビルド成功（900モジュール／1,529KB）
- A1〜A6の全20項目がバンドルに含まれることを確認
- 開発サーバーでコンソールエラーなし
- 未実施: 実機でのYouTube連携往復（`lantern://` はブラウザでは復帰しないため実機確認が必要）

---

### 2026/07/27（React Native移行 A7 前半：EAS設定とExpo Webビルド確認）

- [x] `mobile/eas.json` を作成（development / preview / production の3プロファイル）
- [x] `mobile/README.md` を作成（セットアップ・EAS環境変数・実機確認の注意点）
- [x] Expo Web の本番ビルドを実際に配信して描画を確認
      （Splash→Login表示、テーマ適用、コンソールエラーなし）

**EASの環境変数について**
`.env` は gitignore されており EAS Build には渡らない。値を `eas.json` に直接書くと
リポジトリに残るため、`eas env:create` でEAS側に登録する方針とした。手順は
mobile/README.md に記載。

**A7の残作業（いずれも要ユーザー操作）**
- [ ] Expoアカウント作成と `eas login`
- [ ] EAS環境変数の登録（EXPO_PUBLIC_API_URL / SUPABASE_URL / SUPABASE_ANON_KEY）
- [ ] Apple Developer Program（$99/年）・Google Play Console（$25）の登録
- [ ] 実機でのYouTube連携往復の確認（`lantern://` はブラウザでは復帰しないため）
- [ ] Vercelの配信元を frontend/ から mobile/ のExpo Web出力へ切り替え
- [ ] 切り替え後に frontend/ を廃止し、lib/date.js の重複を解消

---

### 2026/07/28（本番デバッグ経路の削除と死んだルートの整理）

**セキュリティ修正**

- [x] `/api/youtube/channel-test` を削除
      `@require_auth` がなく実ユーザーUUIDがハードコードされていた。
      本番で誰でも叩け、保存済みOAuthトークンでYouTubeチャンネル情報を返していた。
- [x] `/debug/db-test` を削除
      `@require_auth` はあったが、`logs` を user_id フィルタなしで service_role 取得
      していたため、他ユーザーのUUIDが認証済みユーザー全員に見えていた。

**不要ルートの削除**

- [x] debug経路の整理：`/api/debug/routes` `/api/debug/youtube-config`
      `/api/debug/review-test` `/debug/insert-test` `/api/debug/static-check`
      `/api/debug/serve-react-test` を削除
- [x] 死んだ `goals` / `vision` ルート5個を削除
      （`/goals/save` `/goals/suggest` `/goals/interview` `/api/vision` GET/POST）
      参照元は `templates/goals.html` のみで、`render_template` がコード上に存在せず
      templates/ は配信されていない（v0.x時代の遺産）。
- [x] 不要になったimportを整理（`save_goals_data` `get_week_str` `get_month_str`
      `get_month_display_str` `get_week_display_str` `get_current_weekly_goal`
      `get_current_monthly_goal` `call_claude_with_history`）

main.py 923行 → 618行（-305行）

**残した診断エンドポイントと理由**

| ルート | 認証 | 理由 |
|---|---|---|
| `/api/debug/version` | なし | デプロイ後の稼働バージョン確認に使う。返すのは commit / branch / OAuthリダイレクトURI のみで機密なし |
| `/api/debug/youtube-token` | あり | `g.user_id` の範囲だけを返す。A7の実機YouTube検証で必要 |

**検証結果: OK**

- 削除した13ルートすべてGETで404を返すことを確認
- 残したルートが401（＝生存・認証必須）を返すことを確認
- `/api/debug/version` が200を返すことを確認
- frontend/mobile が実際に呼ぶ18エンドポイントが全て残存していることを確認
- pyflakes クリーン（未使用import・未定義名なし）
- 認証なしで残るルートは `/` `/<path>` `/api/debug/version` `/api/splash/content`
  `/api/youtube/callback` の5つのみ。ユーザーデータを返すルートは全て認証必須

---

### 2026/07/29（テスト基盤の導入・純粋関数のテスト）

プロジェクト全体でテストゼロだった状態を解消。まず純粋関数から着手した。

**Python（pytest）**

- [x] `pytest.ini` `conftest.py` を追加
- [x] `tests/test_youtube_state.py`（20件）
      `build_state` / `parse_state` / `generate_code_verifier` /
      `generate_code_challenge` を対象にした。
      state の形式は「Google Cloud Console のリダイレクトURI設定を変えずに
      WebとネイティブアプリをOAuth後に出し分ける」ための要で、
      壊れると実機でしか気づけないため最優先でテストした。
      PKCEは RFC 7636 付録B のテストベクタで検証している。

**JavaScript（vitest）**

- [x] `frontend` に vitest を導入（`npm test`）
- [x] `frontend/src/lib/date.test.js`（29件）
      `localDateStr` / `todayStr` / `calcStreak` / `monthsAgoStr` / `findNearestLog`

**テストのためのリファクタリング**

- [x] `monthsAgoStr` `findNearestLog` を `lib/date.js` に移動
      Insights.jsx（Web）と insights.jsx（mobile）に同じ実装が重複していた。
      `lib/date.js` を作った目的そのものなので、そこへ寄せた。
- [x] `calcStreak(logs, now)` `monthsAgoStr(months, now)` に `now` の任意引数を追加
      内部の `new Date()` を注入可能にしてテストを決定的にした。
      呼び出し側は第1引数だけを渡すため既存の呼び出しは無改修。

**検証結果: OK**

- pytest 20件パス / vitest 29件パス
- 変異テストで「テストが実際に退行を捕まえる」ことを確認した
  （空振りするテストを書いていないかの確認）
  - `parse_state` の web フォールバックを外す → 2件失敗
  - PKCE challenge のパディング除去をやめる → 3件失敗
  - `calcStreak` の「当日未記録なら昨日を起点」を外す → 2件失敗
  - `monthsAgoStr` の月末オーバーフロー補正を外す → 4件失敗
  - いずれも復元後に全件パスすることを確認
- `npm run build`（Vite）成功
- `npx expo export --platform web --clear` 成功。
  バンドルの `\uXXXX` を復元してInsights画面の文字列が含まれることを確認
- eslint：`Insights.jsx` に `no-empty` 2件が残るが、
  HEADの同ファイルにも同じ2件があり今回の変更由来ではない（`catch {}` の握り潰し）

**date.js の二重保守について**

`frontend/src/lib/date.js` と `mobile/lib/date.js` は同一内容を保つ必要がある。
片方だけ直す事故を防ぐため、2ファイルの一致を検証するテストを入れた。
Vercelの配信元をExpo Web出力へ切り替えて `frontend/` を廃止したら、
このテストごと削除してよい。

---

### 2026/07/29（死んだテンプレートの削除・例外の握り潰し解消・テスト拡充）

**死んだ `templates/` を削除**

- [x] `base.html` `goals.html` `index.html` `logs.html` `review.html` `splash.html`
      v0.x（React移行前）のJinja2テンプレート。`render_template` がコード上に
      一切存在せず、実行経路がなかった。`goals.html` は前日に削除した
      `/goals/*` ルートを呼んでおり、残すと将来の誤読の元になる。

**例外の握り潰しを解消**

握り潰しは全部で7箇所だった（レビューの「15箇所」は `print` でログが
出ている箇所を含んだ数）。挙動は変えず、観測できるようにしただけ。

- [x] `modules/ai.py` 4箇所
      AI出力のJSON解析に失敗したとき、固定文言のフォールバックを黙って
      返していた。画面上はAI生成と見分けがつかず、静かに劣化していた。
      失敗時に `[AI] JSON解析に失敗（...）` と出力の先頭200文字を記録する。
      キーワード抽出の内側の `except Exception` は外側と同じ
      `(JSONDecodeError, TypeError, ValueError)` に狭めた。
- [x] `frontend/src/pages/Insights.jsx` 2箇所 / `mobile/components/KeywordSection.jsx`
      `catch {}` を `console.warn` に置き換え。あわせて、壊れたキャッシュを
      `removeItem` で捨てるようにした。これまでは壊れたまま残り、
      同じ日付キーで失敗し続けていた。
      画面には何も出さない方針は変えていない（AI憲法「必要以上に話さない」）。

**テストの拡充（Python 20件 → 82件）**

- [x] `tests/test_route_auth.py`（20件）— **最重要**
      認証なしで公開してよいルートを理由つきの許可リストで固定した。
      新しいルートを認証なしで追加すると落ちる。前日に削除した
      デバッグ経路が復活していないことも確認する。
- [x] `tests/test_logs_mapping.py`（23件）
      `_from_db` / `_to_db`。Supabaseのカラム名とアプリのフィールド名が
      異なるため、ずれると保存はできても読み出しで内容が消える。
      例外が出ず「記録が空になった」ように見えるだけなので固定した。
- [x] `tests/test_ai_parsing.py`（19件）
      `_parse_patterns_json` / `_fmt_logs`。コードブロックや前置き付きの
      AI出力からJSONを救い出せること、失敗時にログが出ることを確認する。

**検証結果: OK**

- pytest 82件 / vitest 29件パス
- 変異テストで実効性を確認
  - 認証なしルートを新規追加 → 許可リストのテストが失敗
  - `/api/logs` から `@require_auth` を外す → 同上が失敗
  - `_from_db` のカラム名を取り違える → 3件失敗
  - いずれも復元後に全件パス
- `npm run build`（Vite）成功 / `npx expo export --platform web --clear` 成功
- eslint の `no-empty` 2件が解消（残存ゼロ）
- Flaskアプリ起動確認（ルート数24）

**未処理として残した判断**

`modules/summary.py`（`get_weekly_summary` / `get_streak` / `get_recent_activity`）は
どこからも import されていない。削除した Jinja2 テンプレートに
サーバーサイドで streak と recent_activity を渡すためのモジュールだったため、
`templates/` の削除で完全に死んだ。ただし CLAUDE.md のディレクトリ構成に
設計要素として記載があるため、独断では削除せず判断を仰ぐこととした。

---

### 2026/07/30（Insights を Journal の振り返りタブへ統合）

設計は `docs/superpowers/specs/2026-07-30-insights-journal-integration-design.md`。

**動機**

「振り返り」という名前の場所が2つあった（ナビの Insights ページと、
Journal 内のタブ）。さらに中身も重複していた。

- カレンダー：記録タブと Insights「記録密度」で同じ `ActivityCalendar`
- 過去比較：Journal「過去との対話」（週の全記録＋AI）と
  Insights「過去との比較」（最近傍1件の左右対比・AIなし）

**変更内容**

- [x] E: `main.py` の `months_ago` クランプを `_clamp_months_ago()` に切り出し、
      上限を 6 → 12 に。1年前の比較を可能にした。既存の1/3/6は挙動不変で後方互換
- [x] D: Web を mobile と同じ構造に揃えた。`components/` に
      `PatternCard` `ReviewSection` `TimelineSection` `LogSnapshot` `KeywordSection`
      を新設。`Journal.jsx` 715行 → 493行
- [x] C: `TimelineSection` を統合版に改修。期間は1/3/6/12ヶ月前の4つ。
      常時は「その頃の記録」と「今日の記録」を左右に並べるだけで、
      「振り返る」を押したときだけAIの観察と問いが加わる。
      `logs` は Journal が持っているものを props で渡し、API取得の重複を解消
- [x] B: 振り返りタブを「今週／今月／過去との対話／キーワード」の4節に。
      「記録密度」は削除し、カレンダーは記録タブに一本化
- [x] A: ナビを5→4項目に。Web は Sidebar と HamburgerMenu の両方から削除し、
      `/insights` は `<Navigate to="/journal" replace />` でリダイレクト。
      mobile は `_layout.jsx` の `Tabs.Screen` と `insights.jsx` の両方を削除
      （SDK 57 ではタブは自動生成されず宣言が必要だが、ファイルが残ると
      ルートとしては到達可能なため両方落とす）
- [x] `vite.config.js` の proxy から、先日削除した `/goals` を除去
- [x] CLAUDE.md のディレクトリ構成・画面設計・Insights AI憲法の位置づけを更新

**検証結果: OK**

- pytest 105件 / vitest 29件パス
- 変異テストで `_MONTHS_AGO_MAX` を6に戻すと7件失敗、復元後に全件パス
- `npm run build` 成功 / `npx expo export --platform web --clear` 成功
- mobileバンドルの `\uXXXX` を復元して照合：「過去との対話」「1年前」「キーワード」
  「この時期の記録はありません。」が含まれ、「記録密度」「INSIGHTS」が消えていることを確認
- ナビ項目数：Sidebar 4 / HamburgerMenu 4 / mobile tabs 4
- `記録密度` `pages/Insights` `tabs/insights` への参照が全てゼロ
- ローカルでWebを起動し、コンソールエラーなしで表示されることを確認
- eslint の新規エラーは0件（残る3エラー1警告はいずれもHEADに既存）

**未検証（要ユーザー確認）**

ログイン後の画面の目視確認は未実施。認証情報を扱えないため、
振り返りタブの4節の並びと左右対比の見た目、`/insights` から `/journal` への
リダイレクト実動作は確認をお願いしたい。

**保留**

- `frontend/src/lib/format.js` の抽出（`Journal.jsx` 5-42行が
  `mobile/lib/format.js` と同一）。保留のため Journal.jsx は493行に留まる
- AIカードへの出典行「{past_date}を含む週の記録から」。
  画面に出る過去記録は1件だがAIは週の全記録を根拠にしている点が未解決

---

### 2026/07/31（ローカルのYouTube連携が redirect_uri_mismatch になる不具合）

**症状**

ローカル（localhost:5173）でYouTube連携すると Google が
「エラー 400: redirect_uri_mismatch」を返し、連携できない。

**原因**

`Lantern/.env` に `YOUTUBE_REDIRECT_URI` がなく、
`modules/youtube.py` のハードコードされた既定値
`http://localhost:5173/youtube/callback` が使われていた。
この既定値は二重に誤っていた。

1. Google Cloud Console に登録しようのない値だった
2. ポート5173はViteで、パスも `/youtube/callback`。
   実際のハンドラは Flask（5000）の `/api/youtube/callback` であり、
   Viteのプロキシは `/api` と `/save` しか転送しないため
   仮に登録できても認可コードがFlaskに届かない

さらに、コールバック後の戻り先 `_FRONTEND_ORIGIN` が
Vercel本番URLにハードコードされており、ローカルで認証しても
本番サイトへ飛ばされる状態だった。

前セッションの `7792eac`（A6）時点から誤っていたが、
ローカルでYouTube連携を試したのが初めてだったため顕在化していなかった。

**修正**

- [x] `modules/youtube.py` の既定値を `http://localhost:5000/api/youtube/callback` に変更
- [x] `main.py` の `_FRONTEND_ORIGIN` を環境変数 `FRONTEND_ORIGIN` で
      上書き可能にした。未設定時は本番Vercelを使うため Render 側は変更不要
- [x] 解決処理を `_resolve_frontend_origin()` に切り出してテスト可能にした
- [x] `tests/test_youtube_redirect.py` を追加（18件）
      既定値が**実在するFlaskルートと一致すること**を
      `app.url_map` と突き合わせて検証する。5173を指さないことも固定した
- [x] ローカルの `.env` に `YOUTUBE_REDIRECT_URI` と `FRONTEND_ORIGIN` を追記
      （.envはgitignore対象のためコミットには含まれない）

**ユーザー側で必要だった作業**

Google Cloud Console の OAuth クライアントの「承認済みのリダイレクト URI」に
`http://localhost:5000/api/youtube/callback` を追加（登録済みを確認）。

**検証結果: OK**

- pytest 123件パス
- 変異テストで既定値を元の5173に戻すと3件失敗、復元後に全件パス
- ローカルFlaskを再起動し `/api/debug/version` が
  `http://localhost:5000/api/youtube/callback` を返すことを確認
- 認可URLを実際に生成し、Googleに送られる `redirect_uri` が
  同じ値になることを確認

**検証時の落とし穴（メモ）**

`.env` を編集する前に起動していたFlaskプロセスがポート5000を掴んだままで、
新しいプロセスを起動しても古い方が応答し `未設定` と誤った結果を読んだ。
Windowsでは同じポートに複数プロセスが並存しうる。
設定変更後の確認は、必ず既存プロセスを完全に停止してから行うこと。

---

### 2026/08/01〜08/02（写真記録：マルチモーダル v1.3）

ブランチ `feat/photo-record`。設計は
`docs/superpowers/specs/2026-08-01-photo-record-design.md`、
計画は `docs/superpowers/plans/2026-08-01-photo-record.md`（全16タスク）。

**目的**

記録のハードルを下げる。文章を書く気力がない日でも写真1枚なら残せる状態を作る。
アーカイブが目的ではないため画質より軽さを優先し、クライアント側で圧縮する
（本体1600px/q0.8 約250KB、サムネイル400px/q0.7 約30KB）。
前身の設計（10MB×5枚/日＝年18GB）が保留になっていた理由が容量だったため、
圧縮前提に変えたことが解除の鍵になった。毎日記録しても年102MB、無料枠1GBで約10年。

**設計の核心：`/save` に写真を触らせない**

`/save` は受け取ったデータから entry を作り直す。
`_to_db` が写真カラムを出力すると、テキストだけを編集した瞬間に写真が消える
（LogDetail の編集は写真フィールドを送らない）。
そのため `_to_db` の戻り値に写真カラムを**含めない**。
写真の更新は `/api/logs/<date>/photo` だけが行う。
「今日の灯りが前日ログしか受け取らない」のと同じ、渡さないことで壊せなくする設計。

**サーバー側**

- [x] `modules/photos.py` 新規。パス生成・Storage保存・削除・署名付きURL発行
      パスは必ず `g.user_id` と `date` から組み立て、クライアントの値を信用しない
- [x] `logs.photo_path` / `photo_thumb_path` を `_DB_SELECT` と `_from_db` に追加
      （`_to_db` には**追加しない**）
- [x] `delete_log_by_date` で Storage の実ファイルも削除（CASCADEでは消えない）
- [x] `_fmt_logs` が中身の無い記録をスキップ（写真だけの記録をAIに渡さない）
- [x] `PUT` / `DELETE /api/logs/<date>/photo` を追加。どちらも `@require_auth`
- [x] `/api/logs` に署名付きURLを付与。URLはDBに保存せず読み出しのたびに発行する
- [x] 写真だけの記録で `content` 等が NULL になり、`created: null` が
      クライアントに漏れていたのを修正（`row.get(k, "")` は値が None のとき
      既定値を返さない）。`_from_db` の全項目を `or ""` に統一した

**クライアント（Web・mobile 両方）**

- [x] `lib/image.js` 新規。寸法計算は純粋関数に切り出し、
      frontend と mobile で同一に保つ（一致検証テストあり）
- [x] `PhotoPicker` 新規。Web は canvas、mobile は expo-image-manipulator
- [x] 記録モーダル・今日の記録・記録の詳細・一覧・過去との対話に組み込み
- [x] 記録モーダルの保存条件を「テキストか写真のどちらかがあれば可」に変更
- [x] mobile の記録モーダルが `setLogs` で常に append していたのを、
      既存があれば置換するよう修正（写真だけ先に付けると同じ日付が重複した）

**クライアント側の落とし穴（`_to_db` と対になる罠）**

サーバー側の設計が正しくても、フロントで状態を作り直すときに `photo_url` を
引き継がないと**画面上だけ写真が消えたように見える**（DBには残っているので
リロードすると戻る）。テキスト保存後に組み立てる `newLog` へ必ず引き継ぐこと。

**Expo SDK 57 の確認**

`mobile/AGENTS.md` の指示どおり公式ドキュメントで確認した。2つ変わっていた。

- `ImageManipulator.manipulateAsync()` は非推奨。
  `manipulate()` → `resize()` → `renderAsync()` → `saveAsync()` のビルダー型
- `ImagePicker.MediaTypeOptions` は非推奨。`mediaTypes: ['images']` と配列で渡す

**検証結果: OK**

- pytest 201件パス（着手前123件。写真関連で78件増）
- vitest 65件パス（着手前53件）
- eslint エラー0・警告0 / `npm run build` 成功
- `expo export --platform web` 成功。バンドルに新規文言5件を確認
- Task 2 で本物の Supabase Storage に対して
  保存→一覧→署名付きURL→上書き→削除を実行し、Fake と API の形が一致することを確認

**未確認（要ユーザー操作）**

- UI からのエンドツーエンド（実際に写真を選んで保存する経路）
- Render / Vercel へのデプロイ後の動作

**このセッションで学んだこと**

変異テストで5回、テストが生存した（＝実装は正しいがテストが守っていない）。
`_DATE_RE` を消してもテストが落ちなかった例では、`date.fromisoformat()` が
`20260801` や `2026W011` を受け付けるため、Storageのパスと DB の DATE 列が
ずれて参照できない孤児ファイルになる経路が残っていた。
単体テストが dict を直接渡す構造だと `_DB_SELECT` の変更も素通りする。

---

### 2026/08/04（frontend/ の廃止と Expo Web への一本化）

設計は `docs/superpowers/specs/2026-08-03-expo-web-consolidation-design.md`、
計画は `docs/superpowers/plans/2026-08-03-expo-web-consolidation.md`。

**動機**

写真記録で `PhotoPicker` も `image.js` も `PhotoLightbox` も Web と mobile に
1つずつ書いた。その結果 mobile 側にだけバグが残った
（`setLogs` が常に append していて同じ日付が重複した）。
`date.js` / `format.js` / `image.js` は一致検証テストでドリフトを防いでいたが、
テストで守らなければ壊れる構造そのものを消した。

新機能は増えていない。以降のすべての変更が半分の手間になることが成果。

**やったこと**

- [x] `mobile/` を `client/` にリネーム（Web も出すため名前が実態と合わなくなっていた）
- [x] 写真の寸法計算を `lib/imageMath.js` に切り出し、純粋関数とプラットフォームAPIを分離
- [x] vitest を `client/` に移設。一致検証テスト3件を削除（65件 → 62件）
- [x] ナビゲーションを画面幅で切り替え（768px以上はサイドバー）
- [x] ハンバーガーメニューを廃止（タップ2回 → 1回）
- [x] YouTube連携を `lib/youtubeConnect.js` / `.web.js` に分割
- [x] `/insights` → `/journal` のリダイレクトを維持
- [x] Flask の `serve_react` と `static/` を削除。API専用に戻した（公開ルート 5→4）
- [x] `frontend/` を削除（44ファイル）

**サイドバーは自作することになった**

当初は React Navigation の `tabBarPosition="left"` に任せる計画だった。
実際に表示させたところ Lantern の見た目に耐えなかった。

- 既定幅が広すぎる（1920px 幅で 520px ほど占有）
- アクティブ項目が既定の青。cream / sage / forest の配色から完全に外れる
- ロゴ・タグライン・バージョン・テーマ切替を差し込む場所が無い

描画だけ `components/SidebarTabBar.jsx` に持たせた。
項目の状態と遷移は Tabs から受け取るため、ルーティングは二重になっていない。
幅は実機で見ながら 224px → 192px まで詰めた。

**移植時に落ちていた仕様を2つ戻した**

Expo Web を広い画面で表示して発覚した。

- 本文の幅制限。旧 Web は `max-w-2xl mx-auto`（672px 中央寄せ）だったが、
  client 側は `px-5` だけで、1700px 幅まで伸びて読みづらかった
- 動画一覧の段組み。旧 Web は `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` だったが、
  移植時に「モバイルでは1カラム固定」にしていた

どちらも mobile 前提の設計が、そのまま広い画面に出たことによるもの。

**検証結果: OK**

- pytest 231件パス / vitest 62件パス
- Vercel のプレビューと本番の両方で、配信物が Expo Web であることを検査で確認
  （`/_expo/static/js/web/entry-*.js`・`react-native-web` あり・Vite の痕跡なし）
- `EXPO_PUBLIC_*` の埋め込みと Render API との疎通を確認
  （スプラッシュの引用がフォールバックではなく実データだった）
- ユーザーがローカルとプレビューで全画面を目視確認。YouTube連携も実通し済み

**バンドルサイズ**

| | 変更前（Vite） | 変更後（Expo Web） |
|---|---|---|
| raw | 882KB | 1552KB |
| gzip | 250KB | 407KB |

react-native-web を含むため gzip で 1.6倍になった。
初回読み込みに差が出るが、個人利用のため許容した。

**失われたもの**

デスクトップのサイドバーは自作したのでロゴもテーマ切替も残っている。
一方で `HamburgerMenu.jsx` は移植せず破棄した（タブに寄せたため不要）。

**環境変数の落とし穴**

`VITE_*` と `EXPO_PUBLIC_*` はどちらもビルド時にコードへ埋め込まれる。
Vercel の設定を切り替える前に `EXPO_PUBLIC_*` を追加しておかないと、
ビルドは成功するのに Supabase の URL が `undefined` になり、
`EXPO_PUBLIC_API_URL` が空文字へフォールバックして
API がすべて Vercel 自身に向かう。画面は出るので気づきにくい。

また Vercel の設定変更は既存のデプロイに遡って適用されない。
設定を変えた後に再デプロイが要る。

---

### 2026/08/05（Twitch連携）

設計は `docs/superpowers/specs/2026-08-04-twitch-integration-design.md`。

**動機**

YouTube と同じ。「外の世界に届いた形跡」を記録と並べる。
配信は開始時刻と長さを持つため、YouTube の「投稿日」より
Journal の記録と時間軸で噛み合う。

**中核：消えるものを残す**

Twitch の過去配信（VOD）は一定期間で消える。
取得できたときに `twitch_streams` へ保存し、VOD が消えても Lantern には残す。
取得はダッシュボードを開いたときに行い、cron は持たない
（Render の無料枠はスリープするため外部スケジューラが要る）。

連携を解除しても `twitch_streams` は消さない。

**やったこと**

- [x] `modules/twitch.py`（認可・トークン・配信の取得と保存）
- [x] `modules/oauth_state.py` に state の組み立てを切り出し、YouTube と共通化
- [x] `/api/twitch/*` 6エンドポイント。callback 以外は `@require_auth`
- [x] Dashboard をタブ化（YouTube / Twitch）。
      既存の中身は `components/YouTubePanel.jsx` へ逐語的に切り出した
- [x] `components/TwitchPanel.jsx` 新規
- [x] `lib/twitchConnect.js` / `.web.js` でプラットフォーム分割

**認可方式の変更**

当初は Public クライアントで Device Code Flow を想定していた。
Twitch は認可コードフローで PKCE をサポートせず、
Public クライアントは Device Code Flow に限定されるため。
その後 Confidential クライアントとして登録できたため通常の
認可コードフローにした。PKCE は使わない。

**壊れやすい点**

リフレッシュトークンは1回限りの使い捨て。更新のたびに応答の
新しい refresh_token で保存し直す。古いものを持ち続けると次の更新で失敗する。
30日使わないと失効するが、その場合は未連携として扱うだけにした
（「30日間ご利用がありませんでした」のような文言は出さない）。

**移行の取りこぼしを1件修正**

疎通確認の途中で発覚した。`.env` の `FRONTEND_ORIGIN` が
`http://localhost:5173` のままで、削除した Vite のポートを指していた。
ローカルで OAuth を完了しても存在しないポートへ戻され、
連携が失敗したように見える状態だった（YouTube も同じ）。
本番は未設定で Vercel の既定値を使うため影響なし。

**検証結果: OK**

- pytest 257件パス（新規26件）/ vitest 62件パス
- Webバンドルを検査し、Twitchの文言・4つのAPIパス・タブが入り、
  ネイティブ専用（openAuthSessionAsync / lantern:// / expo-web-browser）が
  0件であることを確認
- ローカルで実際に Twitch と連携し、動作をユーザーが確認

### 2026/08/06（記録しやすさ・問いの資産・機能精査）

作者の言葉をCLAUDE.mdの冒頭に据え、その定義で全体を測り直した1日。

**記録しやすさの4段（作者の定義）**

1 開きたくなる ／ 2 書き始められる ／ 3 書き続けられる ／ 4 書いてよかったと思える

この時点で 4 は厚く、**2 が空だった**。以降の実装はここを埋めるもの。

**やったこと**

- [x] CLAUDE.md を実態に合わせた（古い4節を訂正し、作者の言葉を冒頭へ）
- [x] スプラッシュの文字が出ない不具合を修正
      （`Animated.Text` に NativeWind の className が効かない。
      `Animated.View style` で包み、中を素の `Text` にした）
- [x] パスワード自動入力と Enter でのログインを修正
      （`components/FormShell.web.jsx` で本物の `<form>` と
      隠しsubmitを出す。`autocomplete` だけでは効かなかった）
- [x] 問いの資産（`modules/questions/`・50問）— 4段の2
- [x] アイデアの溜め場（`modules/ideas.py` + Journal のタブ）
- [x] 記録の削除ボタンを赤にした
- [x] 401 で即サインアウトするのをやめ、更新して1回だけ再試行するようにした
- [x] `REVIEW_v2.0.md`（全機能を要・不要のレベル別に精査）
- [x] 精査の上位3件を実施（下記）

**問いの資産（AIを使わない）**

毎日1回のAI生成は毎日の課金になる。固定の問いなら0円で無限に出せる。
分類（創作/日常/振り返り）が出す場所を決めており、
創作・日常は書く前、振り返りは書いた後に出す。

同じ日は同じ問いを出す。読み込むたびに変わると「選び直せるもの」に見えて
書く手が止まる。リフレッシュボタンも同じ理由で置かない。
`tests/test_questions.py` が全50問を機械的に検査する（禁止ワード・丁寧体・字数）。

**機能精査で分かったこと（実測・全18件）**

| 項目 | 記入率 |
|---|---|
| やったこと | 18/18 |
| 次にやること | 3/18 |
| よかったこと | 1/18 |
| 困ったこと | 1/18 |

**15/18件が「やったこと」だけで完結**。1記録の平均20.5字。

※ この節は当初「全20件」としていた。手で数えたときに
動作確認用アカウント（2件）を混ぜていた。翌日に計測を実装して発覚。
結論は変わらないが、数字は上記が正しい。
Lantern は既に「短いメモを毎日残す」道具として使われている。
多くの機能はそれより長く・多く書かれる前提の作りだった。

**精査を受けた3件**

- [x] 「次にやること」を折りたたみに移した。**欄は消していない**。
      5.6%とはいえ使われており、消すと後から分け直せない
- [x] スプラッシュを1日1回に戻した（旧Web版にあった日付判定が移植時に落ちていた）
- [x] 死んだコードを削除（`PlaceholderScreen.jsx` / `/api/debug/youtube-token`）。
      APIルートが1本減った（削除後は 34ルール / 31パス）

**検証結果: OK**

- pytest 546件パス / vitest 62件パス / `expo export --platform web` 成功
- バンドルを検査し、4項目がすべて残り、`lantern_splash_date` が入り、
  削除済みの2つが消えていることを確認

---

### 2026/08/06（計測）

REVIEW_v2.0.md の最優先は「問いとアイデアをしばらく使う」だったが、
**見る手段が無かった**。前日の精査は手で数えて作ったもので、毎回できない。
North Star Metric（継続日数）は一度も計測されていなかった。

**やったこと**

- [x] `modules/metrics.py`（集計。純粋関数のみ・ネットワークに触らない）
- [x] `scripts/report_metrics.py`（レポート出力。読み取りのみ）
- [x] `tests/test_metrics.py`（42件）

**画面ではなくスクリプトにした**

ここで出る数字は機能を残すか畳むかを決めるためのもので、
利用者が自分の記録を測るためのものではない。
アプリの中に置いた瞬間、それは利用者に向けられる。
「今週は先週より短い」と読める数字が画面にあれば、
Lantern は自己評価の道具になる。

**イベント収集を足さなかった**

`logs` の date と `ideas` の created_at / picked_at だけで、
「機能を入れた前後で書き方が変わったか」は遡って計算できる。
遡れるもののために収集を足すと、記録アプリが利用の監視を始めることになる。

**入れた直後に、前日の数字の誤りが出た**

手で数えたときに動作確認用アカウント（2件）を混ぜていた。
作者のアカウントは**18件**。CLAUDE.md・PROGRESS.md・REVIEW_v2.0.md の
3つを訂正した。結論（85%→83%が1項目のみ）は変わらない。

スクリプトは複数アカウントを見つけたら集計せずに止まるようにした。
黙って混ぜるのが一番危ない。

**手で数えたときには見えていなかったこと**

1記録の平均字数が週ごとに **3.7字 → 43.3字** と増えている。
「常に15字の短いメモ」という読みは、開始直後の記録に引きずられていた。
ただし1週あたり1〜5日で母数として弱く、傾向とは断定しない。

**検証結果: OK**

- pytest 588件パス（新規42件）
- 変異検査 8/8 検出（境界日の扱い・昨日を起点に含めるか・
  平均の母数・信頼判定・期間の日数・写真だけの記録・連続判定・拾った数）
- 実データで動作を確認

---

### 2026/08/06（ドキュメントの棚卸）

**3回、静かに嘘になっていた。**

- `PROJECT_MAP.md` は 2026-08-04 に削除した `frontend/` を説明し続けていた。
  ページ・コンポーネント・行番号のすべてが存在しないファイルを指していた
- `MVP_SPEC.md` は 2026-06-12 から更新されず、Flaskテンプレート・
  `logs.json`・`/logs` ページという**2世代前のアプリの仕様**を書いていた
- CLAUDE.md の記録件数は、手で数えたときの取り違えで間違っていた（前項）

どれも「更新を忘れないようにする」では防げなかった。

**役割を1つずつに分けた**

| 文書 | 書くこと |
|---|---|
| CLAUDE.md | なぜそう決めたか |
| REQUIREMENTS.md | 何を満たすか |
| PROJECT_MAP.md | どこにあるか |
| HANDOFF.md | 今どこにいるか |
| PROGRESS.md | いつ何をしたか |

この5つが**生きている文書**。現在を語るので、ずれたら嘘になる。
`DESIGN_*` / `REVIEW_*` / `docs/superpowers/` / PROGRESS.md の各日付の節は
**凍結された文書**で、後から書き換えない。
凍結された文書が `frontend/` に触れているのは正しい。当時あったのだから。

**やったこと**

- [x] `PROJECT_MAP.md` を全面的に書き直した（削除済みの `frontend/` を説明していた）
- [x] `MVP_SPEC.md` → `REQUIREMENTS.md` に改名し全面的に書き直した。
      v2.0 は MVP を過ぎており、名前自体が実態と合っていなかった
- [x] `HANDOFF.md` を新設。**日付つきの引き継ぎ資料を増やさない**。
      過去分は `docs/archive/` へ移した
- [x] `tests/test_docs.py`（29件）— 生きている文書を機械的に検査する
- [x] CLAUDE.md に「ドキュメントの管理」の節を追加し、
      作業完了時の手順に HANDOFF / REQUIREMENTS / PROJECT_MAP を入れた
- [x] APIの本数を実測値に訂正（34ルール / 31パス）

**行番号を書くのをやめた**

`L232–L270` のような指し方は1回の編集で全部ずれる。
ファイル名と関数名・コンポーネント名で示す。機械的に存在を確認できる。

**引き継ぎ資料を1つにした理由**

日付つきで作ると、どれが最新か分からなくなる。
それ以上に、**feature ブランチに置いたまま main にマージされず、
新しいセッションから見えなくなったことが実際にあった**。

**検証結果: OK**

- pytest 617件パス（新規29件）/ vitest 62件パス
- 意図的なずれを6通り作り、6/6 を検出
  （文書から部品を落とす・実在しないファイルを書く・ルート数をずらす・
  削除済みパスを説明する・部品を足して書き忘れる・
  `ai.py` からガードレールを消す）

---

### 2026/08/06（フェーズA7 の下準備）

**Apple Developer Program に加入した**（ユーザー操作）。
2026-07-27 の設計以来ふさがっていた A7 が動き出した。

**写真の権限説明が抜けていた**

`expo-image-picker` が依存にあるのに `app.json` の `plugins` に無かった。
このプロジェクトは CNG（`ios/` を持たない）ため、plugin を書かないと
`NSPhotoLibraryUsageDescription` が Info.plist に入らない。
**iOS は使用目的の記載が無いまま写真にアクセスするとアプリを落とす。**
Web では起きないので、今まで気づけなかった。

`expo-doctor` はこれを検出しない。SDK 57 のドキュメントを読んで見つけた。

文面は「選んだ写真だけが保存され、AIには渡されません」とした。
CLAUDE.md の「写真はAIに渡さない」を利用者に見える形で書いたもの。
カメラとマイクは使わないので `false` にして、Android 側の権限も宣言させない。

**依存をSDK 57の想定バージョンに揃えた**

8パッケージがパッチ後れだった（expo / expo-router / react-native ほか）。
`expo-doctor` が 19/20 → **20/20**。

**検証結果: OK**

- vitest 62件パス / pytest 617件パス
- `expo export --platform web` 成功。バンドルを検査し、記録フォームの4項目・
  起動画面の日付判定・削除ボタンの色が保たれ、ネイティブ専用
  （`openAuthSessionAsync` / `lantern://`）が混ざっていないことを確認
- アイコンは 1024x1024・α無しで App Store の要件を満たしている

**残りはほぼ全てユーザー操作。** `eas login`・実機ビルド・
App Store Connect への登録・審査提出。
未決が3件ある（プライバシーポリシー・バージョン表記・輸出コンプライアンス申告）。
`HANDOFF.md` に書いた。

---

### 2026/08/06（プライバシー：写真を端末へ、ログから中身を外す）

作者の判断。**Supabase に保存されていれば、サーバーの鍵を持つ
開発者が中身を見られる。** 認可の設計では消せない、置き場所そのものの問題。

**写真を端末の中だけに置いた**

選択肢は3つあった。

| 案 | 内容 | 採否 |
|---|---|---|
| A | 端末内のみ | **採用** |
| B | 端末で暗号化して送る | 鍵を失うと永久に読めない。1人・写真1枚に釣り合わない |
| C | 写真機能をやめる | 「書けない日の受け皿」ごと失う |

置き場所は `documentDirectory`。`cacheDirectory` ではない
（OS が容量不足のとき黙って消すため）。

ファイル名に保存時刻を入れている。同じパスに上書きすると
React Native の `Image` が古い画像をキャッシュから出し続けるため。

**Web では写真を扱わない。** ブラウザに、消えない置き場所が無い。
記録アプリで「いつか消える写真」を受け付けると、
4段の4（後で振り返れる）を壊す。中途半端に置けるようにするより、
置けないと分かる方がよいと判断した。

`PhotoPicker.web.jsx` は `null` を返すだけのファイルだが、**分岐ではなく
ファイルを分けている**。1つのファイルの中で分岐すると
expo-image-picker と写真の文言が Web バンドルに乗る。

引き換えに、端末を変えると写真は移らない。

**サーバーのログから記録の中身を外した**

Render のログは保存され、あとから読める。3か所見つかった。

- `modules/ai.py` が解析失敗時に AI 出力の先頭200文字を出していた。
  AI憲法の原則2に従い **AIは利用者の言葉を引用する**ため、
  AI出力には記録の中身が混ざる
- `main.py` の YouTube コールバックがクエリ全体と完全URLを出していた。
  `code` は認可コードそのもの、`state` には user_id が入る
- 保存・トークン更新のたびに `user_id` を出していた（計7か所）

どれもデバッグ中に足されたもので、「気をつける」では防げない。
`tests/test_privacy.py` がソースを読んで検査する。

**ついでに直したもの**

`client/lib/exportLogs.js` がネイティブで落ちる状態だった。
SDK 57 の `expo-file-system` は `cacheDirectory` /
`writeAsStringAsync` を主エントリから外し、呼ぶと実行時に投げる。
**Web は `.web.js` を使うため気づけていなかった。**
配布前に見つかったのは幸運だった。

**削除したもの**

- `modules/photos.py`・`tests/test_photos.py`・`tests/test_photo_routes.py`
- 写真のAPI 2本（34→32ルール）
- `lib/supabase.js` の `uploadPhoto` / `removePhoto`
- 本番の写真1枚（Storage 2ファイル・DB 1行）

`logs` テーブルの `photo_path` / `photo_thumb_path` は残っている。
読み書きはしていない。列を落とすSQLは `HANDOFF.md` にある。

**検証結果: OK**

- pytest 578件パス（新規 test_privacy.py 22件）/ vitest 82件パス（新規20件）
- `expo export --platform web` 成功。バンドルを検査し、
  写真のサーバー経路（`/photo`・`uploadPhoto`・`photo_thumb_path`）と
  写真UIの文言、`expo-image-picker` が**すべて消えている**こと、
  記録の中身（4項目・アイデア・版数1.0.0）は残っていることを確認
- ローカルでWebを起動し、コンソールエラー0件・ログインの `<form>` が健在
- 意図的に漏らす変異を5通り作り 5/5 を検出。
  **1通目の検査は `row.get("content")` を見逃した**ため、
  書き方ごとの条件をやめ、出力に渡る文字列を丸ごと見る形に直した

**残した論点**

記録テキストにも同じ問題がある。ただし端末へ移せない
（AI・振り返り・検索・計測がすべて依存している）。
取りうるのは端末での暗号化だが、鍵を失うと全記録が読めなくなる。
**今の利用者は作者1人なので急がないが、他人が使い始める前に決める。**
後から移すのは最初からより難しい。`HANDOFF.md` に書いた。

---

### 2026/08/06（アカウント削除・プライバシーポリシー・後片付け）

**App Store がアカウント削除をアプリ内に置くことを必須にしている**
（ガイドライン 5.1.1(v)）。Lantern は新規登録を持つため、
これが無いと審査を通らない。調べるまで気づいていなかった。

要件である以前に、記録アプリとして持っているべき機能でもある。
「自分の言葉を自分で引き上げられる」ことは、預ける側の当然の権利。

**やったこと**

- [x] `modules/account.py` と `DELETE /api/account`
- [x] Settings に2段階の確認つきで導線を追加
- [x] `tests/test_account.py`（12件）
- [x] `PRIVACY.md`
- [x] 記録の暗号化の設計
      （`docs/superpowers/specs/2026-08-06-record-encryption-design.md`）
- [x] 空になった `lantern-photos` バケットを削除
- [x] 孤児 worktree を削除（648K → 17K）

**削除の順番**

**行を消してから、認証の利用者を消す。** 逆にすると、認証が先に消えた
時点で誰も辿れない行が残る。`user_id` でしか引けないため消せないゴミになる。
途中で失敗したら認証の利用者は消さない。
「消えたことになっているのに残っている」状態を作らない。

**危ないのは `.eq("user_id", ...)` の脱落。** 落とすと全員の記録が消える。
テストが全表について絞り込みを検査する。

**表の足し忘れ**

利用者に紐づく表が増えたとき、削除対象に足し忘れると
「退会したのに記録が残る」形で現れる。画面には出ないので気づけない。
テストが `modules/` を走査して、使っている表が削除対象にあるか見る。

これが `goals` を捕まえた。`.eq("id", 1)` で引く単一行で `user_id` を
持たず、そもそも DB に実在しない死んだコードだった。
`load_goals()` が毎回失敗を握り潰している。
目標設定機能は REQUIREMENTS.md の「やらないこと」に入っているため
コードごと消せるが、`modules/ai.py` の引数を変える必要があるため別作業にした。

**プライバシーポリシーで隠さなかったこと**

記録は Supabase に平文で保存され、**提供者が管理者として閲覧できる**。
そう書いた。暗号化していない状態で取れる誠実な形はこれしかない。

暗号化は写真と同じ手が使えない。AI応答・今日の灯り・振り返り・
過去との対話・キーワード・計測が、すべてサーバー側のテキストに依存している。
端末へ移すと中身がほぼ無くなる。
取りうるのは端末での暗号化だが、パスワードを忘れると永久に読めなくなる。
**分かれ目はストア公開の前。** 後から移すと既存記録の移行が要る。

**検証結果: OK**

- pytest 590件パス（新規12件）/ vitest 82件パス
- `expo export --platform web` 成功
- 本番で実行したのはバケット削除のみ。空であることを確認してから消した

---

### 2026/08/06（プライバシーポリシーの掲載先）

**Vercel に同梱する形にした。** `client/public/privacy.html` を置くと、
`expo export --platform web` が出力の直下へそのまま複製する（実測で確認）。
次のデプロイで `https://lantern-inky-three.vercel.app/privacy.html` になる。

**アプリ内のルートにしなかった理由。**
`_layout.jsx` の認証ガードが未ログインを `/login` へ振り替えるため、
審査担当者が読めない。App Store のポリシーURLは
**ログイン不要で開ける**必要がある。
`public/` の静的ファイルは SPA のルーティングを通らない。

`vercel.json` は catch-all の rewrite を持つが、Vercel は rewrites より
先にファイルを探す。`favicon.ico` や `_expo/static/...` が現に配信できて
いるのがその証拠なので、privacy.html も同じ経路で出る。

**GitHub Pages は使えない。** リポジトリが Private のため、
無料枠では公開されない。

**HTML は生成物にした**

同じ文面を2か所に置くと必ずずれる。このプロジェクトでは
PROJECT_MAP.md と MVP_SPEC.md が実際にずれた。
`PRIVACY.md` を唯一の原本とし、`scripts/build_privacy.py` が HTML を作る。
Markdown ライブラリは足していない（サーバーの依存を増やさないため、
使っている記法だけを扱う小さな変換を書いた）。

`tests/test_docs.py::TestPrivacyPage` が一致を検査する。
あわせて「提供者が管理者として閲覧できる状態にあります」の一文が
消えていないことも見る。**暗号化していない以上、ここを隠すのは不誠実**なので、
文書から落ちたら落ちるようにした。

**検証結果: OK**

- pytest 596件パス（新規6件）
- `expo export --platform web` 後、`dist/privacy.html` を配信して
  ブラウザで全文を確認。見出し10・表4がすべて描画され、
  `**` や `|` などの記法が本文に漏れていないことを確認
- 意図的なずれを3通り作り 3/3 を検出
  （原本を直して生成し忘れる・「閲覧できる」を隠す・生成物だけ手で直す）

**途中で起きたこと**

`expo export` が `EINVAL readlink` で落ちた。`public/` とは無関係で、
起動したままの dev サーバーと Metro のキャッシュが競合していた。
サーバーを止めて `node_modules/.cache` を消したら通った。

---

### 2026/08/06（ビルドの下ごしらえ）

**ネイティブ設定が正しく落ちることを、ビルド前に確認した。**
`npx expo config --type introspect` は config plugin を評価した結果を返す。
ファイルを書かずに中身を見られるので、ビルド枠を使わずに検証できる。

| 項目 | 結果 |
|---|---|
| `NSPhotoLibraryUsageDescription` | 意図した文面が入っている |
| `NSCameraUsageDescription` / `NSMicrophoneUsageDescription` | **入っていない** |
| `ITSAppUsesNonExemptEncryption` | `False` |
| `CFBundleShortVersionString` | `1.0.0` |
| Android の権限 | `READ/WRITE_EXTERNAL_STORAGE`・`INTERNET` のみ |

カメラとマイクを `false` にした指定は、iOS 側でもキーを出さないことを確認した
（ドキュメントには「Androidの権限をブロックする」としか書かれておらず、
iOS の挙動は不明だった）。使わない権限を宣言せずに済んでいる。

**`eas.json` の channel を外した**

`expo-updates` を入れていないのに全プロファイルが `channel` を持っており、
ビルドのたびに警告が出ていた。OTA更新を使っていないので channel は無意味。
使うことにしたら、そのとき `expo-updates` と一緒に戻す。

**残るのは Apple の認証情報だけ**

非対話で試すと
`Credentials are not set up. Run this command again in interactive mode.`
で止まる。Apple ID のパスワードと2要素認証の入力が要るため、ここは
利用者が1回だけ対話で実行する必要がある。**ビルド枠は消費されない。**

配布は `preview`（内部配布）ではなく `production` を選ぶことにした。
`preview` は端末のUDID登録が要る。`production` は TestFlight 経由で
自分の端末に入り、そのまま審査に出せる同じ成果物になる。

EAS 側の環境変数（`EXPO_PUBLIC_*` 3件）は preview / production の
両方に設定済みであることを確認した。

---

### 2026/08/06（公開前のスタック棚卸）

**本番で Flask の開発サーバーが動いていた。** 応答ヘッダで判明した。

    Server: Werkzeug/3.1.8 Python/3.14.3

`Procfile` が `web: python -u main.py` で、Werkzeug がそのまま公開されていた。
Flask 自身が本番利用を警告している構成で、同時実行にも耐えない。
**2ヶ月気づかなかったのは、動いてはいたため。**

| 指摘 | 対応 |
|---|---|
| 本番が開発サーバー | `Procfile` を gunicorn に。`--workers 1 --threads 8 --timeout 60` |
| 依存が未固定（名前だけ） | 全て `==` で固定。pytest 596件が通る組み合わせ |
| Python の版が未固定 | `.python-version` に `3.14`。本番の実測値に合わせた |
| 死んだ CORS 許可 | `http://localhost:5173`（Vite、2026-08-04 に廃止）を削除 |
| npm の脆弱性 | 対応せず（後述） |
| モデルが1世代前 | 判断待ち（後述） |

**gunicorn の設定**

I/O待ちが仕事のほぼ全て（Supabase・Anthropic）なので、
プロセスを増やさずスレッドで捌く。Render の無料枠は 512MB で、
ワーカーを増やすとメモリが厳しい。1プロセスなら Unsplash の
プロセス内キャッシュも1つで済む。

`--timeout 60` は AI の待ち時間（10秒）より長くしてある。
短いと応答を待っている最中にワーカーが落とされる。

**アクセスログは有効にしない。** クエリ文字列ごと記録されるため、
OAuth のコールバックURLに乗る認可コードがログに残る。
`tests/test_privacy.py` で塞いだ漏れが別経路で復活する。

**npm の脆弱性は対応を見送った**

`npm audit fix` で high 1件（`brace-expansion` の DoS）は消えたが、
Expo の想定版が崩れて `expo-doctor` が落ちた。戻した。

残る11件は全て `uuid` の境界チェック漏れで、`@expo/config` 系の
**ビルド時ツール**にしか入っていない。利用者に配られるバンドルには乗らない。
解消には Expo 側の breaking change が要る。

**Expo の追随は上流の不整合で止まっている**

作業中に `expo@57.0.11` が公開されたが、その想定表は
`expo-sharing@~57.0.10` を要求する。**公開されている最新は 57.0.8。**
`expo install --fix` が解決できない。上流が直るまで
検証済みの組み合わせ（`expo@57.0.10`）に留める。

**残した判断: AIモデル**

`claude-sonnet-4-6` を使っている。Claude 5 系が出ているため1世代前。
上げると応答の質は上がるが、**文体が変わる**。
Lantern の AI は憲法で文体まで縛っているので、
差し替えるなら出力を読んで確かめる必要がある。費用も変わる。
機能ではなく体験の変更なので、勝手に上げない。

**検証結果: OK**

- pytest 621件パス（新規 `test_deploy.py` 25件）
- gunicorn と同じ経路（`main:app` を WSGI として呼ぶ）で疎通を確認。
  `/api/debug/version` が 200、未認証の `/api/logs` が 401、
  CORS が本番オリジンと 8081 のみ許可し 5173 と外部を拒否
- 意図的に壊す変異を8通り作り 8/8 を検出
  （開発サーバーに戻す・タイムアウト短縮・アクセスログ有効化・
  ポート固定・版の固定解除・gunicorn 削除・Python版指定の削除・
  死んだ origin の復活）

**次のデプロイで確認すること**

`Server:` ヘッダから Werkzeug が消えること。

---

### 2026/08/07（アイコンを決めた）

**Expo の雛形のアイコンがそのまま入っていた。** 青いシェブロンに
作図ガイド線（点線・十字）まで付いたまま。Android用の3枚も同じ。
ビルドもテストも通るので、実物を開くまで気づけなかった。

**類似調査**

App Store の journal / diary / meditation / mood で実際に出てくる
**74件のアイコンを取得して並べた**（iTunes の公開API）。
名前や説明文では似ているか分からない。画像を見るしかない。

作者が選んだ「暗がりの暖かい円」には、近いものが4つあった。

| アプリ | 近さ |
|---|---|
| Mood AI - Daily journal | **暗い背景に光る球体。同じ日記カテゴリ** |
| Headspace | オレンジの円。この分野で最も知られた形 |
| Aura | 光るグラデーションの円 |
| TIDE | 桃色に光るリング |

**収穫は逆側にあった。74件のうち、深い緑を地にしたものが1つも無い。**
ピンク・青・オレンジ・白・紫が占めている。
つまり方向（暗がりの暖かい光）は正しく、弱いのは**円という形**だった。

商標のクリアランスはしていない。見た目の照合までしかできない。

**決定：K3（灯り）**

深緑 `#22382F` の地に、暖色の縦の光をひとつ。円をやめた。

途中で作った案と、落とした理由。

- 蝋燭型（先細り＋足元の溜まり）→ **蝋燭にしか見えない**。避けたかった形そのもの
- 灯った窓（枠に横桟）→ ライターかモバイルバッテリーに見える
- 灯った日（カレンダーの枡）→ 意味は最も強いが、アプリ一覧のグリッドに見える
- 比率 1:4 → 数字の1に寄る。**1:2.9 に変えて解消**

**技術的な学び**

暖色を低い透明度で深緑に重ねると、**必ずくすんだオリーブ色になる**。
最初の6案が濁っていた原因。単色で置くと解消する。

**作ったもの**

| ファイル | 用途 |
|---|---|
| `icon.png` | iOS / 共通。1024四方・**アルファ無し**（App Store が弾くため） |
| `android-icon-foreground.png` | 前景。中央66%の安全域に収めた |
| `android-icon-background.png` | 背景。単色 `#22382F` |
| `android-icon-monochrome.png` | テーマアイコン用。白＋透過 |
| `favicon.png` | Web。48→256四方に拡大 |

`app.json` の `adaptiveIcon.backgroundColor` が雛形の水色 `#E6F4FE` のままで、
緑の前景と噛み合わなくなるところだった。`#22382F` に直した。

**検証結果: OK**

- pytest 646件パス（新規4件）/ vitest 82件パス / `expo export` 成功
- 背景と前景を合成し、**円形マスクで切っても安全域に収まる**ことを確認
- PNGヘッダを検査。iOS用がアルファ無し、Android前景が透過あり
- `tests/test_docs.py::TestIcons` が、雛形の水色への逆戻りと
  アルファ混入を機械で止める

---

### 2026/08/07（アイコンを作者提供の画像に差し替え）

私が出した24案では決まらず、作者が用意した画像（暗い紺地に灯ったランタン）を採用した。

**そのままでは使えなかった。**

元画像は角が丸く落とされ、その外側が白かった。
**iOS は正方形を受け取って自分でマスクをかける。**
角丸のまま渡すと、マスクの外に白い三角が残る。
四隅からフラッドフィルで白を落とし、地の色 `#181F2F` で埋めて
全面ベタの正方形に戻した。角丸の境界に残るアンチエイリアスの
中間色も、外周付近に限って地の色へ寄せている。

**Android の背景色を紺に合わせた。**
`adaptiveIcon.backgroundColor` が緑 `#22382F` のままだと、
マスクの縁で紺と緑が食い違う。`#181F2F` にした。

**前景は不透明にした。** 通常は透過させるが、この絵は地の紺と発光が
溶け合っており、切り抜くと光の外周に硬い縁が出る。
不透明のまま背景と同色にすることで継ぎ目を消した。
検査もそれに合わせて「透過を持つこと」から「寸法が正しいこと」に変えた。
**テストの方を実態に合わせた例。**

**検証結果: OK**

- pytest 646件パス / vitest 82件パス / `expo export` 成功
- 四隅が地の色になり、白が0箇所であることを確認
- 角丸の内外の色差は 3/255。実サイズ（180/120/60/40px）で継ぎ目は見えない
- 40px でもランタンと判別できる

**残した論点**

絵の地は紺 `#181F2F` で、アプリの配色（森 `#22382F` / クリーム `#FAF6EE`）とは別系統。
アイコンと画面で色の系統が違うが、実害はない。揃えるなら絵の側を寄せる。

---

### 2026/08/07（ドメイン移行の完了確認）

作者が残りの設定を行い、こちらで実測して確認した。

| 対象 | 結果 |
|---|---|
| `api.golantern.app` | 200・TLS検証0・未認証の `/api/logs` は 401 |
| `youtube_redirect` / `twitch_redirect` | 新ドメインに切替済み |
| `redirect_misconfigured` | `[]` |
| **本番のサーバー** | **`gunicorn`。Werkzeug が消えた** |
| プライバシーポリシー | 公開済み・ログイン不要で開ける（5340字） |
| 旧 `onrender.com` | 200。既存の TestFlight ビルドは無事 |

**Procfile が効いていなかった問題も解消した。**
`x-render-origin-server` が `Werkzeug/3.1.8` から `gunicorn` になった。
2026-08-06 に「本番で開発サーバーが動いている」と指摘した状態が、
これで実際に直った。

**Web だけ残っている**

配信中のバンドルは最新のコードを含んでいる（保存の待ち表示・
アカウント削除・版数1.0.0 がいずれも入っている）のに、
向き先が `onrender.com` のままだった。

`client/.env` は Git 管理外なので、Vercel は自分の環境変数から値を取る。
**環境変数はビルド時に埋め込まれるため、保存しただけでは変わらない。**
再デプロイが要る。

切り分けは、配信物に「新しいコミットで入った文言」が含まれるかで行った。
含まれていれば「コードは新しいが環境変数が古い」、
含まれていなければ「そもそもデプロイが古い」と判別できる。

---

### 2026/08/07（Web の切替完了・iOSビルド成功）

**ドメイン移行が8段階すべて完了した。**

配信中の Web バンドルを取って検査し、`api.golantern.app` を向き、
旧 `onrender.com` が消えていることを確認した。

**iOSビルド #4 が成功した。** commit `b6d45da`・版数 1.0.0・store 配布。
アイコン確定（`31759f2`）とドメイン切替（`1a64267`）の両方を含むため、
作り直しは要らない。

**この移行で学んだこと**

**環境変数はビルド時に埋め込まれる。** 値を変えただけでは配信物は変わらない。
Vercel は再デプロイ、ローカルの Metro は `--clear` が要る。
どちらでも実際に引っかかった。

切り分けに使えたのは「新しいコミットで入った文言が配信物にあるか」。
あれば「コードは新しく環境変数が古い」、無ければ「デプロイ自体が古い」。
**配信物を取って中身を検査するまで、切り替わったと判断しない。**

---

### 2026/08/07（実機で見つかった不具合の修正・1）

TestFlight で実機に入れて、初めて分かったことが3つ。

**1. 記録欄で1文字しか打てなかった（致命的）**

`RecordForm` の中で `Field` を定義していた。1文字打つたびに
`setForm` で再描画され、そのたびに `Field` が別の関数になる。
React は「別のコンポーネントに変わった」と見なして `TextInput` を
作り直すため、フォーカスが外れてキーボードが閉じていた。

**記録アプリとして機能していなかった。**
pytest も vitest も expo-doctor も通っていた。
Web では気づきにくく（ブラウザは入力中の要素を作り直しても見た目が近い）、
実機に入れるまで誰も気づけなかった。

`Field` をモジュールの直下へ出し、`value` / `onChange` を props で渡す形にした。

**2. 起動画面が一瞬ちらつく**

原因が2つ重なっていた。

- `showSplash` を `false` で始めていたため、読み込みが終わる前に
  本画面が描画され、あとからスプラッシュが被さっていた。
  `null`（判定前）を足し、**判定が済むまで本画面を出さない**ようにした
- `expo-splash-screen` を入れておらず、**ネイティブの起動画面が既定の白**だった。
  暗いテーマの端末では白→暗の点滅になる。
  プラグインを入れ、地の色をアプリに合わせた（明 `#faf9f7` / 暗 `#1c1c1e`）

**3. YouTube / Twitch のタブにラグ**

`activeTab === 'youtube' ? <A/> : <B/>` で出し分けていたため、
切り替えるたびに片方が破棄されていた。戻るたびに連携状態・
チャンネル・動画一覧・推移を取り直しており、外部APIを経由するので
数秒かかっていた。

開いたパネルは残し、`display:'none'` で隠すだけにした。
最初から両方読むと初回が重くなるので、開くまでは作らない。

**再発防止**

`tests/test_react_patterns.py` を追加した（38件）。

- コンポーネントの中でコンポーネントを定義していないか
  （`function` 形式・アロー関数形式の両方）
- `Field` が `value` / `onChange` を props で受け取っているか
- ダッシュボードがタブ切替でパネルを破棄していないか

画面の描画をテストする仕組みは入れていない。持ち込む依存と維持の手間が
大きいわりに、**ここで見たいのは描画結果ではなく書き方の誤り**なので、
文字列と正規表現で足りる。

**検証結果: OK**

- pytest 684件パス（新規38件）/ vitest 82件パス
- 意図的に壊す変異を3通り作り 3/3 を検出
- `expo config --type introspect` で `expo-splash-screen` が
  プラグインに入ったことを確認
- `expo export --platform web` 成功

**まだ残っている指摘**

タブのアイコン・文字サイズ・ブランドカラー・ログイン画面の分離。
順に進める。

---

### 2026/08/08（配り方を整える）

**修正のたびに20分待つ状態をやめた。**

| 追加 | 目的 |
|---|---|
| `expo-dev-client` | 開発用ビルドを1回作れば、以後は保存した瞬間に実機へ反映される |
| `expo-updates` | JSだけの修正を、ビルドし直さずに配れる |

`eas update:configure` が `updates.url` と `runtimeVersion` を設定し、
`eas.json` の各プロファイルに `channel` を戻した
（2026-08-06 に「使うことにしたら expo-updates と一緒に戻す」と書いたもの）。

**`runtimeVersion` を `appVersion` から `fingerprint` に変えた。**

既定の `appVersion` は `app.json` の `version` をそのまま実行時の版に使う。
この構成は `appVersionSource: remote` と `autoIncrement` なので、
**ビルド番号だけが上がって `version` は 1.0.0 のまま**になる。

つまりネイティブの依存を足しても実行時の版が変わらない。
その状態で `eas update` を打つと、新しいJSが「その依存を持たない
古いビルド」にも配られ、**起動時に落ちる。**

`fingerprint` はネイティブの構成から版を計算するため、
合わないビルドには配られない。届かないのは不便だが、落ちるよりよい。
`tests/test_deploy.py::TestOtaUpdates` が固定する（変異検査 3/3 検出）。

**上流の不整合が解けた**

`expo@57.0.11` の想定表が要求する `expo-sharing@~57.0.10` が
公開されず数日止まっていたが、公開されたので `expo install --fix` で
揃えた。**`expo-doctor` が 20/20 に戻った。**

**検証結果: OK**

- pytest 688件パス / vitest 82件パス / expo-doctor 20/20
- `expo export --platform web` 成功
- STACK.md の版を実装に合わせた（検査が2件落ちて気づいた。**文書の方を直した**）

---

### 2026/08/08（実機で見つかった不具合の修正・2 — タブ）

**ボトムタブにアイコンが無かった。**

`tabBarIcon` を一度も渡しておらず、React Navigation の既定表示
（塗りつぶした三角）が4つ並んでいた。実機で「アプリ感がない」と
言われた主因はこれだと見ている。

**気づけなかった理由がはっきりしている。** アイコン自体は
`SidebarTabBar.jsx` の中に作ってあった。ただしそれは**768px以上の
広い画面でしか使われない描画**で、ネイティブは必ず狭い側に入る。
Web の広い画面でばかり確認していたため、
「アイコンはある」と思い込んでいた。

`components/TabIcons.jsx` に切り出し、サイドバーとボトムタブが
同じものを使うようにした。同じ絵を2か所で持つと、片方だけ直して食い違う。

**ラベルを「今日」から「書く」に変えた**

実機で「何をするセクションなのか分からない」と指摘された。
**「今日」は時点であって、行為ではない。** 隣が「記録」なので、
どちらも記録に関する場所に見えてしまっていた。

「書く」（これから残す）と「記録」（残したもの）で役割が分かれる。

**検証結果: OK**

- pytest 692件パス（新規4件）/ vitest 82件パス
- `expo export` 後、バンドルに4つのラベルとアイコンの実データが
  入っていることを確認
- `test_react_patterns.py` に検査を追加。`tabBarIcon` の指定・
  共有ファイルの参照・全タブにアイコンがあること

**文書のずれを検査が捕まえた**

コンポーネントを1つ増やしたところ、`test_docs.py` が
PROJECT_MAP.md と STACK.md の件数不一致で落ちた。文書の方を直した。

---

### 2026/08/08（実機の指摘・3件）

**1. AIの応答が、記録を並べ直しているだけだった**

実機での出力。

    App Storeへの配信準備が、今日のことです。
    自分のアプリをスマホで触れた瞬間があったようです。その感覚は、どんなものでしたか。
    ドメインや認証まわりの登録が、詰まったこととして残っています。

作者の指摘は「事実をただ述べているのと、Lantern として受け答えしているので
差がひどすぎる」。**中の1文だけが Lantern で、前後は項目の言い換えだった。**

原因は**プロンプトの自己矛盾**。`LANTERN_IDENTITY` は
「具体的な活動名を列挙して要約しない」と定めているのに、
`get_ai_response` の指針が真逆を指示していた。

    「よかったこと」「詰まったこと」は記入があれば自然に織り込む
    「次にやること」は記入があれば文に溶け込ませる
    今日のことへの観察 → 詳細（あれば静かに触れる） → 余白を残して終わる

各項目に触れろ、この順に並べろ、と言っている。
より具体的な指示が勝つので、AIは律儀に1項目1文で並べていた。

**良い例も加担していた。**「詰まったことが残っています。それだけ
向き合っていた時間だったようです。」は、フォームの項目名をなぞっているだけで、
その人の記録の話になっていない。どの記録にも当てはまる文は、その人の記録ではない。

書き換えた要点。

- **一つだけ拾う。** 全項目に触れない・並べない・要約しない
- 3段構成の指示を削除
- **悪い例に、実際に出た文をそのまま載せた**（何が駄目かは具体でしか伝わらない）
- 200字 → 120字（短い方が並べにくい）

**実際にAPIを呼んで確かめた。** 同じ入力で3回、いずれも一つを拾う形になった。

    自分のアプリをスマホで触れた瞬間、どんな感覚でしたか。（27字）

**2. 過去との対話でカードから文字がはみ出していた**

`LogSnapshot` に `flex-1` が付いていた。横に並べていた頃（Web版）の
名残で、幅を等分するための指定。縦積みに変えたあとも残っていたため、
**2枚が同じ高さに揃えられ、中身の多い方がカードの外へあふれていた。**

中身の分だけ伸びればよい。2枚の高さを揃える理由は無い。

**3. アイデアの置き場所と語**

置き場所を「記録」から「書く」へ移した。
思いついた瞬間に置くものなので、書く場所にある方が自然。
「記録」は残したものを見る場所であって、置く場所ではなかった。

語を「拾う」から「使った」へ変えた。
「拾う」はタスク化を避けるために選んだ語だったが、
**作者自身が「どういう意味？」と尋ねた。**
意図が正しくても、伝わらなければ意味がない。

「完了」は引き続き避ける。未完了という対が生まれ、残りが負債に見えるため。
使ったものには取り消し線を引き、**消さずに残す**。
列名（`picked_at`）は変えていない。画面の語と保存の形は別の問題。

**検証結果: OK**

- pytest 692件パス / vitest 82件パス
- AIは実際に3回呼んで出力を確認
- バンドルを検査し、「拾う」が消えて「使った」と取り消し線が入り、
  `flex-1` が消え、タブが 書く（記録・アイデア）／記録（記録・振り返り）に
  なっていることを確認

---

### 2026/08/08（AIプロンプトの再発防止と全点検）

**「憲法を書いておけば守られる」が成り立たないことが分かった。**
`LANTERN_IDENTITY` に「列挙して要約しない」と書いてあっても、
関数側の指針が真逆を指示すれば、具体的な方が勝つ。

**例文も指示である。** 「詰まったことが残っています。それだけ向き合って
いた時間だったようです。」を良い例として置けば、AIはそれを学ぶ。

### 二層で守ることにした

| 層 | 何を見るか | いつ |
|---|---|---|
| `tests/test_prompts.py`（61件） | プロンプトの書き方 | pytest のたび |
| `scripts/audit_ai.py` | 実際に返ってきた文 | 手で動かす（課金される） |

静的検査が見るのは、憲法が渡っているか・良い例に禁止ワードが無いか・
**良い例が項目名を主語にしていないか**・列挙を指示していないか・
例に Markdown が無いか。

**静的検査では出力の良し悪しは分からない。**
「App Storeへの配信準備が、今日のことです。」には禁止ワードが無く、
字数も守り、Markdown も無い。機械には合格に見える。
だから実際に呼んで人が読む層を別に用意した。

### 検査が見つけたもの

**1. 起動画面の一言が憲法の外にあった**

`get_splash_quote` だけ `LANTERN_IDENTITY` を渡していなかった。
「説教せず」「才能・努力・結果を評価しない」とは書いてあったが、
禁止ワード（頑張って・成長・一歩・前進）は効いていなかった。
**起動画面は利用者が最初に見る言葉**なので、ここだけ外に置く理由が無い。

**2. `generate_video_insight` の良い例が項目名をなぞっていた**

「投稿した週、詰まったことが多く書かれています。」
記録ではなく入力欄の話になっている。書かれた言葉そのものを引く形に変えた。

### 検査そのものを2回直した

最初の版は誤検出と見逃しの両方があった。

- `call_claude` などの送信用関数まで対象にしていた（誤検出）
- `_PATTERNS_SYSTEM = LANTERN_IDENTITY + "..."` の**定数経由を追えず**、
  正しく書けている関数を落としていた（誤検出）
- `【記録がある場合の良い例】` のような**名前付きブロックを拾えず**、
  `generate_video_insight` の悪い例文を見逃していた（見逃し）

**検査を書いたら、検査自体を疑うこと。**

### 全11経路を実際に呼んだ

保存後の応答・今日の灯り・起動画面（2種）・週次・月次・過去との対話・
節目・チャンネル・動画・配信。**機械で分かる違反は 0 件**で、
出力も一つを拾って応える形になっていた。

    自分のアプリを、自分のスマホで触れた瞬間があったようです。
    その感覚は、どんなものでしたか。

点検スクリプト自身の不具合も1件出た。`generate_video_insight` に
list を渡して落としていた（実際は文字列を受け取る）。
**呼び出し側と同じ形で渡すこと。**

**検証結果: OK**

- pytest 753件パス（新規61件）/ vitest 82件パス
- 11経路すべてを実際に呼んで出力を確認

---

## 2026/08/08 — カラーシステム v1.4・書体・文字サイズ

実機を見た作者の指摘から始まっている。
**「カラーの統一感がない。ブランドカラーが分からない。」**
**「全体的にフォントが小さい。」**

色を決めていなかったわけではない。**役割を決めていなかった。**
緑が見出しにも文字にも枠にも出て、橙が節目にもタブにもリンクにも出ていた。

### 5つの役割に整理した

地 / ブランド / AIの声 / 灯り / 本文・補足。定義は
`CLAUDE.md`「カラーシステム」、値は `client/global.css`、
名前は `client/tailwind.config.js`。

**古い名前を消していない。** 画面のコードには色クラスが約340箇所ある。
一斉に置換すると全ファイルが変更対象になり、目視で追えない量になる。
古い名前の**値**を新パレットに向け直したので、既存の画面はそのまま
新しい配色になった。新しく書くコードは新しい名前を使う。

### 暗いテーマでは「面の色」と「文字の色」を分けた

`#2D4A3E` を `#1A1A18` の地に載せるとコントラストが 1.4:1 で読めない。
`text-forest` は24箇所ある。文字としての緑を `#7AA88E` に振り、
面としての `#2D4A3E` は `brand-green` で別に持たせた。
AIの `#4A7C74` も同じ理由で `#7AA89E` に振った。

### Home だけ地を沈めた

`home-bg` `#12130F` / `home-warm` `#B8815A`。
「本当に暗闇に灯りが1つだけある」感覚のため。
Journal / Dashboard / Settings は通常のパレットのまま。
そちらは読むための画面で、暗さは邪魔になる。

### 文字サイズを1段上げた

`text-sm`(14px) / `text-xs`(12px) を多用していた。
本文 15px（`text-body`）/ 補助 13px（`text-aux`）/
今日の灯り 18px（`text-quote`）に置き換えた。145箇所。

**色とサイズに同じ名前を使わないこと。** Tailwind はどちらも `text-` で
出すため、`lantern` を両方に置くと `text-lantern` が色とサイズの
両方を指してしまう。サイズ側を `quote` と呼んだのはそのため。

### 書体を入れた

見出し Noto Serif JP SemiBold / 本文 Noto Sans JP Regular /
英数字 Inter Regular。読み込みは `client/lib/fonts.js` のみ。

**197箇所の `<Text>` に `font-body` を書く代わりに、既定を持つ
`components/Text.jsx` を置いた。** React Native は CSS のような
フォント継承をしない。各ファイルの import を差し替えるだけで済む。

**ウェイトのクラスを全て外した（17箇所）。** 各書体を1ウェイトしか
読み込んでいないため、`fontWeight` を重ねると Android で
端末の既定フォントに落ちる。強調は太さではなく色で付ける。

### 書き出しが 114MB になっていた

`from '@expo-google-fonts/noto-serif-jp'` と書くと index.js を通り、
そこは9ウェイト全部を require している。Metro は require を
木揺すりで落とさないため、**使わないウェイトまで全部同梱された**
（フォントだけで 111MB・35ファイル）。

ウェイトごとのパス（`.../noto-serif-jp/600SemiBold`）から読むよう直し、
3ファイル 12.9MB になった。**書き出して測るまで気づけない類のもの。**

### 変更したファイル

- `client/global.css` — パレット v1.4（ライト/ダーク両方）
- `client/tailwind.config.js` — 新トークン8件・書体3件・サイズ3件
- `client/lib/fonts.js`（新規）— `useAppFonts()`
- `client/components/Text.jsx`（新規）— 本文書体の既定を持つ Text
- `client/app/_layout.jsx` — `useAppFonts()` を呼ぶ
- 画面・コンポーネント 25ファイル — import の差し替え・サイズ・ウェイト
- `CLAUDE.md` / `PROJECT_MAP.md` / `STACK.md`

**検証結果: OK**

- pytest 754件パス / vitest 82件パス / `expo-doctor` 20/20
- `expo export --platform web` 成功。書き出した CSS に
  新トークンと新サイズが出ていることを確認
- ブラウザで実際の計算値を確認。3書体とも `loaded`、
  本文 15px/25.5px・補助 13px/20.8px、
  ライトとダークで CSS 変数が期待通りに切り替わる

**未確認**: 記録・振り返り・Dashboard・Settings の画面は
ログインの先にあるため、目では見ていない。
バンドルは通っており（構文エラーがあれば書き出しが落ちる）、
色とサイズはトークン経由なので効いているが、
**実機で1周見ること。**

---

## 2026/08/08 — 実機指摘の残り3件（ログイン分離・登録の手間・すりガラス）

2026-08-07 の実機レビューで残っていた3件。

### ログインと新規登録を別の画面にした

`/login` と `/signup`。それまでは1画面をモードで切り替えていた。
見出しもボタンも入れ替わるだけなので、**切り替わったことに
気づかないまま送信できる状態だった**。

入力欄は `components/AuthForm.jsx` で共有する。
2回書くと片方だけ直る。

認証ガードは `AUTH_SCREENS`（login / signup）を見るように変えた。
login だけを見ていると、登録画面から本画面へ蹴り出される。

### 登録の手間を4か所削った

- **条件を失敗する前に出す。** 「パスワードは6文字以上」を欄の下に置いた。
  それまでは6文字未満で送ってから初めて知らされていた
- **空欄のまま送らせない。** それまで空欄で押すと Supabase が
  「Anonymous sign-ins are disabled」を返し、**そのまま画面に出ていた**。
  匿名ログインの話は利用者に関係がなく、何をすればよいかも分からない
- **送ったあとの画面に宛先を出す。** 打ち間違いに気づく場所がここしかない。
  再送のボタンも置いた
- **すでに登録済みのときは、その場からログインへ行ける**

Supabase の英文は `lib/authError.js` で日本語の一文に置き換える。
**該当しないものは元の文を出す。** 空文字にすると画面が無反応に見え、
原因を追う手がかりも消える。

確認メール自体は残した。設定で切れば1手減るが、
誰のものか分からないメールアドレスで記録が溜まる。

### ボトムタブをすりガラスにした

`expo-blur` の `systemChromeMaterial`。iOS ではナビゲーションバーと
同じ素材（UIVisualEffectView）で、濃さは OS が決める。
自前で色と濃さを作ると、OS が素材を更新したときにそこだけ浮く。

**透けさせるには絶対配置が要る。** そのぶん画面の一番下が裏に隠れるため、
`lib/tabBar.js` に高さと余白をまとめ、4画面がその分だけ下を空ける。
高さを固定したのは、既定のままだと実測しないと分からず画面側と食い違うため。

`contentContainerStyle` は className を上書きするので、
元の `pb-10` は消して `BOTTOM_GAP` に畳んだ。
残すと「効いているように見えて効いていない」指定になる。

Android は `experimentalBlurMethod="dimezisBlurView"` を渡さないとぼかさない。

### 変更したファイル

- `client/app/login.jsx` — ログインだけに絞った
- `client/app/signup.jsx`（新規）— 登録・確認メールの案内・再送
- `client/components/AuthForm.jsx`（新規）— 共有の入力欄
- `client/lib/authError.js`（新規）＋ `authError.test.js`（6件）
- `client/app/_layout.jsx` — `AUTH_SCREENS` と `/signup` の登録
- `client/app/(tabs)/_layout.jsx` — すりガラス
- `client/lib/tabBar.js`（新規）— 高さと余白
- 画面4つ — 下の余白
- `CLAUDE.md` / `REQUIREMENTS.md` / `PROJECT_MAP.md` / `STACK.md`

**検証結果: OK**

- pytest 756件パス / vitest 88件パス（新規6件）/ `expo-doctor` 20/20
- ブラウザで実際に動かして確認した
  - ログイン → 新規登録 → ログインの往復（履歴が二重に積まれないこと）
  - 空欄で送信 → 「メールアドレスとパスワードを入れてください」。**通信は起きない**
  - 不正な形のアドレスで送信 → 「メールアドレスの形を確認してください」
    （実際に Supabase を呼んで確認。アカウントは作っていない）
  - タブバーが `position: absolute` / 高さ56px / `backdrop-filter: blur(16px)`
  - 明るいテーマ `rgba(255,255,255,0.78)` / 暗いテーマ `rgba(0,0,0,0.6)`
  - 画面の下の余白が 96px（タブバー56 + 余白40）
  - 幅1100pxではサイドバーになり、余白は40pxに戻る

**未確認**: iOS の実機。すりガラスは Web では `backdrop-filter` の
近似であって、**UIVisualEffectView そのものではない**。
素材の見え方は実機で見ること。

---

## 2026/08/08 — iOSビルド #6

版数 1.0.0 / ビルド番号 6。commit `17135f4` から作成。**finished**。

ネイティブ側の追加が3回分たまっていたため作り直した。
OTA では届かないもの。

- `expo-splash-screen` / `expo-dev-client` / `expo-updates`（2026-08-07）
- `expo-font` と書体3つ（約13MB）
- `expo-blur`

`runtimeVersion` は `fingerprint` なので、これらを含む新しい指紋になった。
**#6 向けのOTAが古いビルドに配られることはない。**

### TestFlight へアップロードした

App Store Connect にアプリを登録（Apple ID `6798753977`）してもらい、
`eas submit --platform ios --latest --profile production` で送った。

**1回目は落ちた。** `--non-interactive` だと、どのアプリに送るかを
対話で選べない。`client/eas.json` の `submit.production.ios.ascAppId` に
アプリIDを書いて解決した。以後は聞かれない。
アップロードは1回目には行われていない。

    https://expo.dev/accounts/pillow_hiro/projects/lantern/submissions/4e0bc93b-ea69-432d-baca-4f5a4f3fb239

**まだ審査には出していない。** TestFlight に上がっただけ。

---

## 2026/08/08 — タブのアイコンを2つ直す

TestFlight に上げたあとの指摘。

**「書く」は灯りだった。** タブの名前を「今日」から「書く」に変えたとき、
絵だけ元のまま残っていた。**名前は行為なのに、絵は時点を指していた。**
ペンにした。隣の「記録」がノートなので、行為と置き場所で対になる。

**「設定」は太陽に見えた。** 中心の円から八方へ短い線が出る形で、
歯車のつもりだったが離れて見ると明るさの調節に見える。
歯を台形にして輪郭でつないだ。

**歯は6枚。** 8枚にすると 15px の枠で谷が線幅に埋まり、
縁がぎざぎざの円にしかならない。座標は
中心 (7.5,7.5)・歯先 6.55・谷 4.95 で計算して埋め込んだ。

`components/TabIcons.jsx` の `TodayIcon` を `WriteIcon` に改名した。
サイドバーとボトムタブは `TAB_ICONS` 経由で引くので、
参照は1か所だけ直せばよい。

**検証結果: OK**

- pytest 756件 / vitest 88件 / `expo export --platform web` 成功
- パスを matplotlib で実寸（22px相当）と拡大の2段に描いて目で確認した。
  **小さいアイコンは形が潰れるかどうかが全てなので、実寸で見ること。**

### OTA が届かなかった（`eas.json` と指紋）

1回目の配信はビルド #6 に届かなかった。

    ビルド #6   4ff774b0…
    1回目の更新 1ccd1600…

**原因は `eas.json` に `ascAppId` を足したこと。**
`runtimeVersion` は `fingerprint` 方式で、`eas.json` も計算対象に入っている。
ネイティブの中身は1バイトも変わっていないのに指紋が変わり、
配信済みのビルドが「自分向けではない」と判断した。

**配信は成功しているのでエラーが出ない。届かないだけ。**

`ascAppId` を外すと指紋が `4ff774b0…` に戻ることを
`eas fingerprint:compare` で確かめてから流し直した。

    ✅ Fingerprint 4ff774b0... from IOS build matches ... from local directory

`eas submit --non-interactive` には `ascAppId` が要るが、
置きっぱなしにすると次の OTA も届かなくなる。**提出のときだけ書く。**
次のビルドを作れば、そのときの `eas.json` で指紋が計算し直されるので、
それ以降は残してよい。番号と手順は `HANDOFF.md` と `STACK.md` に書いた。

**`--environment` も必須。** `--non-interactive` では省略できない。
`production` を渡さないと `EXPO_PUBLIC_API_URL` が焼かれず、
**見た目だけのつもりの更新で接続先が変わる。**

---

## 2026/08/09 — DESIGN.md に寄せる（配色・書体・かたち）

TestFlight のビルド #6 を見た作者の指摘。
**「UIにAI感が強く出ている。」「Liquid Glass も反映されていない。」**
**「デザイン専用のフレームワークを絶対に導入したい。」**

作者が `DESIGN.md`（デザインツールで作った仕様書）を渡してきたので、
それを基準に作り直した。**リポジトリに `DESIGN.md` を置き、
生きている文書の7つ目にした。** 色・字・余白・かたちはここが正。

### Liquid Glass について訂正

私が 2026-08-08 に入れた `expo-blur` の `systemChromeMaterial` は
**iOS 7 以来の `UIVisualEffectView` で、iOS 26 の Liquid Glass ではない。**
「同じ素材」と説明したのは誤りだった。

本物にするには `expo-glass-effect@57.0.1`（`GlassView`・iOS 26以上）か、
`expo-router` の `NativeTabs`（本物の `UITabBar` を OS が Liquid Glass にする）
が要る。EAS の既定イメージは Xcode 26.4 なので条件は満たしている。
**まだ入れていない。** 作者の選択で、先に AI感の除去を行った。

### AI感の正体

数えた。

- **文字の太さの差が無い。これは 2026-08-08 に私が壊した。**
  1ウェイトしか読んでいないからと `font-medium` 等を17か所削り、
  **強弱が色でしかつかなくなっていた**
- `SETTINGS` `JOURNAL` `CHANNEL` のような英字のキッカーが12か所
- 設定に 🌙 ☀️ の絵文字
- 角丸が4種類混在（92箇所）
- 12ファイルが `border + rounded` で箱を作り、その中の入力欄も線で囲っていた

**道具が無かったからではない。基準が無いまま私が埋めたから。**

### 直したこと

- **配色を全面的に差し替えた。** 緑（#2D4A3E）をやめ、
  灯りの琥珀（#FBB03B）を主役に、地を紙のような #F9F9FB にした
- **Home だけ地を沈める特例をやめた。** `DESIGN.md` は明るい地で統一する設計
- 文字の段を `DESIGN.md` に合わせた（40/32/24 と 19/17、ラベル 14/12）。
  **記録の本文は 19px**。「じっくり読むため」の大きさ
- 太字（Noto Sans JP Bold）を戻した。強弱は色ではなく太さと大きさで付ける
- 角丸を3段に決めた。押せるもの=full / 入力欄=8px / 面=16px
- 主要ボタンを「琥珀の地に黒い文字・44px 以上」にした
- 今日の灯りの濃い箱をやめ、**左に2pxの琥珀の線**だけにした。
  いちばん静かに置きたい一文が、いちばん目立つ箱になっていた
- 英字のキッカーを全部消し、和文ラベルから字送りを外した
- 絵文字をやめた
- 記録フォームの外枠の線をやめ、面（`bg-surface-low`）にした
- 赤を `error` トークンにした（Tailwind 既定の red は明暗で切り替わらない）

### 書体は読み替えた

`DESIGN.md` は見出しに Hanken Grotesk、本文に Source Sans 3 を指定するが、
**どちらも和文の字を持たない。** 画面はほぼ全部日本語なので、
そのまま指定すると和文だけ端末の既定に落ちる。

**和文は Noto Sans JP に読み替えた。** 仕様が求める
「幾何学的なサンセリフ・太い見出し・詰めた字送り」は、
書体の名前ではなく大きさ・太さ・字送りの側で満たしている。
Hanken Grotesk は欧文だけの「Lantern」の綴りに使う。

Noto Serif JP（明朝）は外した。仕様に明朝は無い。
Source Sans 3 は入れなかった。**出る場所が無い。**
**書体は 18MB から 11MB に減った。**

### 画面の文言にも禁止ワードがあった

    日付をタップして記録を始めましょう
    今日のタブから記録を始めましょう

「〇〇しましょう」は AI憲法の禁止ワードで、
「ユーザーを正しい方向に導こうとしない」に正面から反する。
`tests/test_prompts.py` はプロンプトを見るが、
**画面に直接書いた日本語は誰も見ていなかった。**

`tests/test_ui_words.py` を足して全 jsx を検査するようにした（35件）。
「今日のタブ」はタブ名を「書く」に変えたあとも残っていた語で、これも直した。

**検証結果: OK**

- pytest 793件パス（新規37件）/ vitest 88件パス / `expo-doctor` 20/20
- `expo export --platform web` 成功。書体は3→5ファイル・11.2MB
- ブラウザで計算値を確認
  - 明るいテーマ: surface #F9F9FB / ink #1D1D1F / glow #FBB03B
  - 主要ボタン: 地 #FBB03B・文字 #1D1D1F・角丸 full・高さ 44px
  - 今日の灯り: 左に 2px #FBB03B の線
  - 見出し 24/30・記録の本文 19/32・本文 17/26・ラベル 14/20/0.14px
  - 書体5つとも `loaded`
  - Home / 記録 / 設定 が描画されることを確認

**未確認**: iOS の実機。

---

## 2026/08/09 — 本物の Liquid Glass

2026-08-08 に入れた `expo-blur` の `systemChromeMaterial` は
**iOS 7 以来の `UIVisualEffectView` で、Liquid Glass ではなかった。**
「ナビゲーションバーと同じ素材」と説明したが、屈折も鏡面ハイライトも
スクロールに応じた変形も持たない。**私の説明が誤っていた。**

`expo-glass-effect@57.0.1` の `GlassView` に差し替えた。中身は
`UIGlassEffect`。iOS 26 未満・Android・Web では素の View に落ちるので、
そこは今までどおり `expo-blur` を出す。分岐は `isLiquidGlassAvailable()`。

Liquid Glass のときは自前の境界線を引かない。素材が縁まで持っている。

### `NativeTabs` を採らなかった理由

`expo-router` の `NativeTabs` は本物の `UITabBar` を出すので、
OS が丸ごと Liquid Glass にする。スクロール端での変形も付く。
**それでも採らなかった。**

- アイコンが SF Symbols になり、`TabIcons.jsx` のペンと歯車が使えない
- 広い画面のサイドバー（ロゴ・テーマ切替を持つ自前描画）が失われる
- `unstable_` が付いている

**素材だけを差し替える方が、失うものが少ない。**

### OTA を流し直した

配色の OTA を流している最中に `expo-glass-effect` を入れてしまい、
**書き出したバンドルにネイティブモジュールの import が
混ざった可能性があった。** ビルド #6 にはその実体が無いので、
混ざっていればタブ画面を開いた瞬間に落ちる。

CDN が認証を要求して公開済みバンドルを読めなかったため、
**確かめられないものを残さない**方針で、作業を `git stash` に退避し、
コミット `09e02ba` そのままの状態から流し直した。

    1回目 7f85c476  Commit 09e02ba…*  ← アスタリスク（作業中）
    2回目 d20ad20e  Commit 09e02ba    ← きれい

**アスタリスクの有無が判断材料になる。** 1回目には付いていた。

### 変更したファイル

- `client/app/(tabs)/_layout.jsx` — `GlassView` と分岐
- `client/package.json` — `expo-glass-effect@~57.0.1`
- `CLAUDE.md` / `STACK.md`

**検証結果: OK**

- pytest 793件 / `expo-doctor` 20/20
- `expo export --platform web` 成功。Web で `GlassView` を import しても
  落ちないことを確認（素の View に落ちる）
- ログイン画面が描画され、コンソールにエラーが無いことを確認

**未確認**: **`GlassView` が実際に Liquid Glass として描かれるところ。**
iOS 26 の実機でしか見られない。Web も Android も分岐の反対側に行く。

---

## 2026/08/09 — ビルド #7・提出・指紋の落とし穴2つ

版数 1.0.0 / ビルド番号 7。commit `e47a369` から作成。**finished**。
TestFlight へアップロード済み（`a7520862`）。
Liquid Glass はネイティブの追加なので、ここで初めて実機に載る。

### 落とし穴1: ネイティブを足しても指紋が変わらなかった

    build 7  fp=4ff774b0…  (expo-glass-effect あり)
    build 6  fp=4ff774b0…  (なし)

`@expo/fingerprint` のソース一覧には
`node_modules/expo-glass-effect/ios` が `expoAutolinkingIos` として
入っているのに、ハッシュが同じになる。
**EAS Update はこの2つを区別できない。**

`expo-glass-effect` は読み込んだ時点でネイティブを要求する。

    const NativeGlassView = requireNativeViewManager('ExpoGlassEffect', 'GlassView')
    requireNativeModule('ExpoGlassEffect')   // 任意版ではない

静的 import のままだと、**このJSが #6 に配られた瞬間、
画面を描く前に落ちる。** 指紋の側は直せないので、
関数の中で `require` し `try/catch` で包んだ。
失敗したら「使えない」として `expo-blur` に落ちる。

`tests/test_react_patterns.py::TestNativeOnlyModulesAreLoadedLazily` を足した。

### 落とし穴2: 改行コードで指紋が変わる

提出のために `eas.json` に `ascAppId` を書き、済んでから
`git checkout` で戻した。**Windows では CRLF で書き戻される。**

    LF   → 4ff774b0…
    CRLF → a29b0d07…

中身は1文字も違わないのに、指紋が変わって OTA が届かなくなる。
LF のまま戻して解決した。**戻したら必ず `fingerprint:compare` で確かめる。**

### 配ったもの

| 更新 | 内容 |
|---|---|
| `d20ad20e` | 配色・書体・かたち（`DESIGN.md` 準拠） |
| `790bed51` | Liquid Glass の読み込みを遅らせる |

どちらも runtime `4ff774b0…`。**#6 と #7 の両方に届く。**

**検証結果: OK**

- pytest 795件パス（新規2件）/ `expo-doctor` 20/20
- `expo export --platform web` 成功。ログイン画面が描画され、
  `expo-glass-effect` を読んでもコンソールにエラーが出ないことを確認
- 提出後に `fingerprint:compare` で `✅ matches` を確認

**未確認**: **Liquid Glass が実際に描かれるところ。**
iOS 26 の実機でしか見られない。

---

## 2026/08/09 — AIの声を琥珀と同系にする

実機で「Lanternの回答や今週の発見が水色で囲われている。
オレンジのブランドに合わない」と指摘された。

**私の割り当てミス。** `DESIGN.md` に寄せたとき、AI用の旧トークン
`sage` を `tertiary`（`#006687` の青緑）に向けた。仕様にある色ではあるが、
琥珀を主役にした画面の中で青緑の面だけが浮いていた。

琥珀と同系の、褪せた紙のような砂色に変えた。

| | 明るい | 暗い |
|---|---|---|
| 面 `ai-surface` | `#FFF0DB` | `#382A14` |
| 文字 `ai-ink` | `#6C4500` | `#FFDDB4` |

**灯りの `#FBB03B` は使っていない。** 「1画面に灯り色を2箇所以上
置かない」ため、AIの面と灯りを競合させない。彩度を落とした砂にしている。

コントラストは明るいテーマで約 7.8:1、暗いテーマで約 12:1。

`tertiary` は `DESIGN.md` にある色なので定義は残したが、画面では使っていない。

**検証結果: OK**

- pytest 795件 / vitest 88件 / `expo-doctor` 20/20
- 書き出した CSS に新しい値が入っていることを確認
  （`--color-sage:108 69 0` / `--color-sage-light:255 240 219`）
- 素の `bg-sage` が無く、面はすべて `bg-sage-light/60` であることを確認

---

## 2026/08/09 — タブバーを OS に描かせる（NativeTabs）

実機で「Liquid Glass になっていない」と2度目の指摘。

**素材だけでは Liquid Glass にならなかった。**
`expo-blur` も `expo-glass-effect` の `GlassView` も、
**画面幅いっぱいの長方形にガラスを敷いていただけ**だった。
iOS 26 のタブバーがああ見えるのは、素材に加えて浮いたカプセル形・
縁の鏡面ハイライト・スクロールでの変形があるため。
近似ではどこまでも近似にしかならない。

`expo-router` の `NativeTabs`（本物の `UITabBar`）に変えた。
`minimizeBehavior="onScrollDown"` と `sidebarAdaptable` を渡している。

### ファイルを分けた

| | 実装 |
|---|---|
| `(tabs)/_layout.jsx` | ネイティブ。`NativeTabs` |
| `(tabs)/_layout.web.jsx` | Web。`Tabs` ＋ `SidebarTabBar` ＋ すりガラス |
| `lib/tabBar.js` | ネイティブ。余白は 0（`NativeTabs` が持つ） |
| `lib/tabBar.web.js` | Web。従来の計算 |

ロゴ・テーマ切替を持つサイドバーは `NativeTabs` に差し込めない。
プラットフォーム差はファイル分割で吸収する型に従った。

**前回 `NativeTabs` を避けた理由は弱かった。**
「アイコンが SF Symbols になる」と書いたが、求められていたのは
ペンと歯車で、`pencil` と `gearshape` はまさにそれだった。
「サイドバーが失われる」も、ファイルを分ければ済んだ。

### `expo-glass-effect` は外した

`NativeTabs` が OS に描かせるので要らない。
**指紋の危険も一緒に消えた**（#6 と #7 が同じ指紋になる問題）。

### リビルドは要らない

`NativeTabs` が使うのは `react-native-screens` の `RNSTabs*` で、
**ビルド #6 / #7 に既に入っている**（`RNScreens.podspec` の
`source_files` は `ios/**` を無条件に含む。除外されるのは `ios/gamma/**` だけ）。
新しいネイティブモジュールは足していないので、OTA で届く。

**検証結果: OK**

- pytest 797件パス / vitest 88件 / `expo-doctor` 20/20
- `expo export --platform web` 成功
- Web でファイル分割が効いていることを確認
  - 幅375px … ボトムタブ4つ・絶対配置56px・`backdrop-filter: blur(16px)`・
    内容の余白96px
  - 幅1280px … サイドバー（ロゴ・タグライン・バージョン）・余白40px
- 指紋が `4ff774b0…` のままであることを確認（#6 / #7 に届く）

**未確認**: **iOS 26 実機でのタブバー。** ここだけは実機でしか見えない。

---

## 2026/08/12 — 一覧の作り直しと、タブの再編

作者が Stitch のデザイン案（6画面）を持ってきた。
同梱の `DESIGN.md` は実装済みのものと同一だったので、
**新しいのは画面の作りと構成だけ。**
何を継承し何を落とすかは `REQUIREMENTS.md`「画面構成」と「やらないこと」。

### 一覧をカードと区切り線と抜粋2行にした

1行は **日付（見出しの役）＋本文の抜粋2行**。
記録にタイトルを持たせないと決めたので、日付が見出しを兼ねる。

それまでは日付と本文を横1行に並べ、**本文を20文字で切っていた。
20文字では何の日か分からない。**

月ごとに1枚のカードを置き、中を区切り線で分ける。最後の行には引かない。
**`DESIGN.md` は "Avoid cards" と書いているが、作者の判断でカードにした。**
同梱の Settings 画面が同じ作りなので、案の中で孤立はしていない。

`components/LogList.jsx` に切り出した。**「記録」と「ホーム」が同じ部品を使う。**

### タブを5つにした

    ホーム / 記録 / 書く / ダッシュボード / 設定

並びは作者が決めたもの。**「書く」は真ん中だが、起動時に開くのはここ。**
一覧から始めると書くまでに1タップ増えるため。

**「振り返り」という名前をやめた。** 隣の「記録」と意味が近く、
どちらに何があるのか分からなくなっていた。
振り返りの中身（今週・今月・過去との対話・頻出語）は
外部連携と一緒に「ダッシュボード」へ入れた。
内から見た自分と外に届いた形跡は、どちらも「過ぎたことを眺める」ことなので。

**振り返りを上、YouTube / Twitch を下に置く。記録が主で、数字は従。**

`insights.jsx` の旧URLリダイレクト先を `/journal` から `/dashboard` に付け替えた。
**統合先が変わるたびにここも変わる。**

### ホームと FAB

`app/(tabs)/home.jsx` を新設。直近12件を眺めるだけの画面で、
検索もカレンダーも持たない。**「記録」との違いは、探すか眺めるか。**

**記録が少ないうちは「記録」と似て見える。** 18件の現在はほぼ同じものが
並ぶ。分かれるのは記録が増えてから。承知のうえで置いている。

`components/WriteFab.jsx` を「ホーム」と「記録」に置いた。
押すと「書く」へ移る（新しい画面を積まない。積むとタブの選択と
現在地が食い違う）。**Web ではタブバーが浮いているので、その分だけ上げる。**

時間帯の挨拶（Good Evening）は入れていない。
時間帯で言葉を変えると、評価や勧誘に寄りやすい。

**検証結果: OK**

- pytest 803件パス / vitest 88件パス
- `expo export --platform web` 成功
- ブラウザで `/api/logs` の応答だけ差し替えて（アプリのコードは触らず）
  実際の値を測った
  - 抜粋 17px / 行間26px / `line-clamp: 2` / 実高さ **52px ＝ ちょうど2行**
  - カード 角丸16px・地は `surface-lowest`・内側の余白16px
  - 区切り線 1px。**8月のカードは 1px/1px/0px、7月は 1px/0px**（最後だけ無し）
  - タブ5つが **ホーム / 記録 / 書く / ダッシュボード / 設定** の順
  - 起動時に開くのは `/`（書く）
  - ダッシュボードに振り返り4種が並び、その下に YouTube / Twitch
  - FAB 56×56・`#FFB953`・角丸 full・影は `0 4px 12px rgba(0,0,0,0.05)`
  - FAB の下端は 幅375pxで **80px（タブバー56＋24）**、幅1280pxで 24px

**未確認**: iOS 実機。`NativeTabs` が5つになったときの見え方。

### 依存が9件古くなった

`expo-doctor` が「9 packages out of date」を出すようになった。
上流が新しいパッチ版を出したためで、こちらの変更とは関係ない。
**上げると指紋が変わり、ビルド #6 / #7 に OTA が届かなくなる。**
次にビルドを作るときに一緒に上げる。

---

## 2026/08/12 — 実機の指摘5件（zip の画面構成を読み直した）

タブ再編を実機で見た作者の指摘。**どれも私の反映漏れだった。**

### 今日の灯りがホームに無かった

**デザイン案の Home は「小さなラベル＋大きな一行」で始まる。**
Lantern でそこに当たるのは今日の灯りなのに、私は「書く」に置いたまま
ホームには何も置いていなかった。

ホームへ移した。**「書く」からは外した。**
同じものを2画面に置くと、どちらが本体なのか分からなくなる。

囲まずに、左に2pxの琥珀の線だけ引く。

### FAB がタブバーに隠れていた

`useTabBarInset()` はネイティブで 0 を返す。
`NativeTabs` が**中身の余白**を入れてくれるからだが、
**絶対配置の要素は面倒を見てくれない。**
iOS 26 のタブバーは内容の上に浮くので、`bottom: 24` では裏に入る。

`useFabOffset()` を足した。ネイティブは
ホームインジケータ＋タブバー＋余白の分（`insets.bottom + 76`）、
Web は `useTabBarInset() + 24`。
**スクロールの余白とは別の値が要る。**

### 振り返りを「記録」へ戻した

2026-08-12 の朝に「ダッシュボード」へ出したが、作者の判断で戻した。
記録と振り返りは同じ材料を見るもので、並べて置く方が行き来しやすい。

FAB は記録タブのときだけ出す。振り返りを読んでいるときに
書き始めるボタンが浮いていると、読む邪魔になる。

### 「ダッシュボード」を「インサイト」にした

数字を並べる管理画面ではなく、**観察の材料を置く場所**だという
位置づけを名前に出す。中身と制約は変えていない。

`insights.jsx` の旧URLリダイレクト先も `/journal` に戻した。

### 一覧の日付を相対表記にした

案は `Today · 8:42 PM` / `Yesterday · 9:15 AM` と相対で出している。
`8月11日 火曜日` の羅列より、**どれが直近なのかが一目で分かる。**
今日 / 昨日 / それ以前は日付。時刻は出さない（1日1件で保存していない）。

一覧の下に「これより前の記録」を丸ボタンで置いた（案の "Older entries"）。

**検証結果: OK**

- pytest 803件 / vitest 88件 / `expo export --platform web` 成功
- ブラウザで `/api/logs` と `/api/daily/quote` の応答だけ差し替えて確認
  - ホーム … 今日の灯り → 今日 / 昨日 / 8月9日 日曜日 の順に並ぶ
  - 書く … 今日の灯りが無い
  - 記録 … 「記録 / 振り返り」のタブが戻っている
  - タブ5つが **ホーム / 記録 / 書く / インサイト / 設定**
  - FAB の下端は 幅375pxで 80px（タブバー56＋24）

**未確認**: **ネイティブの FAB の位置。** `insets.bottom + 76` が
iOS 26 の浮いたタブバーを避けられるかは実機でしか分からない。

### まだ反映していない案の要素

- Archive の検索欄・年/お気に入りのチップ・左の縦線と点（**次にやる**）
- 上部のアプリバー（ハンバーガー・中央のロゴ・アバター）。
  アバターはプロフィールを前提にしており、**要件に含まない**
- 一覧の右端のオレンジの点（未読/最近の印）。何を表す点なのかが
  決まっていない。決めてから入れる

---

## 2026/08/13 — FAB をやめ、「分析」を作る

### FAB をやめた

「書く」がタブの中央にあり、どの画面からでも1タップで着く。
**同じ場所へ行く道を2つ作らない。**
`WriteFab.jsx` と `useFabOffset()` を削除した。

### 「インサイト」を「分析」にした

作者が構成案を持ってきた。並びは実装と一致していたが、
4番目の中身が**前日に「やらないこと」へ入れたばかりのもの**だった。

    連続執筆日数（ストリーク）や気分の傾向をグラフ化。数値としての達成感

ストリークの演出・気分の分類・数値としての達成感は、
CLAUDE.md の AI憲法と `REQUIREMENTS.md` が禁じている。
**ただし案が書いている「意図」の方は禁止に触れていない。**

    「自分は今こういう状態なんだ」という気づきを与える鏡

これは Insights AI憲法が定める AI の役割（Prompt ではなく Mirror）そのもの。
衝突していたのは目的ではなく、そこに挙げられた手段だった。

作者の判断で「継続の可視化を煽らずに作る」を選んだ。

### 分析タブの中身

- 記録した日 / 続いている日（設定から移した）
- **年間マップ**（`components/YearMap.jsx`）
- YouTube / Twitch

**2状態しか持たない。** 記録あり（琥珀）／なし（地の段差）。
**濃淡を付けない。** 階調を入れた瞬間、薄い日が「足りない日」に見える。
CLAUDE.md「記録が多い＝良い、という価値観を作らない」に従う。

**増減の矢印・進捗バー・達成率・比較を付けない。**
付けた瞬間、記録が達成すべき数字になる。

数字を設定から移したのは、**設定が道具の手入れをする場所**で、
歩みを見る場所ではないため（作者の構成案の定義）。

格子の組み立ては `lib/yearMap.js` に切り出した。描画から離すと
vitest で検査できる。**「濃淡を持たない」ことも検査に含めた** —
`hasLog` が真偽値以外になったら落ちる。

**検証結果: OK**

- pytest 803件 / vitest 98件（新規10件）/ `expo export --platform web` 成功
- ブラウザで実際の描画を測った
  - タブ4番目が「分析」
  - 年間マップのセルが **371個（53週×7日）**
  - **色は2種類だけ**（記録なし `#E8E8EA` ×369、未来 透明 ×2）。
    8/13 が木曜なので、金・土の2日が未来。階調は無い

### 案との食い違いで、まだ決まっていないもの

- **通知設定**（案のセクション5）。実装が無く、要件から外している
- **羊皮紙のような質感**（案のセクション2）。`DESIGN.md` の地は
  `#F9F9FB`（わずかに青い白）で、羊皮紙ではない
- **心地よい挨拶**（案のセクション1）。時間帯の挨拶は入れない側を
  選んである。いまホームの一番上にあるのは今日の灯り

---

## 2026/08/13 — 記録を Archive の形にし、お気に入りを足す

### 記録の並び順を変えた

上から **検索欄 → チップ → カレンダー → 一覧**。
デザイン案が「検索や月別フィルタを上部に配置」としているのに合わせた。
**探しに来た人が最初に触るものが、最初にある。**

チップは すべて / 年 / お気に入り。
**年は記録がある年だけ出す。** 無い年を並べても押す理由がない。

案には左の縦線と点（タイムライン）もあるが、入れていない。
2026-08-12 に「カード＋区切り線」で行くと決めており、
カードの中にさらに縦線を引くと線が二重になる。

### お気に入り

`logs` に `favorite` 列を足した（**SQL は作者が実行**）。

**記録の保存では触らない。** `_to_db()` はこの列を出さない。
記録フォームは favorite を送らないので、ここに入れると
**編集するたびに星が外れる。** 付け外しは専用の API
（`PUT /api/logs/<date>/favorite`）がその列だけを書く。
`tests/test_logs_mapping.py::TestToDb::test_お気に入りを書かない` で固定した。

**件数を出さない。** 「◯件お気に入り」は多い/少ないの評価になる。

画面は押した瞬間に変える。通信を待たせると、押しても何も起きない
数百ミリ秒ができる。失敗したら元に戻す。

### 順番の落とし穴を先に潰した

`_DB_SELECT` に `favorite` を入れると、**列が無い状態でサーバーだけ
先に配備されたときに `select` が落ち、記録が1件も出ない画面になる。**
SQL は人の手で流すので、順番は保証できない。

列が無ければ外して読み直すようにした。列を足したあとは
1回目で通るので、この道は使われなくなる。
`TestFavoriteColumnIsOptional` が両方の道を固定している。

**検証結果: OK**

- pytest 806件（新規4件）/ vitest 98件 / `expo export --platform web` 成功
- ブラウザで実際に動かして確認
  - チップ すべて / 2026年 / 2025年 / お気に入り
  - 「お気に入り」を押すと、そのチップだけ `#FBB03B` になり、
    一覧が付いている1件だけになる
  - ★ を押すと一覧から消え、「お気に入りはまだありません」に変わる
  - 検索欄が一覧より上にある

---

## 2026/08/13 — 「やったこと」を装飾できるようにする

**扱うのは3つだけ。** 太字・斜体・箇条書き。
見出しも表もリンクも画像も扱わない。保存は Markdown。

**「やったこと」だけ。** 残り3項目（よかった・困った・次）は素のテキスト。
短いメモの欄に道具立てを出すのは重すぎる。

### AI に記法を渡さない

ここが本題。`**強い**` をそのまま渡すと

- 記法が「その人の言葉」として扱われる
- 応答にも `**` が混ざる（AI憲法「Markdownを使わない」に反する）
- 頻出語に `**曲**` のような語が出る

`modules/markdown.py` の `strip_markdown()` を足し、
**`modules/ai.py` が記録を読む口を `_plain()` の1つにまとめた。**
10か所の直接読み取りを置き換えている。

**人が守れないので機械に見張らせる。**
`tests/test_markdown.py::TestNoRawFieldReadsInAi` が
`log.get("created", "")` のような素の読み取りを弾く。
プロンプトを足すたびに書きたくなる形なので、1か所でも通ると
そこだけ記法が混ざる。

### 外部の Markdown 部品を入れなかった

- 出せるのが3つだけなので、要る処理が小さい
- 見出しや引用が「書けてしまう」と、画面と保存の形がずれる
- 依存を足すと、ネイティブの指紋が変わるかを毎回確かめることになる

解釈は `client/lib/markdown.js` に置き、描画から離して vitest で検査した。
**「文字を落とさない」ことも検査に入れた** — 装飾の解釈に失敗しても、
書いた文字は全部出す。

### 見せ方

| 場所 | 扱い |
|---|---|
| 一覧の抜粋 | **記法を外す。** 2行しか出ないので太字にしても区別が付かない |
| 記録の詳細 | 装飾つき（`RichText`） |
| 過去との対話 | 同上 |
| 入力欄 | Markdown のまま。書いたものが見える |

太字は `font-strong`（Noto Sans JP Bold）に差し替える。
**`font-bold` を使わない。** 1ウェイトしか読んでいないので、
`fontWeight` を重ねると Android で端末の既定に落ちる。

**文字数を出さない。** デザイン案には「0 words」があるが、
書きながら量を数えさせない。

### 途中で壊して直したもの

正規表現でまとめて置換したとき、`, '')` を落とす処理が
**無関係な4か所の既定値まで消した**（`v.get('title', '')` → `v.get('title')`）。
`None` が文字列に混ざるところだった。差分を読んで戻している。
**一括置換は、差分を1行ずつ見るまで終わっていない。**

**検証結果: OK（ただし画面は見ていない）**

- pytest 833件パス（新規27件）/ vitest 120件パス（新規22件）
- `expo export --platform web` 成功

**未確認**: **画面での見え方。** 装飾ボタンを押したときのカーソル位置、
太字の見え方、箇条書きの行頭。ブラウザでの確認を行っていない。

## 2026/08/13 — パスワードの再設定と、設定の行

### 忘れたら詰む状態だった

`/forgot`（送る）と `/reset`（決める）を足した。
実装は `client/app/forgot.jsx` / `client/app/reset.jsx` /
`client/lib/resetLink.js`。

**戻り先は Web に固定した。** アプリへ戻すにはディープリンクが要るが、
メールのリンクを踏むのは端末のブラウザで、そこからアプリへ渡す経路は
端末の設定に左右される。開かなかったとき、利用者には
**何も起きないように見える。** Web なら必ず開く。1手増えるが確実に着く。
そのぶん「ブラウザで開きます。決めたらアプリに戻ってログインしてください」を
送信後の画面に先に書いた。

**登録済みかどうかを言わない。** 「登録されていません」と返すと、
どのアドレスが登録済みかを外から数えられる。送った体で同じ画面を出す。

宛先を出す・再送を置くのは新規登録と同じ（`signup.jsx`）。

### 認証ガードが再設定を追い出すところだった

`client/app/_layout.jsx` は「セッションがあるのに login/signup にいる」を
弾いていた。再設定のリンクは一時的なセッションを作るので、
`/reset` を同じ扱いにすると**パスワードを変える前に画面が消える。**

集合を2つに分けた。

- `AUTH_SCREENS` = login / signup / forgot / reset（未ログインでも入れる）
- `SIGNED_IN_LEAVES` = login / signup（ログイン済みなら出す）

### 設定の行

`client/app/(tabs)/settings.jsx`。**アイコン → ラベル → 操作**の1行にし、
右のボタンを `RowButton`（輪郭だけ）に揃えた。区画は `bg-surface-low`。

**シェブロン（›）は付けていない。** デザイン案には有るが、
ここの行は「次の画面へ行く」ものではなく、その場で効く操作。
付けると押したら画面が変わると読める。

最後の行には区切り線を引かない（カードの縁と二重になる）。

**検証結果: OK（ただし画面は見ていない）**

- pytest 837件パス / vitest 120件パス
- `expo export --platform web` 成功

**未確認**: 実際にメールを受け取ってパスワードを変えるまでの通し。
Supabase のメールテンプレートの戻り先設定（Redirect URLs に
`/reset` を許可する必要がある）は作者の操作。

---

## 2026/08/13 — 宿題3つ（通知・時間帯の挨拶・羊皮紙）

デザイン案と実装が食い違ったまま残っていた3つを片付けた。
**2つ入れて、1つは入れないと決めた。**

### 時間帯の挨拶 — 入れた

`client/lib/greeting.js`。おはようございます / こんにちは / こんばんは の3つ。

前日に「入れない」と決めていた。理由は
「時間帯で言葉を変えると、評価や勧誘に寄りやすい」。

**その懸念は材料を時計だけに限れば起きない。**
危ないのは時間帯そのものではなく、「夜遅くまでお疲れさま」のように
**時刻から相手の状態を推し量る**ことだった。
だから分岐は3つしか持たず、深夜にも専用の言葉を置かない。
23時も4時も「こんばんは」でよい。「まだ起きているんですね」は
観察ではなく詮索になる。

**Home の見出しにした。** 他のタブには見出しがあり、Home だけ無かった。
今日の灯りの上に小さなラベルをもう1つ足すのではなく、
空いていた場所を埋めている。

検査は `greeting.test.js`。**引数が1つであることも検査に入れた** —
記録の有無や経過日数を受け取れるようになったら落ちる。

### 通知 — 入れた

`client/lib/notifyText.js`（文面と時刻・純粋な計算）と
`client/lib/notify.js` / `notify.web.js`（端末の API）。
設定に「通知」の節を足した。

CLAUDE.md「習慣化の定義」は通知を**催促ではなく静かなきっかけ**と
定めていた。定めてあったが、実装は無かった。

守るために形の方で縛った。

- **既定は「切」。** 黙って鳴らさない
- **「入」にしようとしたときにだけ許可を求める。**
  起動直後に求めると、何のための通知か分からないまま拒否される
- **文面が日数も件数も持たない。** 記録の中身も見ない。
  どの日に出しても同じ意味になる言葉しか置いていない。
  `notifyText.test.js` が禁止ワードと**数字**を弾く
- **毎日くり返す予約にしない。** くり返しにすると「今日はもう書いた」日を
  飛ばせない。1回きりの予約を7日ぶん並べ、Home を開くたびに作り直す。
  書いた人に「残してみませんか」が届くのは、見ていないのと同じ
- **サーバーは関与しない。** プッシュトークンを取らないので、
  誰がいつ開いたかがサーバーに残らない
- **断った人を追いかけない。** 許可が無いときに端末の設定を開く導線は置かない
- **分を選ばせない。** 21:37 に意味は無く、決めることを増やすだけ
- Web では扱わない。ブラウザの通知はタブを閉じると届かない。
  **届いたり届かなかったりする通知は、無い方がよい**

### 羊皮紙のような質感 — 入れないと決めた

デザイン案（Stitch）は羊皮紙のような地を見せている。
`DESIGN.md` の地は `#F9F9FB`（わずかに青い白）で、`paper-white` も
`#FFFFFF`。**2つの案が食い違っている。**

CLAUDE.md は既に「3つがずれたら `DESIGN.md` が正」と決めてある。
決め直す理由が無いので、そのまま従った。
実機を見た作者の指摘は「AI感」と「カラーの統一感」で、
**地が冷たいという指摘は出ていない。**

温かさは地の色ではなく灯りの琥珀が担う。
`REQUIREMENTS.md`「やらないこと」に移し、宙に浮いた論点から外した。

### 指紋が変わった

`expo-notifications` はネイティブを持つ。

    4ff774b0…（ビルド #6 / #7）→ 89b3a77c…

**この先の OTA は #6 / #7 に届かない。** 通知を実機で動かすには
ビルド #8 が要る。

そのため**コミットを2つに分けた。** 挨拶（`a81f35f`）は指紋を変えない。
通知のコミットだけを戻せば、OTA の配信能力は元に戻る。

**検証結果: OK（ただし画面は見ていない）**

- pytest 837件 / vitest 141件（新規21件）
- `expo export --platform web` 成功
- 配信物を検査した
  - 挨拶3種がバンドルに入っている
  - `expo-notifications` / `scheduleNotificationAsync` が
    **Web バンドルに1つも入っていない**（`notify.web.js` が選ばれている）
- `eas fingerprint:compare` で指紋の変化を確認

**未確認**: 実機で通知が鳴ること。ビルド #8 まで確かめられない。
画面での見え方（挨拶の位置・通知の節）も見ていない。

---

## 2026/08/13 — iOSビルド #9（通知を載せる）

通知はネイティブの追加なので、OTA では実機に出ない。作り直した。

ついでに **`expo install --fix` でパッチ版8件を上げた**（`expo-doctor` 20/20）。
版を上げると指紋が変わるが、`expo-notifications` を入れた時点で
どのみち変わっていたので、**同じビルドにまとめた。**

### 1回目（#8）は落ちた

    Provisioning profile ... doesn't include the Push Notifications capability
    Provisioning profile ... doesn't include the aps-environment entitlement

`expo-notifications` を入れると iOS の権利に `aps-environment` が
自動で足される。既存のプロファイルにその capability が無かった。

**プロファイルに足すのではなく、権利の方を外した**
（`client/plugins/withoutPushEntitlement.js`）。

Lantern が使うのは端末の中だけで完結する予約で、プッシュは使わない。
**プッシュトークンを取らないのは、誰がいつ開いたかをサーバーに
残さないための設計上の選択**であって、あとから変える予定も無い。

使わない機能を「できることにして」おくと、審査で用途を説明する対象が増え、
あとから「プッシュも使えるのでは」と設計が揺れる。
権利が無くてもローカル通知は動く。プッシュだけが動かない。
**それがこのアプリの意図した状態。**

`expo config --type introspect` で `entitlements: {}` になったこと、
`UIBackgroundModes` に `remote-notification` が無いことを確かめてから投げ直した。

### 途中で踏んだもの

`expo export` が `EINVAL readlink` で落ちた。OneDrive 配下の
`node_modules` で起きる既知のもので、`rm -rf node_modules .expo && npm ci`
で直る。**上げ方の問題ではないので、版は戻していない。**

**検証結果: OK**

- pytest 837件 / vitest 141件 / `expo export --platform web` 成功
- ビルド #9 finished（commit `f402fb6`・版数 1.0.0・ビルド番号 9）

**未確認**: 実機での通知の発火。TestFlight に上げてからでないと確かめられない。

---

## 2026/08/14 — デザイン案6枚に沿って6セクションを直す

作者が `Lantern_design/` に画面ごとの案（`code.html` と `screen.png`）を置き、
セクションごとの指摘をまとめた。

### ログイン（`0_login`）

しるし → 名前 → 一文 → カード → ボタン → 登録への入口。
入力欄は**枠ではなく下線**にした（`components/AuthField.jsx`）。
カードの中に枠付きの欄を置くと**箱の中に箱**になる。

しるしは SVG で描いた（`components/LanternMark.jsx`）。**絵文字は使わない。**

**新規登録が「まだ迷う」件。**
画面は 2026-08-08 に分けてあったのに迷うと言われた。
原因は、**分けた2枚が同じ形をしていた**こと。
どちらも中央に大きな Lantern があり、下に同じ欄が2つ並び、
変わるのは見出しとボタンの文字だけだった。
**文字を読み比べないと、どちらの画面か分からない。**

だから形の方を変えた。

1. 中央寄せの大きなロゴを置かない。**左寄せの見出し**にする
2. 上に「← ログイン」を置く。**来た道が見えている**
3. **これから何が起きるかを3段で先に書く。**
   確認メールが届くことを、送ってから知らせない

ログイン側の入口も変えた。「はじめての方はこちら」は、
押せる場所なのか説明なのかが読み取れなかった。
問いかけと操作を1行にし、操作の側だけを濃く・太く・下線にした。

### ホーム（`1_home`）

**「今週の発見」を「書く」から移した。** 観察は書く前ではなく、
眺める場所にある方が読まれる。今日の灯りの下に置いた。

**並べる記録を日替わりの抜粋にした**（`lib/sample.js`）。
新しい順に12件だと「記録」タブと同じものが並び、2つある意味が無かった。

**その日のうちは同じ顔ぶれ。** 開き直すたびに変わると、
さっき見た記録が消えたように見えて、読む手より探す手が先に動く。
問いの資産で「同じ日は同じ問いを出す」と決めたのと同じ考え方。

**いちばん新しい記録は必ず入れる。** 書いた直後に開いて自分の記録が
無いと、保存できていないように見える。並びは日付の新しい順のまま。
**選び方が偶然でも、並びは偶然にしない。**

### 記録（`2_journal`）

- **月を選べるようにした**（`components/MonthPicker.jsx`）。
  全部の月を縦に並べていたので、記録が増えるほど
  「延々と続くもの」になっていた。**記録がある月だけ出す。**
  件数は出さない（月ごとの多寡を比べる表になる）
- **カレンダーから日を選んだときのモーダルを `RecordForm` にした。**
  それまでは4欄を並べた別物で、「もっと詳しく書く」の畳みも
  装飾のボタンも無かった。**同じことを2か所で書いていたので、
  片方だけ古くなっていた。**
- **「今月の灯り ◯日」を外した。** 日数は「分析」にある
- **「キーワード」を「頻出キーワード」に改名し、期間の選択をやめた。**
  1ヶ月・3ヶ月・半年を並べると**見比べる画面**になる。
  「1ヶ月では出ていた語が半年では無い」は変化の観察に見えて、
  実際には母数の違いでしかない。3ヶ月ひとつに固定した。
  取得ボタンもやめた。抽出は機械的な頻度処理でAIを呼んでいないのに、
  「Lanternに聞く」はAIに尋ねているように読めた

### 書く（`3_write`）

**記録とアイデアの棲み分け。** 実機で「どっちを書いているか迷う」と
言われた。原因は2つ。

1. 下線タブが**「記録」タブの中のタブと同じ形**をしていた
2. **どちらが何なのかがどこにも書いていない**

左右2つの区画（segmented）に変え、選んでいる側に説明を1行付けた。
説明は選択で入れ替わるので、**いま何を書いているかが画面の言葉として残る。**

主欄は枠を外して 19px の本文にし、装飾のボタンを欄の下へ移した。
書くところが「入力欄」ではなく紙に見えるようにする。

**タイトル欄は足さない。** 案には "Title..." があるが、
2026-08-12 に「記録にタイトルを持たせない、日付が見出しを兼ねる」と
決めている。名前を付けることで手が止まる。

### 分析（`4_insight`）

**年間マップを廃止した**（`YearMap.jsx` と `lib/yearMap.js` を削除）。
カレンダーは「記録」タブに1つあれば足りる。2か所に置くと片方だけ直る。
案もタイルだけで格子を持たない。

タイルは案に合わせて中央寄せの大きな数字にした。

**「総単語数 +12%」は入れない。** 書いた量を成果として測ることになり、
増減率は評価そのもの（`REQUIREMENTS.md`「やらないこと」）。

### 設定（`5_settings`）

行ごとの説明文と右端のボタンをやめ、**入り切りは switch** にした。
区画は アカウント / 一般 / データ / Lanternについて の4つ。

- **プライバシーポリシーを足した**（`lib/openPrivacy.js`）。
  アプリの中にページを作らず、公開済みのURLを開く。
  **同じ文書が2か所にあると、App Store Connect に出したURLと中身がずれる**
- アカウントの削除は元からある。案には無いが
  App Store 5.1.1(v) の必須要件なので残した
- 案の Security・Cloud Sync・Help Center は**実装が無いので置かない。**
  押しても何も起きない行は、無い方がよい

### 同梱の `DESIGN.md` は取り込んでいない

`4_insight/` に入っていた `DESIGN.md` は "Luminous Minimalist" という
別のテーマで、地が青みがかった白（`#f8f9ff`）、二次色が青灰色になっている。
**リポジトリの `DESIGN.md`（琥珀と紙色）とは別物。**

色の指示はこの回の指摘に含まれていないため、**触っていない。**
入れ替えるなら画面全体の配色が変わるので、指示として受け取ってから行う。

**検証結果: OK**

- pytest 841件 / vitest 140件 / `expo export --platform web` 成功
- 年間マップの削除に伴い vitest は 150 → 140 件（`yearMap.test.js` 10件が消えた）

**未確認**: ログインより内側の画面。ログインしないと見えないため。

## 2026/08/14 — 実機レビュー6件（通知の時刻・ホームの中身・装飾ボタン）

### 装飾ボタンが効いていなかった

本題。**2026-08-13 に入れてから一度も動いていなかった。**

`RecordForm` の `Field` は、記号を入れたあとのカーソル位置を state に
書いていたが、**`TextInput` に `selection` を渡していなかった。**
文字は入っていたが、カーソルは末尾へ飛ぶ。
何も選ばずに B を押すと「末尾に `**` が2つ」だけが起き、
**押しても何も起きないように見えた。**

`selection` を常に渡すと、今度は指でカーソルを動かせなくなる。
**渡すのは1回だけにして、次の選択変更で下ろす**（`pending`）。
押すと焦点が外れるので `focus()` で戻す。戻さないとキーボードが閉じる。

**キーボードを下ろせなかった件。**
本文の欄は改行を受け付けるので、キーボードの「完了」が改行になる。
下ろす手段が画面のどこにも無かった。装飾ボタンの右に「閉じる」を置き、
スクロールでも下りるようにした（`keyboardDismissMode="on-drag"`）。

### 通知の時刻

8/12/18/21/23 の5つを横に並べていた。丸が並ぶので**ラジオボタンに見え**、
しかも**自分の時間に合う時刻が無い**人がいる。早朝に書く人も、明け方に書く人もいる。
決め打ちの5つは、こちらの想定を押しつけていた。

`components/HourPicker.jsx` を足し、**24時間から選ぶ**ようにした。
縦に24行並べると探すのが遠いので4列の格子にしてある。
**分は選ばせない**方針は変えていない。

これで「0時」が選べるようになり、`plannedTimes` の
「どの時刻でも同じ本数」という前提が崩れた。テストの方を直している
（0時30分に0時を選べば今日ぶんは過ぎている。実装は正しい）。

### ホームの記録

**結果だけを出す**（`components/HomeCard.jsx`）。
日付・やったこと・写真・Lanternの言葉。カードは大きく、3枚。

よかったこと・困ったこと・次にやることは出さない。
眺める場所に4項目を並べると、**読み返す画面ではなく点検する画面**になる。

一覧の行（`LogItem`）は押して開く形だが、ここは開く手数を挟まず全部見せる。
そのぶん枚数を絞った。

### 記録の月

**既定を当月にした。** 全部の月が最初から縦に並んでいた。

当月に記録が無いまま開くと、空の一覧に「2026年8月」とだけ出るので、
**選べない月を選んだ状態にしない。** その場合はいちばん新しい月に寄せる。
検索やチップを触ったときは「すべての月」に解く。検索は月をまたいで探すもの。

### モーダルの高さ

`max-h-96`（384px）だと、詳しく書く欄を開いた時点で中だけが小さく
スクロールし、下半分が余っていた。画面の高さの70%にした。
つまみも付けた（どこを掴めば閉じるかの目印）。

### 頻出キーワード

語に `#` を付け、**押すとその語で絞った一覧へ移る**。
頻出語を見ても、いつ書いたのかが分からないままだった。

行き先は「記録」タブの検索（`/journal?q=`）。**専用の画面を作らない。**
探した結果を見る場所が2つあると、片方だけ直る。
同じ画面への遷移なので、`q` を受けたら記録タブへ戻す処理を自分で書いている。

**`#` はタグではない。** この語で分類しているわけではなく、
押せることを示す印として付けている（記録にタグは持たせない）。

**検証結果: OK（ただしログインより内側は見ていない）**

- pytest 845件 / vitest 141件 / `expo export --platform web` 成功
- ブラウザで読み込みとコンソールを確認（JSエラーなし・401は未ログインのため）

**未確認**: **装飾ボタンの直りは実機でしか確かめられない。**
カーソルの挙動は Web と iOS で別物で、今回直したのは
`TextInput` の `selection` という**ネイティブ側の振る舞い**にあたる。

## 2026/08/14 — 実機レビュー（起動画面・3層の色・キーボード・ダイヤル）

### 起動画面が2回出ていた

OS の起動画面（`expo-splash-screen`）が消える → 読み込み中の丸が出る →
Lantern の起動画面が出る、という3段になっていた。
目には「スプラッシュ → 別のスプラッシュ」と映る。

**OS の起動画面をこちらで消すまで出したままにした**
（`preventAutoHideAsync` / `hideAsync`）。
判定が終わってから下ろすと、下から Lantern の起動画面が現れる。
間に何も挟まらないので1回に見える。読み込み中の丸も外した
（見えないうえ、消し忘れると「3枚目」として現れる）。

**記録するのを「閉じたとき」から「出すと決めたとき」に変えた。**
閉じる前に画面が作り直されると、もう一度最初から出てしまう。

ブラウザで確認した。1回目は起動画面（`14 AUG` ＋ Lantern ＋ 一文）が出て、
再読み込みでは出ない。**Lantern の綴りは出ている。**

### ホームの3層が見分けられなかった

同じ画面に3つの区画があるのに、**今日の灯りは線1本、
今週の発見と Lanternの言葉は同じ砂色**だった。

地の色を3つに分けた。

| | 地 | 何か |
|---|---|---|
| 今日の灯り | **琥珀（塗り）** | 今日の一文 |
| 今週の発見 | 灰 | **AIを使わない**機械的な観察 |
| Lanternの言葉 | 砂 | AIが書いたもの |

「1画面に灯り色を2箇所以上置かない」は守れている。
**この画面で琥珀に塗るのはここだけ。**

「すべての記録」の行き先を `/journal?tab=record` に固定した。
振り返りを開いたままだと、押しても一覧が出なかった。

### 「閉じる」の置き場所が間違っていた

欄の下に置いていたので、**キーボードが出た瞬間に隠れていた。**
キーボードを下ろすためのボタンが、キーボードに隠れて押せない。

iOS の入力補助ビュー（`InputAccessoryView`）に移した。
キーボードに貼り付いて上がってくる。装飾のボタンも一緒に載せた。
Android にこの仕組みは無いので、そちらは欄の下のままにしている。

### 書く欄をデザイン案に寄せた

暦 → 日付 → 時刻の行を先頭に置き、紙のような白い面にした。
時刻は、すでにある記録なら保存した時刻、無ければ今の時刻。

**タイトル欄と「0 words」は入れていない。**
タイトルは 2026-08-12 に「持たせない、日付が見出しを兼ねる」と決めており、
文字数は `REQUIREMENTS.md` の「やらないこと」にある。

### アイデア

- 欄を大きくした（複数行を受ける。1行だと、収まる長さかを先に考える）
- **「使った」「使いました」の字をやめ、丸いチェックにした**
  （iOS のリマインダーと同じ形）。1行のメモに対して字が多すぎた
- 行を畳んだ。削除は押して開いた行にだけ出す
- **使ったものを下へ落とす。** 混ざっていると、まだのものを目で拾い直す

**「完了」ではないという考え方は変えていない。**
チェックは済んだ印ではなく、使ったかどうかの印。だから消えないし件数も出さない。

### 「AIの観察」をやめた

**「Lanternが見つけたこと」にした。**
実機で「AIという単語に拒否反応があるかもしれない」と指摘された。
Lantern の AI は静かな伴走者であって、AIという肩書きを名乗る理由がない。
画面の他の場所（今日の灯り・今週の発見）も「AI」とは書いていない。

**位置も動画一覧の上へ上げた。** 下にあるとスクロールし切るまで気づけない。
ボタンの字も「Lanternに聞く」→「見てもらう」に変えた。

### 時刻をダイヤルにした

同じ日のうちに二度変えている。5つの決め打ち → 24時間の格子 → **hh:mm のダイヤル**。
どちらの中間も「用意された選択肢から選ぶ」形で、自分の時間を指定できなかった。

**端末の部品は使っていない。** `@react-native-community/datetimepicker` は
ネイティブを持つので、入れると指紋が変わり OTA が届かなくなる。
縦のスクロールに吸着させて JS だけで作った（`components/TimeDial.jsx`）。
分は5分刻み。

`minute` は保存の形に足したので、**古い設定には入っていない。**
無ければ 0 として読む（読み替えを忘れると `NaN` 時に予約される）。

### Journaling Suggestions を戻した

作者の指示で後回し。`git revert` で外し、**指紋が `d8a1c94e…` に戻った。**
これでビルド #9 へ OTA が届く。実装は履歴に残っているので、
再開するときは revert を revert すればよい。

**検証結果: OK（ただしログインより内側は見ていない）**

- pytest 845件 / vitest 143件 / `expo export --platform web` 成功
- ブラウザで起動画面の1回化を確認（再読み込みで出ない）

**未確認**: `InputAccessoryView` は iOS だけの部品で、**実機でしか出ない。**
ダイヤルの吸着も指で回すまで分からない。

## 2026/08/14 — 実機レビュー（ロゴ・暖色・カレンダー・入力欄の感度）

### Lantern を左上に置いた

`components/AppHeader.jsx`。5つのタブすべての上端に置いた。
名前が出るのはログイン画面と起動画面だけで、
**中に入るとどのアプリを開いているのか画面に書いていなかった。**

デザイン案（`3_write`）は中央に置いているが**左に寄せた。**
中央だと iOS の画面名の位置と重なり、
「この画面の名前が Lantern」だと読める。名前はアプリのもの。

### 今週の発見の色

砂 → 灰 → **生成り**（`discovery-surface` / `discovery-ink`）。同じ日に二度変えた。

砂は「Lanternの言葉」の色で、同じ画面に両方あるとどちらも AI が
書いたものに見えた。**ここは AI を使っていない。**
灰にしたら「暖色系に」と言われたので、砂より一段濃い生成りにした。
**輪郭も持たせている。塗りの濃さだけで見分けさせない。**

これで Home の3層は 琥珀（塗り）／生成り（塗り＋輪郭）／砂（塗り）になる。

### 記録

**月の既定が効いていなかった。** `useState(thisMonth())` で当月を入れたのに、
チップと検索を見ている `useEffect` が**初回にも走って**「すべての月」へ戻していた。
初回だけ飛ばすようにした。

**カレンダーのマスを 24px → 36px にした。** 字も 9px → 12px。

**「今日」を「今月」に変え、日付を選ばないようにした。**
押すと `onDateSelect(today)` まで走っていたので、
今日の記録がまだ無いと**記録モーダルが開いていた。**
「今月を見たい」と「今日を書きたい」は別の意図。

**一覧の区分けを強めた。** 白い地に白いカードで、段差が
`#F9F9FB` と `#FFFFFF` の差しか無く、どこからどこまでが1か月なのかが
見えていなかった。月の見出しに灯りの点と横線を添え、
カードに輪郭と影（`shadow-bloom`）を付けた。

**開く動きを滑らかにした。** `LayoutAnimation` で高さを補間し、
中身は薄く出す。山形は**回す**（字を差し替えない。差し替えると
開く動きと無関係に一瞬で変わる）。閉じるときは中身を先に消す。

### 入力欄の感度

主欄は画面の大半を占める。そこに素の `TextInput` を敷いていたので、
**スクロールのために指を置いただけで焦点が入り、キーボードが上がっていた。**

**書いていないときは入力欄を置かないことにした。**
読む面を置き、押されたときに入力欄へ差し替える。
指を滑らせただけでは開かない。

**副産物として、装飾が効いていることが目で分かるようになった。**
入力中は Markdown の記号がそのまま見えるが、離れると太字は太字として
描かれる（`RichText`）。

「ボールドが全く機能していない」件は、**記号は入っていたが
画面上は `**強い**` のままだった**ため、効いていないように見えていた
可能性が高い。離れたときに描き分かるようにして、そこを確かめられるようにした。

### 写真を道具の列へ

デザイン案は装飾ボタンの並びに画像とクリップを置いている。
写真の入口を `MarkdownToolbar` の中へ移した（`PhotoPicker` の `compact`）。
別の区画に置いていたので、装飾の道具と別物に見えていた。

**クリップ（任意のファイル添付）は付けない。** 扱えるのは写真だけで、
置き場所は端末の中と決めてある。押せるのに何も起きないボタンは、無い方がよい。

**検証結果: OK（ただしログインより内側は見ていない）**

- pytest 847件 / vitest 143件 / `expo export --platform web` 成功

**未確認**: 入力欄の感度・キーボード上の道具・開閉の滑らかさは、
**どれも実機でしか確かめられない。**

## 2026/08/14 — 実機レビュー（余白・ダイヤル・装飾・詳しく書く）

### ボトムバーが内容に被っていた

`lib/tabBar.js` の `useTabBarInset()` が**ネイティブで 0 を返していた。**
`NativeTabs` が内容の余白を入れる前提で書いていたが、入らない。
iOS 26 のタブバーは浮いたカプセルで、素の `ScrollView` の上に重なる。

タブバーの高さ ＋ ホームインジケータぶんを返すようにした。
**足りないより余る方がよい。** 下に空きができるだけで済むが、
足りないと最後の記録が読めない。

### 時刻のダイヤル

見える段を 3 → 5 にした。3段だと前後が1つずつしか見えず、
どこを回しているのか分からなかった。

### 装飾のボタンが消えていた

前回キーボードの上（`InputAccessoryView`）へ移した結果、
**キーボードが出ていない間はどこにも無くなっていた。**

書いていないときも欄の下に出すようにした。
押せばそのまま書き始まる（`applyMark` が編集に入る）。
書き始めると、この列は消えてキーボードの上へ移る。

### 当日のカレンダーでモーダルを出さない

今日については「書く」タブが本体で、そちらの方が広く、
装飾も写真も問いも揃っている。カレンダーから小さいモーダルを開くと、
**同じことをする場所が2つ**になる。

今日を押したら選ぶだけにして、
「今日の記録はまだありません。「書く」から残せます。」を出す。
**過去の日はモーダルのまま。**「書く」から遡れないため。

### 「もっと詳しく書く」をやめた

**作者の相談から。** 畳まれていると**何が書けるのかが分からない**まま、
開くかどうかを決めることになっていた。

項目ごとのチップ（＋よかったこと / ＋困ったこと / ＋次にやること）にした。
**名前が見えているので、開く前に分かる。** 押した欄だけが現れるので、
既定の姿は1段のまま。全部開けばチップの列は消える。

**欄そのものは消さない。** 実測で 次にやること 16.7% /
よかった 5.6% / 困った 5.6% と低いが、使われている。
消すと後から分け直せない（CLAUDE.md）。
すでに書いてある記録を開いたときは、中身のある欄が最初から開く。

**検証結果: OK（ただしログインより内側は見ていない）**

- pytest 847件 / vitest 143件 / `expo export --platform web` 成功

**未確認**: 余白の量・ダイヤルの見え方・装飾の列は実機でしか確かめられない。

## 2026/08/15 — Lantern のリッチテキストエディタ

### 書いている最中に装飾が見えるようにした

`components/RichEditor.jsx`。

`TextInput` は**中に `Text` を入れられる。** 入れた `Text` の書式が
そのまま入力欄の中で効く。そこへ断片を並べる。

**記号は消さない。薄くする**（不透明度 0.35）。
消すと入力欄の中身と画面の文字がずれ、打つたびにカーソルが飛ぶ。

そのために `lib/markdown.js` に `parseWithMarkers()` を足した。
`parseInline` は記号を捨てるが、こちらは捨てない。
**つなぎ直すと渡した文字列にそのまま戻る。**
この性質が崩れると入力そのものが壊れるので、
14通りの入力で往復を検査している（`markdown.test.js`）。

`value` は `TextInput` に渡さず、children だけで描く。
`react-native-controlled-mentions` など、同じ形の部品がとる作法に合わせた。
両方渡すと iOS と Android で挙動が割れる。

### WebView の editor を入れなかった

`react-native-pell-rich-editor` のような WebView 製なら記号を完全に隠せる。
ただし `react-native-webview` はネイティブを持つ。
**入れると指紋が変わり、配信済みのビルドへ OTA が届かなくなる。**
記号が薄く残るのは、その引き換えとして受け入れている。

保存の形は Markdown のまま。**画面の見せ方を変えただけ**で、
AI に渡す前に記法を剥がす経路（`modules/markdown.py`）も変えていない。

### アイデアの削除を「左に払う」に

`PanResponder` で作った。**依存を足していない。**
`react-native-gesture-handler` は直接の依存に入っていないので、
使うと package.json が変わり指紋が動く。

それまでは 行を押して開く → 削除 → 確認 の3手で、
**押して開く操作が「使った」と紛らわしかった。**
開閉そのものをやめ、行はチェックと文だけにしている。

浅く払っただけでは開かない（40px）。縦に滑らせたときは
一覧のスクロールに渡す（`|dx| > |dy| * 1.5`）。

### 直したもの

- **ボトムの余白が余りすぎていた。** タブバーの高さを 56 → 49（`UITabBar` の実寸）、
  画面下の余白を 40 → 8。前回は被りを消すために多めに取っていた
- **チップで開いた欄が畳めなかった。**
  中身があるまま畳むと**見えていない文が保存される**ので、畳むときは消す。
  押す前にそう書いてある（空なら「やめる」、書いてあれば「消して閉じる」）
- 一覧を開くときの文字を **120ms 待ってから**出す。
  高さが伸びるより先に文字が出て、動きと中身が別々に見えていた

**検証結果: OK（ただしログインより内側は見ていない）**

- pytest 849件 / vitest 149件（新規6件）/ `expo export --platform web` 成功

**未確認**: **エディタの中でカーソルが正しく動くかは実機でしか分からない。**
`TextInput` の children は iOS と Android で描き方が違う。
払って消す操作も、指でやるまで手応えが分からない。

## 2026/08/15 — 装飾の列をキーボードに貼り付ける

### `InputAccessoryView` は出ていなかった

2026-08-14 に「iOS のキーボードに載せた」と報告したが、**実機では出ていない。**
RN 0.86（New Architecture）ではこの部品の扱いが変わっており、当てにできない。
出ないので欄の下にも列を置き、結果として
**キーボードの上には何も無く、欄の下に余計な列がある**状態になっていた。

作り直した（`components/EditorToolbar.jsx`）。

- **キーボードの高さを測って自分で置く。**
  `keyboardWillShow` / `keyboardWillHide` で高さが分かる。
  そのぶん下から浮かせれば、キーボードの上に並ぶ
- **画面の一番外に置く**（`_layout.jsx`）。記録フォームの中だと
  `ScrollView` の子になり、一緒に流れてしまう
- 書いている欄が**自分を登録する**。列はそれを見て中身を編集する
- `Modal` は画面の一番外より上に出るので、
  記録モーダルの中にもう1つ置いている（`EditorToolbarBar`）

**欄の下の列は消した。** 作者の判断。

`MarkdownToolbar.jsx` は役目を終えたので削除した。

### 並べたもの

Apple の「メモ」に合わせて、太字・斜体・箇条書き・写真。
**文字ではなく図形のボタン**にした（`Svg`）。

写真は `PhotoPicker` が持っている手続きを預かって呼ぶ。
権限の確認も圧縮も向こうにあるので、二重に書かない。

### 払う操作が縦スクロールに負けていた

`onMoveShouldSetPanResponder` は**親が先に手を挙げたあとに呼ばれる。**
一覧の `ScrollView` に先を越されていた。
`onMoveShouldSetPanResponderCapture` に変えた。こちらは親より先に判定される。

横が縦の2倍を超えているときだけ奪う。少しでも斜めなら渡す
（一覧のスクロールの方が使う回数が多い）。開く深さは 40 → 32px。

### 決めたこと（作者の判断）

- **エディタは今の形のまま実機で見る。** Tiptap / Lexical / ProseMirror は
  どれも WebView 上で動き、`react-native-webview` はネイティブを持つ。
  入れると**ビルド #10 が要り、それまで OTA が #9 に届かない。**
  記号（`**`）が薄く残るのが唯一の違いなので、まず今の形を見る
- **ファイル追加は端末の中だけに置く。** 写真と同じ扱い。
  `expo-document-picker` がネイティブを持つため、**ビルド #10 と同時に入れる。**
  今回入れると、上の「実機で見る」ための OTA が届かなくなる

**検証結果: OK（ただしログインより内側は見ていない）**

- pytest 849件 / vitest 149件 / `expo export --platform web` 成功

**未確認**: **キーボードの上に列が出るかは実機でしか分からない。**
前回それを見誤って「載せた」と報告している。今度は出ない場合、
`keyboardWillShow` が来ていないか、`bottom` の基準がずれている。

## 2026/08/15 — `****` をやめ、未確定の波線を戻す

キーボードの上の装飾の列は実機で出た（作者確認）。そのうえでの指摘。

### `****` が現れていた

何も選ばずに太字を押すと、記号だけが2組置かれていた。

**カーソルのある語を囲むようにした**（`wrapSelection`）。
日本語には空白が無いので、空白・改行・約物で語を切る。
完全な語の判定は要らない。**囲む範囲の見当が付けばよい。**

前後とも切れ目のとき（空行・空白の上）だけ、記号を置いて間に戻る。
「打ち終えて押す」がいちばん多い形なので、
**カーソルが語のすぐ右にあるときもその語を囲む**（検査で固定）。

Apple の「メモ」は押した時点から先を太字にするが、
こちらは記法を本文に持つので、いま書いている語を対象にする。

### 未確定の波線が出なくなっていた

**断片を入れ替えると、iOS は欄の中の文字を置き直す。**
未確定という状態はそこで失われる。波線は OS が描くものなので、
状態が消えれば線も消える。**装飾を欄の中で見せた代償だった。**

打っているあいだは素の文字のままにして、手が止まって 450ms 経ってから
断片に組み直すようにした。変換中は OS に任せ、確定して一息ついたところで
太字が現れる。

### そのほか

- パネルを畳むボタンを「やめる」→**「閉じる」**
- アイデアの一覧を**白いカード**にし、輪郭と影を付けた
- 払う操作の判定を緩めた（横が縦の 2倍 → 1.2倍、しきい値 6px → 4px）。
  わずかに斜めなだけで一覧のスクロールに取られていた
- **アカウントのアドレスを押すまで出さない。** 設定を開くたびに
  自分のアドレスが並ぶのは、画面を人に見せるときに困る
- **アカウントの印**（`AccountMark`）。顔写真は持たない代わりに、
  アドレスから決まる色と頭文字を出す。同じアドレスなら必ず同じ印になるので、
  アドレスを隠していても取り違えに気づける。色は琥珀の周りの3色だけ

### 通知の既定

**もともと「切」**（`lib/notify.js` の `loadSetting` が、保存が無ければ
`enabled: false` を返す）。変更は不要だった。

### まだ残っていること

`**` の記号そのものは、まだ薄く見えている。
**完全に隠すには WebView のエディタが要る**（Tiptap / Lexical など）。
`react-native-webview` はネイティブを持つので**ビルド #10 が要る。**
ファイル追加（端末の中だけ・`expo-document-picker`）も同じビルドで入る。

**検証結果: OK（ただしログインより内側は見ていない）**

- pytest 851件 / vitest 162件（新規13件）/ `expo export --platform web` 成功

**未確認**: **波線が戻るかは実機でしか分からない。**
断片の組み直しを止めれば戻る、という見立てで直している。
戻らない場合は、組み直し以外の理由で未確定の状態が落ちている。

---

## 進行中

- React Native移行 フェーズA7（配布）。Apple Developer Program 加入済み。
  コード側の準備は完了。残りは EAS ビルドとストア登録で、要ユーザー操作。

---

## 次にやること

`REVIEW_v2.0.md` の優先順位に従う。

- [ ] **問いとアイデアをしばらく使う**（最優先）。
      2026/08/06 に入れたばかりで、まだ一度も日常で使われていない。
      新しい入口をさらに足す前に、これらが効くかを見る
- [ ] TikTok連携は上記の結果を見てから判断する
- [ ] North Star Metric（継続日数）の計測。**一度も計測されていない**

かつてここに v0.5 として目標設定機能（ビジョン・月次・週次）を並べていたが、
v2.0 到達後の実態と噛み合わなくなったため外した。
再度検討する場合は「記録しやすさの4段」のどこに効くかから始める。

---

## 課題・メモ

- Renderの無料枠はスリープがあるため、有料プランへの移行タイミングを検討
- アプリ名は「Lantern」に決定済み（全ファイル統一完了）
- 実ユーザーは作者1人、記録18件。成功指標はまだ検証されていない

---

## 学び

- `.gitignore` はコミット前に必ず作成する
- Renderのデプロイは `host="0.0.0.0"` が必要
- フォルダ構造はリポジトリのルートに直接ファイルを置く
- `.env` と `data/` は `.gitignore` で除外する
- Claude CodeのCLAUDE.mdを活用すると役割指定で開発できる
- ストリーク計算は「今日または昨日」を起点にすることで未記録の日でも継続扱いにならない
- システムプロンプトのNGパターンは「言ってはいけないこと」として具体的な文例を入れると守られやすい
- Jinja2テンプレートでサーバーサイドデータ（streak, recent_activity）を使うと、JSでの計算を減らしシンプルになる
  （v2.0 で Flask はAPI専用になり、テンプレートは廃止した。当時の学びとして残す）
- 機能の要否は推測ではなく実データで測る。「4項目のうち3つは 5〜15% しか使われていない」は
  数えるまで分からなかった
- 使用率が低い＝失敗、ではない。写真は 1/20 件だが「書けない日の受け皿」であり、
  使われない日のための機能を使用率で測ると判断を誤る
- 実態に合わないUIは、削るより畳む。消すと後から分け直せない
