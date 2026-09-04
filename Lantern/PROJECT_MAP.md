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
| API | `main.py` | ルートは全てここ。40ルール / 38パス。本番は gunicorn が読み込む |
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
| `(tabs)/index.jsx` | `/` | **書く。起動時に開く画面**（記録・アイデアの2タブ）。**入口**——書くのは `/write`。ここは開く紙と灯りと手がかり |
| `(tabs)/home.jsx` | `/home` | ホーム。挨拶・**今日の灯り**・今週の発見 ＋ **日替わりの抜粋3枚**（`HomeCard`。**今日は抜く**——書くタブと二重になる）|
| `(tabs)/journal.jsx` | `/journal` | 記録。検索・カレンダー・全件 ＋ 振り返りのタブ |
| `(tabs)/dashboard.jsx` | `/dashboard` | 分析。記録した日・続けて記録した日 ＋ YouTube / Twitch |
| `(tabs)/settings.jsx` | `/settings` | Settings |
| `login.jsx` | `/login` | ログインだけ。入力欄は `AuthForm.jsx` |
| `signup.jsx` | `/signup` | 新規登録だけ。確認メールの案内と再送を持つ |
| `forgot.jsx` | `/forgot` | パスワード再設定メールを送る。**宛先を出す・再送を置く** |
| `reset.jsx` | `/reset` | 新しいパスワードを決める。**メールのリンクから開かれる** |
| `account.jsx` | `/account` | アカウント。設定から1枚めくる。**削除はここにある** |
| `plan.jsx` | `/plan` | プラン。設定の「現在のプラン」から1枚めくる。**購入と復元はここにある** |
| `write.jsx` | `/write` | **記録を書く全画面**（上から被さる）。「記録する」は上の帯。保存すると閉じ、灯りは戻った先に出る |
| `insights.jsx` | `/insights` | `/journal` へのリダイレクト（旧URL用） |

### Home が呼ぶもの

| 部品 | API |
|---|---|
| `MilestoneBanner` | `GET /api/milestone`・`GET /api/milestone/reflection` |
| （今日の灯り・画面直書き） | `GET /api/daily/quote` |
| `RecordForm` | `POST /save`（`defer_ai`）・`POST /api/light`・`GET /api/question`（問いはプレースホルダに出る） |
| `IdeasPanel` | `/api/ideas` 4種。**2026-08-08 に Journal から移した** |
| `WeeklyDiscovery` | なし（AIを使わない。ローカルで組み立てる） |

### Journal が呼ぶもの

| タブ | 部品 | API |
|---|---|---|
| 記録 | `ActivityCalendar` / `LogList` → `LogItem` → `LogDetail` / `PhotoPicker` | `GET /api/logs`・`POST /save`・`DELETE /api/logs/<date>`・`PUT /api/logs/<date>/favorite` |
| 振り返り | `ReviewSection` | `POST /api/review/generate` |
| 振り返り | `TimelineSection` → `LogSnapshot` / `ReviewSection` | `GET /api/timeline-reflection` |
| 振り返り | `KeywordSection` | `GET /api/insights/keywords` |

### Dashboard が呼ぶもの

| 部品 | API |
|---|---|
| `YouTubePanel` → `ViewsChart` / `VideoTimeline` | `/api/youtube/*` 8種 |
| `TwitchPanel` | `/api/twitch/*` 5種（callback を除く） |

---

## 3. 部品（`client/components/`・29ファイル）

| ファイル | 使う側 | 役割 |
|---|---|---|
| `ActivityCalendar.jsx` | Journal | 創作カレンダー。記録あり(amber)／なし の2状態のみ。**「今月」は月を戻すだけ** |
| `AuthScreen.jsx` | login / signup / forgot / reset | 認証4画面の外枠。**キーボードぶんの下余白はここだけで持つ**。`justify-center` のままだとスクロールの余地が 0 で、隠れた欄を引き出せない |
| `AuthForm.jsx` | login / signup | カードに載せた2欄。空欄のまま送らせない。欄そのものは `AuthField` |
| `FormShell.jsx` | login | ネイティブ。素通しする |
| `FormShell.web.jsx` | login | **Webだけ本物の `<form>` と隠しsubmitを出す。** これがないとパスワード自動入力とEnterが効かない |
| `IdeasPanel.jsx` | 書く | アイデアの溜め場。件数を出さない。丸いチェック＋**左に払うとゴミ箱**（行が横スクロール。方向の裁定は OS に任せる） |
| `KeywordSection.jsx` | Journal | 頻出語。感情分類はしない。**押すとその語で絞った一覧へ** |
| `LogDetail.jsx` | LogItem | 記録の詳細・編集・削除。削除は赤。**直せるのは「やったこと」だけ**（読む側は4つとも出る） |
| `LogItem.jsx` | LogList | 一覧の1行。日付＋抜粋2行。**開閉は `LayoutAnimation` で滑らかに** |
| `LogList.jsx` | 記録 / ホーム | **一覧の作り。月ごとに1枚のカード、中を区切り線で分ける** |
| `EditorToolbar.jsx` | _layout / RecordForm | **キーボードに貼り付く装飾の列**（太字・斜体・箇条書き・写真）。`InputAccessoryView` は使わない |
| `WriteTabs.jsx` | 書く | **記録とアイデアの切り替え**。帯が滑り、動く間だけ伸び縮みする（squash and stretch） |
| `Motion.jsx` | 各所 | **動きの小物**（生える・押して沈む・画面の明滅）。重さを1か所で決める |
| `UnderlineTabs.jsx` | 記録 / 分析 / 過去との対話 | **下線式のタブ**。下線が滑って幅も変わる。3か所の同じ形を1つにした |
| `LogSnapshot.jsx` | TimelineSection | 過去1件を並べるカード。**`flex-1` を付けない**（中身がはみ出す） |
| `MilestoneBanner.jsx` | Home | 30/90/180日。localStorage で既読管理 |
| `PhotoLightbox.jsx` | PhotoPicker | 写真の拡大 |
| `PhotoPicker.jsx` | Journal / LogDetail / RecordForm | ネイティブ。1記録1枚。`compact` で道具の列に入る |
| `PhotoPicker.web.jsx` | 同上 | **何も描かない。** 分岐ではなくファイルを分けて、expo-image-picker を Web バンドルに乗せない |
| `RecordForm.jsx` | write | 記録フォーム。**欄は「やったこと」ひとつだけ**（2026-09-04 に残り3つを消した） |
| `ReviewSection.jsx` | Journal / TimelineSection | 観察と問いの組を出す |
| `RichText.jsx` | LogDetail / LogSnapshot | 記録を装飾つきで出す。**出せるのは3つだけ** |
| `RichEditor.jsx` | WebEditor.web | Web 用の入力欄。記号は消さず薄くする |
| `WebEditor.jsx` ＋ `WebEditor.web.jsx` | RecordForm | **本物の編集画面**（WebView の `contenteditable`）。記号が見えない |
| `FileList.jsx` | RecordForm | 添えたファイルの一覧。**端末の中だけ**。件数は出さない |
| `SidebarTabBar.jsx` | (tabs)/_layout | 768px以上のサイドバー（192px） |
| `TabIcons.jsx` | (tabs)/_layout.web / SidebarTabBar | **Web のタブのアイコン**（家／ノート／ペン／格子／歯車）。ネイティブは SF Symbols |
| `Text.jsx` | 全画面 | **本文フォントの既定を持つ Text。`react-native` の Text を直接使わない** |
| `Onboarding.jsx` | _layout | 初回だけ出る案内。**3枚めくって終わり**（起動画面のあと・ログイン済みのみ） |
| `BootScreen.jsx` | _layout | 判定が済むまでの画面。**OS の起動画面と見分けがつかないこと**（地の色と絵は `app.json` の `expo-splash-screen` と対）。待ちが伸びたときだけ灯りが息をする |
| `HintCard.jsx` | HintPanel | 手がかりの面。問いを出すときは**足りないことを先に言う**。答えたあとは探し直さない |
| `HintPanel.jsx` | HomeCard の footer | 手がかりの入口。**カードの中に置く**——押したボタンの載っているカードが探す相手。答えもその記録に `id` で足す（**`struggled` の唯一の書き手**） |
| `WriteButton.jsx` | (tabs)/index・home・journal | 右下に浮くペン。押すと `/write`。**この3画面だけ**（分析と設定には置かない） |
| `SplashScreen.jsx` | _layout | 起動画面。`Animated.View` で包む（`Animated.Text` に className は効かない） |
| `TimelineSection.jsx` | Journal | 過去との対話 |
| `TwitchPanel.jsx` | Dashboard | 配信一覧が主・フォロワー数が従 |
| `OverviewPanel.jsx` | Dashboard | つないでいる場所を横に並べる。**合計も増減も出さない** |
| `Paywall.jsx` | 振り返り / 過去 / キーワード | 断られたときの面。**Apple 3.1.2 の6項目を満たす** |
| `VideoTimeline.jsx` | YouTubePanel | 動画一覧。1本ずつ観察を取れる |
| `ViewsChart.jsx` | YouTubePanel | 再生回数の推移 |
| `WeeklyDiscovery.jsx` | ホーム | 今週の発見。**AIを使わない**ので地は灰（砂はLanternの言葉の色） |
| `MonthPicker.jsx` | 記録 | 一覧を月で区切る。**既定は当月・記録がある月だけ出す** |
| `HomeCard.jsx` | ホーム / (tabs)/index | 結果だけの1枚。やったこと・写真・Lanternの言葉。「書く」では時刻を出し、灯り待ちは息をする |
| `TimeDial.jsx` | 設定 | 通知の時刻。**hh:mm をダイヤルで回す**（端末の部品は使わない） |
| `AppHeader.jsx` | 全タブ | 画面の上端。**Lantern の綴りを左上に置く** |
| `AccountMark.jsx` | 設定 | アカウントの印。**顔写真は持たない**。アドレスから決まる |
| `AuthField.jsx` | 認証 | アイコン＋下線の入力欄。ログイン/登録/再設定で共有 |
| `LanternMark.jsx` | 認証 | 灯りのしるし（SVG）。**絵文字を使わない**ため図形で描く |
| `YouTubePanel.jsx` | Dashboard | YouTube 側の中身 |

---

## 4. `client/lib/`

| ファイル | 役割 | test |
|---|---|---|
| `date.js` | `localDateStr` / `todayStr` / `calcStreak`。`toISOString()` はUTCへ寄るため使わない | `date.test.js` |
| `authError.js` | Supabase の英文エラーを利用者向けの一文にする | `authError.test.js` |
| `authLink.js` | 認証メール（登録の確認・再設定）の戻り先。**渡さないと Supabase の Site URL に落ちる**。再設定はアプリへ（`lantern://reset`）、確認は Web へ | — |
| `recoveryLink.js` | 再設定リンクの `#` から復帰用のトークンを読む。**ネイティブは自分で読む**（`detectSessionInUrl` が効かない） | `recoveryLink.test.js` |
| `hint.js` | 手がかりを取りに行く。**どちらを返すかはサーバーが決める**（判定を2か所に置かない） | `hint.test.js` |
| `recoverySession.js` | 上を使って `setSession` する。**根で受ける**（`_layout`）。画面で受けると、裏で起きていたときに取りこぼす | — |
| `greeting.js` | 時間帯の挨拶。**材料は時計だけ** | `greeting.test.js` |
| `notifyText.js` | 通知の文面と時刻の組み立て。**日数も件数も持たない** | `notifyText.test.js` |
| `notify.js` / `notify.web.js` | 通知の予約（端末の中だけ）。Web は「使えない」を返す | — |
| `fonts.js` | `useAppFonts()`。読み込む書体はここだけで決める | — |
| `format.js` | 表示用の整形 | `format.test.js` |
| `imageMath.js` | 縮小後の寸法計算 | `imageMath.test.js` |
| `markdown.js` | 記法の解釈と、装飾ボタンの文字列操作。`parseWithMarkers` は**つなぎ直すと元に戻る** | `markdown.test.js` |
| `image.js` | 圧縮の実行 | — |
| `photoPath.js` | 端末内の写真のファイル名を組み立てる／読み解く | `photoPath.test.js` |
| `photoStore.js` ＋ `photoStore.web.js` | **写真を端末の中だけに置く。**サーバーに送らない | — |
| `supabase.js` | クライアント初期化と `authFetch`。401 では更新して1回だけ再試行する | — |
| `tabBar.js` ＋ `tabBar.web.js` | 画面が空ける下の余白。**ネイティブは 0**（`NativeTabs` が持つ）、Web は自前 | — |
| `theme.js` | 外観の保持と NativeWind への反映（`react-native` を読む） | — |
| `themeMode.js` | 外観の決め方。**端末に合わせる／ライト／ダークの3つ**。既定は端末 | `themeMode.test.js` |
| `sample.js` | ホームに並べる記録を選ぶ。**その日のうちは同じ顔ぶれ** | `sample.test.js` |
| `accountMark.js` | アカウントの印の色と文字。**アドレスだけから決まる** | `accountMark.test.js` |
| `avatarStore.js` ＋ `avatarStore.web.js` | アカウントの画像。**端末の中だけ** | — |
| `splashPref.js` | 起動画面を毎回出すか。**本来は1日1回** | — |
| `onboardingPref.js` | 初回の案内を見たか。**一度きり**（鍵に版を持つ） | — |
| `onboardingSlides.js` | 案内3枚の中身と進み方。**禁止ワードも検査する** | `onboardingSlides.test.js` |
| `splashImage.js` | 起動画面の地。**アプリの中に持つ**（日替わり・`assets/splash/`） | — |
| `splashPhoto.js` ＋ `splashPhoto.web.js` | Unsplash の写真を端末に覚えさせる。**次回から即座に出る** | — |
| `splashQuote.js` ＋ `splashQuote.web.js` | 起動画面の一言を端末に覚えさせる。**描いたあとで差し替えない** | `splashQuote.test.js` |
| `splashBackground.js` | 起動画面とログイン画面が**同じ1枚**を選ぶための場所 | — |
| `splashHandoff.js` | 起動画面が去り始めたことをログイン画面に知らせる | `splashHandoff.test.js` |
| `platforms.js` | つないでいる場所の表。**足すのはここに1行** | `platforms.test.js` |
| `plan.js` | 402 の見分けと断り文。**機能を開けているのはサーバー** | `plan.test.js` |
| `purchases.js` ＋ `purchases.web.js` | RevenueCat 経由の購入。**鍵が無ければ出さない**／Web は買えない | — |
| `htmlMarkdown.js` | 編集画面の HTML と保存の Markdown を行き来する。**往復で戻る** | `htmlMarkdown.test.js` |
| `editorPage.js` | 編集画面に流し込む HTML。**切り出してあるのでブラウザで開いて試せる** | `editorPage.test.js` |
| `fileStore.js` ＋ `fileStore.web.js` | **添付を端末の中だけに置く。** サーバーに送らない | — |
| `openLegal.js` / `openLegal.web.js` | 規約・プライバシー・特商法を開く。**アプリ内に複製しない** | — |
| `exportLogs.js` ＋ `exportLogs.web.js` | 書き出し。**ZIP に本文・写真・添付・Markdown をまとめる**（Web は写真を持たない） | — |
| `exportMarkdown.js` | 記録を Markdown にする。**空の欄で見出しを作らない** | `exportMarkdown.test.js` |
| `keyboard.js` | キーボードの高さを聞く（`react-native` を読む） | — |
| `refreshOnFocus.js` | ホーム / 記録 / 分析 | **戻ってきたら取り直す**。タブは裏で生きたままなので、載せたときの取得は二度と走らない |
| `logsCache.js` | ホーム / 書く / 記録 / 分析 / 設定 | **記録の取り方を1か所に。**控えを先に出し、裏で取り直す。5画面が別々に全記録を取っていたのをまとめた |
| `lightBuffer.js` | 書く | **灯りの受け皿。画面より長生きする。**保存でフォームが作り直されるため、待ちも結果も React の外に置く |
| `trialText.js` | Paywall | **無料お試しの一文**。ストアの `introPrice` から組む。値引きは「無料」と言わない |
| `keyboardMath.js` | 下に空ける高さと窓の高さの計算。**安全域を二重に数えない** | `keyboardMath.test.js` |
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
| `markdown.py` | **記録の記法を剥がす。AIに渡す前に必ず通す** |
| `logs.py` | 記録の読み書きとカラム変換。**写真カラムを読み書きしない** | `test_logs_mapping.py` |
| `metrics.py` | 集計。**画面には出さない** | `test_metrics.py` |
| `oauth_state.py` | OAuth state。YouTube / Twitch 共通。**HMAC で署名し10分で切れる** | `test_oauth_state.py` |
| `crypto.py` | 記録の本文を AES-256-GCM で包む。**鍵が無ければ素通し**。復号に失敗したら投げる（空を返すと上書きで消える） | `test_crypto.py` |
| `ratelimit.py` | AI を呼ぶ回数の1日あたりの上限。**表が無ければ素通し** | — |
| `hintusage.py` | 手がかりを使った回数。**通算**（1日あたりではない）。**表が無ければ素通し** | `test_hint.py` |
| `plan.py` | 無料と有料の線。**今日と今週は無料、掘るのは有料** | `test_plan.py` |
| `billing.py` | RevenueCat の通知を受けて `subscriptions` を書く。**端末は経路に入らない** | `test_billing.py` |
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

## 6. API（`main.py`・40ルール / 38パス）

`callback` の2本を除き、全てに `@require_auth` が付く。
`test_route_auth.py` が全ルートを走査して固定している。

| 系統 | パス |
|---|---|
| 記録 | `POST /save`・**`POST /api/light`**（灯りだけ。`/save` から切り離した）・`GET /api/logs`・`DELETE /api/logs/<date>`・`PUT /api/logs/<date>/favorite` |
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
| `client/public/privacy.html` | `PRIVACY.md` | `python scripts/build_legal.py` |
| `client/public/terms.html` | `TERMS.md` | 同上 |
| `client/public/tokushoho.html` | `TOKUSHOHO.md` | 同上 |

**手で直さないこと。** `tests/test_docs.py` の `TestPrivacyPage` と
`TestLegalPages` が一致を検査する。原本を直したら作り直す。

---

## 9. 言葉を見張るもの

Lantern は言葉が中身なので、**言葉だけを見る仕掛けを3つ持っている。**

| もの | 何をするか | いつ |
|---|---|---|
| `tests/test_ui_words.py` | 画面の JSX から禁止ワード・「AI」の名乗り・`？` を拾う | 毎回（pytest） |
| `tests/test_prompts.py` | AI へのプロンプトを見る。**人格が渡っているか**も見る | 毎回（pytest） |
| `scripts/collect_words.py` | 画面と応答に出る日本語だけを抜き出す（コメントを落とす） | 手で |
| `.claude/agents/lantern-words.md` | 抜き出したものを AI憲法に照らして読む点検役 | 言葉を足したとき・リリース前 |

**機械は字面しか見ない。** 「歩み」と「一歩」のような言い換えは
点検役の側で捕まえる。逆に、点検役は毎回は走らないので、
見つかった型は `test_ui_words.py` に落として固定する。

---

*このファイルは実装を読み取った事実の記録である。設計意図は CLAUDE.md にある。*
