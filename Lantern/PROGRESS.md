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
