# セッション引き継ぎ資料

作成日: 2026-07-28
対象: このセッションを引き継ぐ新規セッション
前提: `main` ブランチが正。作業は `C:\Users\tinot\OneDrive\ドキュメント\apps\Lantern` で行う

---

## 0. リポジトリ構成（最初に理解すべきこと）

```
リポジトリルート : C:\Users\tinot\OneDrive\ドキュメント\apps    ← .git はここ
プロジェクト実体 : apps\Lantern\                               ← 追跡ファイルは全てこの配下
```

`git ls-files` は cwd 相対でパスを表示するため、`apps\Lantern` で実行すると
ルート直下にファイルがあるように見える。実際のリポジトリルートは `apps`。
この読み違いを一度やったので注意。

`.claude/worktrees/` 配下に古いworktreeが2つ残っている（gitignore済み）。
`lantern-app-development-a102b1` と `sad-hawking-5afb30`。不要なら削除してよい。

---

## 1. このセッションで完了したこと

### v1.2 品質固め

| 内容 | コミット |
|---|---|
| 今日の灯りのAI生成を再開＋Supabase `daily_quotes` で日次キャッシュ | `f0d61f7` |
| 日付・streakロジックを `frontend/src/lib/date.js` に共通化（6ファイルの重複を解消） | `f0d61f7` |

### React Native移行（CLAUDE.md フェーズA）— A1〜A6完了

| フェーズ | 内容 | コミット |
|---|---|---|
| A1 | Expo土台（SDK 57 / Expo Router / NativeWind v4）・認証・5タブ | `25b53a3` |
| A2 | Home（今日の灯り・記録フォーム・節目バナー・今週の発見） | `c995cbd` |
| A3 | Journal（カレンダー・一覧・詳細・検索・振り返り・記録モーダル） | `28520f4` |
| A4 | Insights（記録密度・過去比較・キーワード） | `d6990d0` |
| A5 | Settings・SplashScreen・テーマ管理 | `8e56225` |
| A6 | Dashboard・YouTube OAuthのディープリンク対応 | `7792eac` |
| A7前半 | `eas.json`・`mobile/README.md`・Expo Web本番ビルド検証 | `8735448` |
| — | EASプロジェクト作成（projectId を app.json に追加） | `f41584a` |

### その他

- `/api/debug/version` のコミット文字列ハードコードを修正（`c19e14b`）
- CLAUDE.md・PROGRESS.md・PROJECT_MAP.md の「メールOTP認証」誤記を修正（`28520f4`）
- PROJECT_MAP.md の行番号を最新化・git管理下に追加（`2181c49`）

---

## 2. 現在の状態

- `main` = `origin/main`、作業ツリーはクリーン
- Renderは最新コードが稼働中（CORS・AI灯り・OAuth分岐すべて反映済み）
- EAS: `pillow_hiro` アカウント、projectId `04815106-2180-4a87-b6e7-a17eb558d470`
- EAS環境変数: production / preview / development の3環境に登録済み
  （`EXPO_PUBLIC_` の3変数のみ。秘密鍵の混入がないことを検証済み）

---

## 3. 次にやること（優先度順）

### 最優先：セキュリティ

**`/api/youtube/channel-test`（main.py 787行付近）を削除する。**
`@require_auth` がなく、実ユーザーID `5efc736a-e32c-4904-af2e-98a6b9768032` が
ハードコードされている。本番で誰でも叩け、保存済みOAuthトークンを使って
ユーザーのYouTubeチャンネル情報を返す。コード内に「デバッグ用・後で削除」とある。

```bash
curl https://creator-companion.onrender.com/api/youtube/channel-test
```

### 高：不要コードの整理

- debug/testルート10個の整理（うち認証なし6個）。残すなら全てに `@require_auth`
- 死んだ `goals` / `vision` ルート5個の削除
  （`/goals/save` `/goals/suggest` `/goals/interview` `/api/vision` GET/POST）
  参照先の `goals` テーブルは本番Supabaseに存在せず、例外を握り潰して静かに失敗している

### 中：テスト

プロジェクト全体（約7,600行）にテストが1つもない。
まず純粋関数から: `calcStreak` / `monthsAgoStr` / `parse_state` / `build_state`

### 残り：A7（配布）

- [ ] `eas build --profile preview --platform android`（初回は署名キーストア生成の対話が入る可能性）
- [ ] **実機でのYouTube連携往復の確認**（`lantern://` はブラウザで復帰しないため唯一の未検証機能）
- [ ] Apple Developer Program（$99/年）・Google Play Console（$25）
- [ ] Vercelの配信元を `frontend/` から Expo Web出力へ切り替え
- [ ] 切り替え後に `frontend/` を廃止し `lib/date.js` `lib/supabase.js` の重複を解消

---

## 4. 実装上の重要な判断（引き継ぎ時に壊さないこと）

### 今日の灯り：離脱期間への言及を「構造で」防いでいる

`get_daily_quote(yesterday_log)` は**前日のログしか受け取らない**。
AI憲法が禁じる「〇日ぶりですね」を、プロンプトの指示ではなく
入力データの構造で不可能にしている。ここに `recent_logs` を戻してはいけない。

前日に記録がない日はAIを呼ばず `LANTERN_MESSAGES` から返す（APIコストもゼロ）。

`call_claude()` はタイムアウト時に「AIの応答に時間がかかっています…」という
ユーザー向け文言を返すため、それが灯りとして表示されないようガードしている。

### YouTube OAuth：Google Cloud Console の設定を変えずにアプリ対応した

GoogleへのリダイレクトURIはFlaskの `/api/youtube/callback` のまま。
`state` を `user_id|platform` 形式にし、コールバックが platform を見て
Web（Vercel）とアプリ（`lantern://dashboard`）を出し分ける。
platform を含まない旧形式の state は web 扱いなので、既存Webフロントは無改修。

### exportLogs はプラットフォーム別ファイルに分けている

`expo-file-system` はWeb向けに解決できないモジュールを参照しており、
Expo Webのバンドルが失敗する。`lib/exportLogs.js`（ネイティブ）と
`lib/exportLogs.web.js`（Web）に分け、Metroのプラットフォーム別解決で切り替える。
統合してはいけない。

### SplashScreen の暗幕には `pointerEvents="none"` が必須

付け忘れると暗幕がタップを奪い、画面を閉じられなくなる。

---

## 5. 検証手順のメモ（同じ落とし穴を踏まないために）

### バンドル内容の検証

`expo export` の本番バンドルは非ASCIIを `\uXXXX` にエスケープする。
文字列で grep しても一致しないため、復元してから照合すること。
また Git Bash の `grep` は一部の日本語（「灯」など）で誤判定する。Pythonを使う。

```python
decoded = re.compile(r'\\u([0-9a-fA-F]{4})').sub(lambda m: chr(int(m.group(1), 16)), s)
```

### 開発サーバーの増分ビルドは信用しない

`--clear` なしだと古い変換結果が残り、「モジュールがバンドルに入っていない」
という誤った結論に至る。確実な検証は `npx expo export --platform web --clear`。

### 稼働バージョンの判定

`/api/debug/version` は以前コミットをハードコードしていた（`c19e14b` で修正済み）。
確実なのは機能で判定すること。例: CORS の許可originを見る。

```bash
curl -D - -o /dev/null -H "Origin: http://localhost:8081" \
  https://creator-companion.onrender.com/api/debug/version | grep -i access-control
```

### Renderはコールドスタートに40〜50秒かかる

無料枠のため、タイムアウトを短くすると「接続失敗」と誤判定する。90秒以上待つこと。

### 秘密情報の扱い

**リポジトリルートの `.env` には `ANTHROPIC_API_KEY`・`SUPABASE_KEY`（service_role）・
`YOUTUBE_CLIENT_SECRET` が入っている。** `mobile/.env` とは別物。
`eas env:push --path .env` を打つときは必ず `cd mobile` してから。
ルートで打つと全部EASに平文で載る。

---

## 6. アプリレビューの結論（2026-07-28）

総合 **6.5 / 10**

| 観点 | 点数 |
|---|---|
| 思想の一貫性 | 9.0 |
| AI憲法の実装 | 8.5 |
| UI/UX | 7.0 |
| コード品質 | 4.5 |
| 機能の完成度 | 6.5 |
| 保守性 | 5.0 |

**良い点**: 禁止ワードのユーザー向け文言への混入はゼロ。思想をプロンプトではなく
構造で守っている設計（前述）。API分離のおかげでRN移行がUI層だけで済んだ。

**悪い点**: テストゼロ。例外の握り潰し15箇所。死んだコードと本番デバッグ経路。
`frontend`（2,845行）と `mobile`（2,611行）の二重保守。ドキュメントの実態乖離。

**未解決の論点**: Dashboard（YouTube分析）の位置づけ。CLAUDE.md「MVPで作らないもの」は
「SNS分析」「フォロワー分析」を明確に禁じているが、Dashboardは再生回数のグラフを
中心に据えている。撤去を勧めているわけではないが、**残すならなぜLanternの思想と
両立するのかをCLAUDE.mdに明記すべき**。今は書かれていないため将来の判断がぶれる。

**Insightsについて**: 実装ではなくデータ量の問題で機能していない。記録15件のうち
4項目すべて埋まっているのは1件のみ。時間の経過で改善する性質のもの。
