# HANDOFF.md — 引き継ぎ

**役割：「今どこにいるか」。** 別のセッション・別の人が、
これだけ読めば続きから始められる状態にしておく。

最終更新: 2026-08-06

## このファイルの決まり

**1つだけ。日付つきの引き継ぎ資料を増やさない。**

以前は `SESSION_HANDOFF_2026-07-28.md` のように日付で作っていた。
2つ問題があった。

1. どれが最新か分からなくなる
2. **feature ブランチに置いたまま main にマージされず、
   新しいセッションから見えなくなった**（実際に起きた）

だから main に1つ置き、上書きし続ける。過去分は `docs/archive/` にある。

**作業のたびに更新する。** 更新していない状態でセッションが切れると、
次の人は git log から現状を推測することになる。

---

## 1. 現在地

| | |
|---|---|
| バージョン | v2.0（Expo + Flask API + Supabase） |
| ブランチ | `main` |
| Web | Vercel（`client/` から `npx expo export --platform web`） |
| API | Render **Starter**（2026-08-06〜。無料枠の停止で冷え43.8秒だったため） |
| ネイティブ | **未配布。** Apple Developer Program 加入済み（2026-08-06）。版数 1.0.0。ビルドが次 |
| 実データ | 記録18件・アイデア0件・利用者は作者1人 |
| 検査 | pytest 621件 / vitest 82件 / expo config introspect 済 |

## 2. 直近にやったこと（2026-08-06）

1日で入れたものが多い。**どれもまだ日常で使われていない。**

- 問いの資産50問（`modules/questions/`）— AIを使わない
- アイデアの溜め場（`modules/ideas.py` + Journal のタブ）
- スプラッシュの文字が出ない不具合を修正
- パスワード自動入力と Enter ログインを修正（`FormShell.web.jsx`）
- 401で即サインアウトするのをやめた
- 記録フォームの既定表示を1欄に畳んだ
- 計測（`scripts/report_metrics.py`）
- ドキュメントの棚卸（このファイルを含む）
- A7の下準備。`expo-image-picker` の権限説明を追加し、依存を SDK 57 の
  想定バージョンに揃えた（`expo-doctor` 20/20）
- 版数を 1.0.0 に統一、輸出コンプライアンスを申告
- **写真を端末の中だけに置くようにした**（Supabase Storage をやめた）。
  既存の1枚は Storage・DB とも削除済み
- **サーバーのログから記録の中身・user_id・認可コードを外した**
- `exportLogs.js` がネイティブで落ちる状態だったのを直した
  （SDK 57 で旧 `expo-file-system` API は実行時に投げる）
- **アカウント削除**を実装（App Store 5.1.1(v) の必須要件）
- `PRIVACY.md` を用意
- 空の `lantern-photos` バケットと孤児 worktree を削除
- `logs` の写真列を削除（ユーザーが SQL を実行）
- プライバシーポリシーを `client/public/privacy.html` として同梱
- **本番が Flask の開発サーバーで動いていたのを gunicorn に切替**
- 依存と Python の版を固定（未固定だった）

## 3. 次にやること

**優先度1: 使う。**

問いとアイデアは 2026-08-06 に入れたばかりで、効くか分かっていない。
新しい入口を足す前に、これらが効くかを見る。
見る手段は用意した。

```
python scripts/report_metrics.py --user <user_id>
```

**優先度2: ネイティブ配布（フェーズA7）— 進行中**

Apple Developer Program は 2026-08-06 に加入済み。
コード側の準備は済んでいる（`expo-doctor` 20/20・写真の権限説明を追加）。

**残りはほぼ全てユーザー操作。** 私が代われないのは、
Apple のアカウントにログインする作業と、審査に出す判断のため。

| # | 作業 | 状態 |
|---|---|---|
| 1 | `eas login` | **済**（`pillow_hiro`） |
| 2 | EAS の環境変数（preview / production） | **済**（`EXPO_PUBLIC_*` 3件） |
| 3 | プライバシーポリシーのURL | **済**（`/privacy.html`。次のVercelデプロイで有効） |
| 4 | ネイティブ設定の確認 | **済**（`expo config --type introspect` で検証） |
| 5 | **Apple の認証情報の作成** | **未。対話が要る**（下記） |
| 6 | ビルド → App Store Connect 登録 → `eas submit` | 5 のあと |

**5 は私が代われない。** Apple ID のパスワードと2要素認証の入力が要るため。
非対話で試すと `Credentials are not set up. Run this command again in
interactive mode.` で止まる（ビルド枠は消費されない）。

対話で1回実行すれば、証明書とプロビジョニングプロファイルは
EAS 側に保存され、以降は自動になる。

```
cd client
npx eas-cli build --platform ios --profile production
```

`preview` ではなく `production` を勧める。`preview` は内部配布のため
端末のUDID登録が要る。`production` は TestFlight 経由で自分の端末に入り、
そのまま審査に出せる同じ成果物になる。

聞かれること: Appleアカウントへのログイン → Bundle ID の登録 →
証明書の作成。すべて「はい」でよい。

未決は「4. 今ある未解決のもの」にある。とくにプライバシーポリシーは必須。

**優先度2.5: サーバーの冷え — 解決済み（2026-08-06）**

Render Starter を契約した。実測で確認した。

| | 無料枠のとき | Starter |
|---|---|---|
| 眠りからの初回 | **43.8 秒** | 冷えが無い |
| 通常 | 0.21〜0.35 秒 | 0.19〜0.46 秒 |

移行は行わなかった。**44秒の原因は Render ではなく無料枠の停止**で、
プランで解決する問題だった。Cloud Run / AWS Lambda / Cloudflare の
比較は下に残す。将来また費用を見直すときの材料になる。

これが終わるまで Journaling Suggestions API には進めない。

**優先度3: TikTok連携**

優先度1の結果を見てから判断する。
`REVIEW_v2.0.md` は「外部連携は中心ではない」と結論している。

**やらないと決めたもの**: 目標設定機能（v0.5構想）、利用ログの収集。

**優先度2.6: 独自ドメイン `golantern.app`（2026-08-07 決定）**

API は `api.golantern.app` にする。
**`.app` は HSTS プリロード済みで HTTPS が必須。** http:// では一切開けない。
Render が証明書を自動発行するので、その点は問題ない。

順番を守れば、既存のビルドも連携も壊れない。

| # | 作業 | 状態 |
|---|---|---|
| 1 | Render に `api.golantern.app` を追加 | **済** |
| 2 | DNS 登録・TLS 発行 | **済** |
| 3 | 疎通確認（200・TLS正常・未認証は401） | **済**（2026-08-07） |
| 4 | Google / Twitch に新URIを追加 | **未** |
| 5 | Render の `YOUTUBE_REDIRECT_URI` / `TWITCH_REDIRECT_URI` を切替 | **未** |
| 6 | `/api/debug/version` で `redirect_misconfigured` が空を確認 | 5 のあと |
| 7 | EAS の `EXPO_PUBLIC_API_URL`（3環境）・ローカル `.env`・文書 | **済** |
| 8 | Vercel の `EXPO_PUBLIC_API_URL` | **未** |

**4→5 の順を守る。** 先にコンソールへ追加してから Render を切り替えれば、
連携が落ちる瞬間がない。現在 `/api/debug/version` の
`youtube_redirect` / `twitch_redirect` はまだ `onrender.com` を指している。

**7 でキャッシュに引っかかった。** `.env` を書き換えても
`expo export` が古い値を埋め込む。`EXPO_PUBLIC_*` はビルド時に
文字列として展開されるが、Metro のキャッシュが効いたままになる。
`rm -rf node_modules/.cache .expo && npx expo export --clear` で解消する。
**バンドルを検査して確かめること。**

**`.onrender.com` は消さないこと。** 既存の TestFlight ビルドが使っている。
Render は独自ドメインを足しても既定で残す。

Web 側（`lantern-inky-three.vercel.app`）も後から
`golantern.app` に寄せられる。プライバシーポリシーのURLが変わるが、
App Store Connect 側で差し替えられる。

## 4. 今ある未解決のもの

| 内容 | 状態 |
|---|---|
| プライバシーポリシーのURL | `client/public/privacy.html` として同梱済み。**次の Vercel デプロイで `https://lantern-inky-three.vercel.app/privacy.html` が有効になる。** App Store Connect にはこのURLを入れる |
| 記録テキストの暗号化 | **未着手。判断はストア公開の前。** 設計は `docs/superpowers/specs/2026-08-06-record-encryption-design.md`。現状は暗号化せず、`PRIVACY.md` に「提供者が閲覧できる状態」と明記する形を選んでいる |
| `.claude/worktrees/sad-hawking-5afb30/` | 孤児ディレクトリ648K。gitの管理から外れている。中身は履歴にあるもののみ。**削除してよい** |
| `goals` の死んだコード | `load_goals()` が実在しない表を毎回叩き、失敗を握り潰している。目標設定機能は REQUIREMENTS.md の「やらないこと」。`modules/ai.py` の引数を変える必要があるため別作業にした |
| **Procfile が効いていない** | Starter にしても `x-render-origin-server` は `Werkzeug` のまま（commit `0dba7eb` は反映済み）。**Render のダッシュボードに Start Command が設定されていて Procfile より優先されている。** Settings → Start Command を下記にするか、空にして Procfile に任せる<br>`gunicorn main:app --bind 0.0.0.0:$PORT --workers 1 --threads 8 --timeout 60` |
| ローカルの node_modules | OneDrive 配下にあるため、同期でファイルが欠けてビルドが落ちることがある（`expo/src/Expo.ts が無い`・`EINVAL readlink`）。`rm -rf node_modules && npm ci` で直る。**EAS のビルドはクラウドで入れ直すため影響しない** |
| Expo の追随 | `expo@57.0.11` の想定表が未公開の `expo-sharing@~57.0.10` を要求するため `expo install --fix` が通らない。**上流の不整合。** 直ったら追随する。それまで `expo-doctor` は「4件 out of date」と言う |
| npm の脆弱性11件 | すべて `uuid` の境界チェック漏れで、`@expo/config` 系のビルド時ツールにしか無い。配布物には乗らない。解消には Expo 側の breaking change が要る |
| AIモデル | `claude-sonnet-4-6`。Claude 5 系が出ており1世代前。上げると**文体が変わる**ため、AI憲法に照らして出力を読んでから決める |
| ローカルの Python | 3.13.3。本番は 3.14。テストは 3.13 で通している。揃えるなら手元を 3.14 に上げる |
| North Star Metric | 器はできたが母数が足りない |

### 記録テキストの暗号化について

写真と同じ問題がテキストにもある。ただし移し方が違う。

**端末へ移せない。** AIの応答・今日の灯り・週次月次の振り返り・
過去との対話・頻出語・検索・カレンダー・計測が、すべてサーバー側の
テキストに依存している。移すと Lantern の中身がほぼ無くなる。

**取りうるのは端末での暗号化。** 端末で暗号化して保存し、
AIに渡すときだけ平文を都度送る（保存はしない）。
開発者が見るのは暗号文になる。ただし
- 鍵を失うと全記録が永久に読めなくなる
- 検索・頻出語・計測を端末側へ移す必要がある
- 機種変更とパスワード変更の扱いを全部決める必要がある

**急がなくてよい理由と、急ぐ理由がある。**
今の利用者は作者1人で、開発者が自分の記録を読めることは問題ではない。
問題になるのは他人が使い始めたとき。
そして**後から暗号化に移すのは、最初からより難しい**。
ストア公開の前に決めるのが分かれ目になる。

## 5. 引き継ぐときに読む順番

1. `CLAUDE.md` — 判断基準。**これを読まずにコードを書かない**
2. このファイル — 現在地
3. `REQUIREMENTS.md` — 何を満たすか
4. `PROJECT_MAP.md` — どこにあるか
5. `PROGRESS.md` — 経緯（長い。必要な日付だけ）

`REVIEW_v2.0.md` は 2026-08-06 時点の機能精査。優先順位の根拠。

## 6. 環境

`.env`（ローカル）と Render の環境変数に入っている。**値は文書に書かない。**

| 変数 | 用途 |
|---|---|
| `SUPABASE_URL` / `SUPABASE_KEY` | DB・Storage |
| `ANTHROPIC_API_KEY` | AI |
| `YOUTUBE_*` / `TWITCH_*` | 各OAuth。`*_REDIRECT_URI` は本番で明示設定が要る |
| `FRONTEND_ORIGIN` | OAuth後の戻り先 |
| `UNSPLASH_ACCESS_KEY` | 起動画面の背景（無くても動く） |

`GET /api/debug/version` が、どのリダイレクトURIで動いているかを返す。
値そのものは出さない。設定ミスの検出用。
