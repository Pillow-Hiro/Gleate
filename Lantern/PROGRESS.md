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
- [x] Supabase Auth 導入（メールOTP認証）
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

**設計判断（変更なし）**
- [−] 「過去との対話」空状態メッセージ：検討の結果、現状維持で決定
- [−] マルチモーダル記録（写真・動画・作品・音楽）：個人開発のコスト制約を踏まえ一旦保留。設計書（DESIGN_multimodal_v1.3.md）は残す。代替案（画像圧縮・Cloudflare R2）を検討済み。テキストのみでの運用実績を見てから再検討。

**ドキュメント**
- [x] REVIEW_v1.2.md 作成（哲学・AI憲法・UI/UX・機能一貫性の4観点レビュー）
- [x] DESIGN_multimodal_v1.3.md 作成（マルチモーダル記録設計書・保留中）

---

## 進行中

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
