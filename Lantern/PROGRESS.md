# PROGRESS.md — 開発進捗記録

## 現在のバージョン：v1.2

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

## 進行中

- React Native移行 フェーズA。A1〜A6と A7前半が完了。
  残りは配布まわり（アカウント登録・EASビルド・Vercel切り替え）で、いずれも要ユーザー操作。

---

## 次のマイルストーン：v0.5

- [ ] 大きな目標（ビジョン）設定機能
- [ ] 月次目標設定機能
- [ ] 週次目標設定機能
- [ ] 毎日の記録と目標の紐づけフィードバック
- [ ] 週次レビュー自動生成
- [ ] 月次レビュー自動生成
- [ ] 活動傾向分析

---

## 課題・メモ

- データ保存がJSONファイルのため、ユーザーが増えた場合はDBへの移行が必要
- Renderの無料枠はスリープがあるため、有料プランへの移行タイミングを検討
- アプリ名は「Lantern」に決定済み（全ファイル統一完了）

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
