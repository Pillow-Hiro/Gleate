# PROJECT_MAP.md — 実装対応表

**役割：「どこにあるか」を引くための表。** 判断の根拠は CLAUDE.md、
満たすべきことは REQUIREMENTS.md、経緯は PROGRESS.md にある。

最終更新: 2026-08-06（v2.0 / Expo + Flask API + Supabase）

`tests/test_docs.py` がこのファイルを機械的に検査する。
ファイルを足したのに書き忘れると落ちる。**落ちたらこのファイルを直すこと。**

## 行番号を書かない

2026-08-06 に方針を変えた。以前は `L232–L270` のように行番号で示していたが、
1回の編集で全部ずれるため、書いた翌日には嘘になっていた。
実際、このファイルは 2026-08-04 に削除した `frontend/` を
2026-08-06 まで説明し続けていた。

**ファイル名と関数名・コンポーネント名で示す。** これらは編集でずれず、
機械的に存在を確認できる。

---

## 1. 全体像

```
利用者 → Expo（Web / iOS / Android）→ Flask API → Supabase
                                          └→ Anthropic / YouTube / Twitch
```

| 層 | 場所 | 備考 |
|---|---|---|
| 画面 | `client/app/` | expo-router。ファイル名がURLになる |
| 部品 | `client/components/` | 23ファイル |
| 純粋関数 | `client/lib/` | vitest の対象。ここだけを test している |
| API | `main.py` | ルートは全てここ。33ルール / 31パス。本番は gunicorn が読み込む |
| ドメイン | `modules/` | Flask に依存しない処理 |
| 検査 | `tests/`（pytest）/ `client/lib/*.test.js`（vitest） | |
| 静的配信 | `client/public/` | expo export が出力の直下へ複製する。**SPAを通らないのでログイン不要で開ける** |

Web も同じ `client/` から `npx expo export --platform web` で出す。
`frontend/`（React + Vite）は 2026-08-04 に廃止した。

**写真だけはこの流れに乗らない。** 端末の中に置き、サーバーへ送らない
（2026-08-06〜）。理由は `client/lib/photoStore.js` にある。

---

## 2. 画面（`client/app/`）

| ファイル | URL | 中身 |
|---|---|---|
| `_layout.jsx` | 全体 | 認証ガード・テーマ・`ErrorBoundary`・起動画面（1日1回） |
| `(tabs)/_layout.jsx` | タブ | **ネイティブ。本物の `UITabBar`（`NativeTabs`）。iOS 26 では OS が Liquid Glass にする** |
| `(tabs)/_layout.web.jsx` | 同上 | **Web。** 幅768pxでボトムタブ／サイドバーを切り替える。狭いときはすりガラス |
| `(tabs)/index.jsx` | `/` | **書く。起動時に開く画面**（記録・アイデアの2タブ）。今日の灯りは持たない |
| `(tabs)/home.jsx` | `/home` | ホーム。**今日の灯り** ＋ 直近の記録を眺める（探さない） |
| `(tabs)/journal.jsx` | `/journal` | 記録。検索・カレンダー・全件 ＋ 振り返りのタブ |
| `(tabs)/dashboard.jsx` | `/dashboard` | インサイト。YouTube / Twitch |
| `(tabs)/settings.jsx` | `/settings` | Settings |
| `login.jsx` | `/login` | ログインだけ。入力欄は `AuthForm.jsx` |
| `signup.jsx` | `/signup` | 新規登録だけ。確認メールの案内と再送を持つ |
| `insights.jsx` | `/insights` | `/journal` へのリダイレクト（旧URL用） |

### Home が呼ぶもの

| 部品 | API |
|---|---|
| `MilestoneBanner` | `GET /api/milestone`・`GET /api/milestone/reflection` |
| （今日の灯り・画面直書き） | `GET /api/daily/quote` |
| `RecordForm` | `POST /save`・`GET /api/question`（問いはプレースホルダに出る） |
| `IdeasPanel` | `/api/ideas` 4種。**2026-08-08 に Journal から移した** |
| `WeeklyDiscovery` | なし（AIを使わない。ローカルで組み立てる） |

### Journal が呼ぶもの

| タブ | 部品 | API |
|---|---|---|
| 記録 | `ActivityCalendar` / `LogItem` → `LogDetail` / `PhotoPicker` | `GET /api/logs`・`POST /save`・`DELETE /api/logs/<date>` |
| 振り返り | `ReviewSection` | `POST /api/review/generate` |
| 振り返り | `TimelineSection` → `LogSnapshot` / `ReviewSection` | `GET /api/timeline-reflection` |
| 振り返り | `KeywordSection` | `GET /api/insights/keywords` |

### Dashboard が呼ぶもの

| 部品 | API |
|---|---|
| `YouTubePanel` → `ViewsChart` / `VideoTimeline` | `/api/youtube/*` 8種 |
| `TwitchPanel` | `/api/twitch/*` 5種（callback を除く） |

---

## 3. 部品（`client/components/`・26ファイル）

| ファイル | 使う側 | 役割 |
|---|---|---|
| `ActivityCalendar.jsx` | Journal | 創作カレンダー。記録あり(amber)／なし の2状態のみ |
| `AuthForm.jsx` | login / signup | メールとパスワードの入力欄。空欄のまま送らせない |
| `FormShell.jsx` | login | ネイティブ。素通しする |
| `FormShell.web.jsx` | login | **Webだけ本物の `<form>` と隠しsubmitを出す。** これがないとパスワード自動入力とEnterが効かない |
| `IdeasPanel.jsx` | 書く | アイデアの溜め場。件数を出さない。使ったものは取り消し線で残す |
| `KeywordSection.jsx` | Journal | 頻出語。感情分類はしない |
| `LogDetail.jsx` | LogItem | 記録の詳細・編集・削除。削除は赤 |
| `LogItem.jsx` | LogList | 一覧の1行。日付＋抜粋2行。開くと LogDetail |
| `LogList.jsx` | 記録 / 最近 | **一覧の作り。月ごとに1枚のカード、中を区切り線で分ける** |
| `LogSnapshot.jsx` | TimelineSection | 過去1件を並べるカード。**`flex-1` を付けない**（中身がはみ出す） |
| `MilestoneBanner.jsx` | Home | 30/90/180日。localStorage で既読管理 |
| `PhotoLightbox.jsx` | PhotoPicker | 写真の拡大 |
| `PhotoPicker.jsx` | Journal / LogDetail / RecordForm | ネイティブ。1記録1枚。圧縮して端末に置く |
| `PhotoPicker.web.jsx` | 同上 | **何も描かない。** 分岐ではなくファイルを分けて、expo-image-picker を Web バンドルに乗せない |
| `RecordForm.jsx` | Home | 記録フォーム。既定で見えるのは「やったこと」だけ |
| `ReviewSection.jsx` | Journal / TimelineSection | 観察と問いの組を出す |
| `SidebarTabBar.jsx` | (tabs)/_layout | 768px以上のサイドバー（192px） |
| `TabIcons.jsx` | (tabs)/_layout.web / SidebarTabBar | **Web のタブのアイコン**（家／ノート／ペン／格子／歯車）。ネイティブは SF Symbols |
| `Text.jsx` | 全画面 | **本文フォントの既定を持つ Text。`react-native` の Text を直接使わない** |
| `SplashScreen.jsx` | _layout | 起動画面。`Animated.View` で包む（`Animated.Text` に className は効かない） |
| `TimelineSection.jsx` | Journal | 過去との対話 |
| `TwitchPanel.jsx` | Dashboard | 配信一覧が主・フォロワー数が従 |
| `VideoTimeline.jsx` | YouTubePanel | 動画一覧。1本ずつ観察を取れる |
| `ViewsChart.jsx` | YouTubePanel | 再生回数の推移 |
| `WeeklyDiscovery.jsx` | 書く | 今週の発見。**AIを使わない** |
| `YouTubePanel.jsx` | Dashboard | YouTube 側の中身 |

---

## 4. `client/lib/`

| ファイル | 役割 | test |
|---|---|---|
| `date.js` | `localDateStr` / `todayStr` / `calcStreak`。`toISOString()` はUTCへ寄るため使わない | `date.test.js` |
| `authError.js` | Supabase の英文エラーを利用者向けの一文にする | `authError.test.js` |
| `fonts.js` | `useAppFonts()`。読み込む書体はここだけで決める | — |
| `format.js` | 表示用の整形 | `format.test.js` |
| `imageMath.js` | 縮小後の寸法計算 | `imageMath.test.js` |
| `image.js` | 圧縮の実行 | — |
| `photoPath.js` | 端末内の写真のファイル名を組み立てる／読み解く | `photoPath.test.js` |
| `photoStore.js` ＋ `photoStore.web.js` | **写真を端末の中だけに置く。**サーバーに送らない | — |
| `supabase.js` | クライアント初期化と `authFetch`。401 では更新して1回だけ再試行する | — |
| `tabBar.js` ＋ `tabBar.web.js` | 画面が空ける下の余白。**ネイティブは 0**（`NativeTabs` が持つ）、Web は自前 | — |
| `theme.js` | テーマの保持 | — |
| `exportLogs.js` ＋ `exportLogs.web.js` | JSONの書き出し。SDK 57 の File / Directory / Paths を使う | — |
| `youtubeConnect.js` ＋ `youtubeConnect.web.js` | OAuth の開始 | — |
| `twitchConnect.js` ＋ `twitchConnect.web.js` | 同上 | — |
| `constants.js`（`client/` 直下） | `APP_VERSION` | — |

対で持つファイルは省略せず両方書く。片方だけ足したときに
`tests/test_docs.py` が気づけなくなるため。

`.web.js` との対は Metro がプラットフォームで選ぶ。
**呼び出し側に `Platform.OS` の分岐を置かない。**
ネイティブ専用の依存が Web バンドルに混ざらないための分け方でもある。

vitest は `client/lib/` の純粋関数だけを対象にする（`vitest.config.mjs`）。

---

## 5. `modules/`

| ファイル | 役割 | test |
|---|---|---|
| `account.py` | アカウントの削除。**行を消してから認証の利用者を消す** | `test_account.py` |
| `ai.py` | 15関数。全AIプロンプト。ガードレールの文言はここ | `test_ai_parsing.py`・`test_prompts.py` |
| `auth.py` | `require_auth`（Supabase JWT・ES256） | `test_auth_algorithms.py`・`test_route_auth.py` |
| `ideas.py` | アイデア。**`done` ではなく `picked_at`** | `test_ideas.py` |
| `logs.py` | 記録の読み書きとカラム変換。**写真カラムを読み書きしない** | `test_logs_mapping.py` |
| `metrics.py` | 集計。**画面には出さない** | `test_metrics.py` |
| `oauth_state.py` | OAuth state。YouTube / Twitch 共通 | `test_youtube_state.py` |
| `questions/` | 問いの資産50問。**AIを使わない** | `test_questions.py` |
| `timeutil.py` | JST基準の日付 | `test_timeutil.py` |
| `twitch.py` | Twitch OAuth・VODの保存 | `test_twitch.py` |
| `youtube.py` | YouTube OAuth（PKCEあり） | `test_youtube_redirect.py` |

その他の test: `test_save_cost.py`（`/save` が全件保存に戻らないこと）、
`test_timeline_params.py`、`test_docs.py`（この表の検査）、
`test_privacy.py`（記録と資格情報がログに出ないこと）、
`test_deploy.py`（本番の起動構成と依存の固定）、
`test_account.py`（退会時の削除）、
`test_react_patterns.py`（実機でしか露見しない書き方の誤り）、
`test_prompts.py`（プロンプトが AI憲法と矛盾していないか）。

---

## 6. API（`main.py`・33ルール / 31パス）

`callback` の2本を除き、全てに `@require_auth` が付く。
`test_route_auth.py` が全ルートを走査して固定している。

| 系統 | パス |
|---|---|
| 記録 | `POST /save`・`GET /api/logs`・`DELETE /api/logs/<date>` |
| 問い | `GET /api/question` |
| アイデア | `GET|POST /api/ideas`・`PATCH|DELETE /api/ideas/<int:idea_id>` |
| 灯り | `GET /api/daily/quote`・`GET /api/splash/content` |
| 振り返り | `POST /api/review/generate`・`GET /api/timeline-reflection`・`GET /api/insights/keywords` |
| 節目 | `GET /api/milestone`・`GET /api/milestone/reflection` |
| YouTube | `auth-url`・`callback`・`status`・`disconnect`・`channel`・`videos`・`analytics`・`video-insight`・`channel-insight` |
| Twitch | `auth-url`・`callback`・`status`・`disconnect`・`streams`・`channel`・`stream-insight` |
| アカウント | `DELETE /api/account`（記録・アイデア・連携・認証をすべて消す） |
| 運用 | `GET /api/debug/version` |

`serve_react` は 2026-08-04 に削除した。Flask は静的ファイルを配らない。

---

## 7. 触るときに壊しやすい場所

| 場所 | 壊れ方 | 守っているもの |
|---|---|---|
| `modules/logs.py` の `_to_db` | 写真カラムを読み書きすると、端末とサーバーの二重管理になる | `test_logs_mapping.py::TestNoPhotoColumns` |
| `main.py` の `/save` | 全件 upsert に戻すと記録数に比例して遅く高くなる | `test_save_cost.py` |
| `modules/ai.py` のプロンプト | ガードレールの文を消すと数字で評価し始める | `test_docs.py`（CLAUDE.md の引用と一致するか） |
| `print` / `logger` の追記 | デバッグ中に記録の中身や user_id を書くと、Render のログに残る | `test_privacy.py` |
| `modules/account.py` | `.eq("user_id", ...)` を落とすと全員の記録が消える | `test_account.py` |
| 利用者に紐づく表の追加 | 削除対象に足し忘れると、退会したのに記録が残る | `test_account.py`（表を走査する） |
| `modules/twitch.py` のトークン | 更新後の refresh_token を保存し直さないと次で失敗する（使い捨て） | `test_twitch.py` |
| Dashboard の Web / ネイティブ | 片方だけ直すとまたずれる | なし（人が両方見る） |
| `client/components/FormShell.web.jsx` | `<form>` を外すとパスワード自動入力が黙って壊れる | なし（実機で確認する） |
| コンポーネントの中でのコンポーネント定義 | 描画のたびに作り直され、入力欄なら1文字ごとにフォーカスが外れる | `test_react_patterns.py` |
| `tabBarIcon` の指定漏れ | ボトムタブに既定の三角が並ぶ。**広い画面のサイドバーは自前描画なので気づけない** | `test_react_patterns.py` |
| `client/lib/exportLogs.js` | SDK 57 の `expo-file-system` は旧APIを呼ぶと実行時に投げる。**Webは `.web.js` を使うので気づけない** | なし（実機で確認する） |
| `Procfile` | 開発サーバーに戻すと、本番が Werkzeug で動く。**動いてしまうので気づけない** | `test_deploy.py` |
| `requirements.txt` | 版の固定を外すと、コードを変えていないのに壊れる余地が戻る | `test_deploy.py` |

---

## 8. 生成物

| ファイル | 元 | 作り方 |
|---|---|---|
| `client/public/privacy.html` | `PRIVACY.md` | `python scripts/build_privacy.py` |

**手で直さないこと。** `tests/test_docs.py::TestPrivacyPage` が一致を検査する。
原本を直したら作り直す。

---

*このファイルは実装を読み取った事実の記録である。設計意図は CLAUDE.md にある。*
