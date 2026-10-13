# Cloud Run へ移す手順（2026-10-11）

作者の判断「**renderのサブスクが痛いから完全無料で同品質のサービスを使用したい**」。
13通り調べた結果と、なぜ Cloud Run を選んだかは下の「選んだ理由」。

**月 $7 → $0。** この規模なら無料枠（月200万リクエスト・18万vCPU秒・36万GiB秒）に収まる。

## 気をつけること

- **カードの登録が要る。**無料枠を超えた分は課金される（止める仕組みは無い）。
  だから `--max-instances` で頭を押さえ、予算アラートを入れる。
- **鍵をチャットに貼らない。**値は Render の画面から自分の手で写す。
  `env.yaml` は `.gitignore` に入れてある。
- **Render は1週間残す。**DNS を切り替えるのは最後。戻る道を消さない。

## 0. 下ごしらえ（作者の手で）

1. Google Cloud のアカウントを作り、課金アカウントを登録する
2. プロジェクトを作る（例: `lantern-api`）
3. 以降は **Cloud Shell**（ブラウザの中の端末）で作業する。手元に `gcloud` を入れなくてよい

```bash
gcloud config set project <プロジェクトID>
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
gcloud artifacts repositories create lantern --repository-format=docker --location=asia-northeast1
```

**東京（`asia-northeast1`）に置く。**無料枠の対象で、いちばん近い。

## 1. 環境変数を写す

Render の画面にある値を、Cloud Shell で `env.yaml` に書く。**この一覧がサーバーの必要なもの全部。**

| 変数 | 中身 |
|---|---|
| `SUPABASE_URL` / `SUPABASE_KEY` | DB と認証 |
| `ANTHROPIC_API_KEY` | AI |
| `LANTERN_ENC_KEYS` | 記録の暗号化の鍵 |
| `OAUTH_STATE_SECRET` | 連携のときの本人確認 |
| `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` / `YOUTUBE_REDIRECT_URI` | YouTube 連携 |
| `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` / `TWITCH_REDIRECT_URI` | Twitch 連携 |
| `REVENUECAT_WEBHOOK_SECRET` | 購読状態の通知の受け口 |
| `UNSPLASH_ACCESS_KEY` | 起動画面の写真 |
| `APPLE_MUSIC_KEY_ID` / `APPLE_MUSIC_TEAM_ID` | Apple Music |
| `FRONTEND_ORIGIN` | CORS の許可元 |
| `APP_TIMEZONE` | 日付の基準（`Asia/Tokyo`） |

**形は「キー: 値」の YAML。**`KEY=値`（`.env` と同じ形）で写すと、`gcloud` が
`expected map-like data` と言って止まる（2026-10-14 にここで止まった）。
写したファイルがその形なら、直す道具を通す。**値は画面に出ない。**

```bash
python3 scripts/env_to_yaml.py env.yaml env.cloudrun.yaml
```

足りない変数があれば名前で知らせる。以降は `--env-vars-file env.cloudrun.yaml` を渡す。

**`YOUTUBE_REDIRECT_URI` と `TWITCH_REDIRECT_URI` は `https://api.golantern.app/...` のまま。**
ドメインを変えないので、Google と Twitch の登録を触る必要は無い。

**改行を含む `APPLE_MUSIC_KEY`（`.p8` の中身）だけは Secret Manager に入れる。**
YAML に改行を書くと崩れやすい。無料枠（6版まで）に収まる。

```bash
gcloud secrets create apple-music-key --data-file=AuthKey_XXXX.p8
```

## 2. 最初のデプロイ

```bash
gcloud run deploy lantern-api --source . --region asia-northeast1 --env-vars-file env.yaml --set-secrets APPLE_MUSIC_KEY=apple-music-key:latest --allow-unauthenticated --cpu 1 --memory 512Mi --cpu-boost --concurrency 8 --max-instances 2 --timeout 60
```

**Render と同じ形**にしてある。gunicorn は `Dockerfile` が1ワーカー・8スレッドで起こす
（`STACK.md`「I/O 待ちが仕事のほぼ全て」）。`--concurrency 8` はスレッド数と合わせたもの。
`--max-instances 2` は費用の頭押さえで、同時に Unsplash のキャッシュの数も2つまでに抑える。
`--cpu-boost` は立ち上がりだけ CPU を増やす（無料枠の消費は立ち上がりの数秒ぶんだけ）。

### 手元で測った起動の中身（2026-10-11・Docker で確認）

| | |
|---|---|
| 器の大きさ | 388MB（`client/` の642MBは `.dockerignore` で外してある） |
| 使うメモリ | 約90MB（512Mi で十分） |
| 起動（読み込み） | **1.55秒**（flask 0.7 / supabase 0.3 / その他） |

`anthropic` の読み込み（0.9〜1.4秒）は**後ろに回した**（`modules/ai.py`）。
最初に開く画面は AI を呼ばないので、眠りから起きた最初の表示がそのぶん早い。

### 古い器を溜めない

器の置き場（Artifact Registry）の無料枠は **0.5GB**。1つの器が388MBなので、
**2版で超える**（超えた分は 1GB あたり月$0.10 なので、溜めても月数円）。
気になったら古い版を消す。

```bash
gcloud artifacts docker images list asia-northeast1-docker.pkg.dev/<プロジェクトID>/cloud-run-source-deploy/lantern-api --include-tags
```

```bash
gcloud artifacts docker images delete <上で出た digest> --delete-tags
```

## 3. 動いているか

```bash
curl -s https://<サービスのURL>/api/health
curl -s https://<サービスのURL>/api/debug/version
```

`/api/health` は `{"ok":true}` だけを返す。**外には何も訊かない**ので、温め直しにも使える。
`/api/debug/version` は Apple に署名を出して確かめるため、定期的に叩くものではない。

## 4. 眠らせない

ゼロまで縮むと、次の最初の一回が 0.5〜2秒遅れる。**10分おきに叩いて起こしておく。**
Cloud Scheduler は3つまで無料。

```bash
gcloud scheduler jobs create http lantern-warm --location asia-northeast1 --schedule "*/10 * * * *" --uri https://<サービスのURL>/api/health --http-method GET
```

## 5. 独自ドメイン（`api.golantern.app`）

**3通りあり、どれも無料。速さが違うので、測って決める。**
Google 純正のロードバランサは月$18なので使わない。

| 方法 | 速さ | 注意 |
|---|---|---|
| Cloud Run のドメイン割り当て | 2023年の実測で**2倍以上遅くなった**例がある（米国経由） | preview 扱い。東京は対応済み |
| Firebase Hosting で受けて中へ流す | Google の配信網の端から入る | 同じプロジェクトに Hosting を足す |
| Cloudflare を前に置く | Cloudflare の東京から入る | Host ヘッダの書き換えが要る（Origin Rules） |

**まず `api2.golantern.app` のような仮の名前で試して、`api.golantern.app` は最後に切り替える。**

```bash
gcloud beta run domain-mappings create --service lantern-api --domain api2.golantern.app --region asia-northeast1
```

出てきた DNS レコードをお名前.com に登録し、`/api/health` を10回ずつ叩いて中央値を比べる。

## 6. push したら自動で入れ替わるように

Cloud Build の引き金を `main` に付ける（`cloudbuild.yaml`）。無料枠は月2,500分。
コンソールの「Cloud Run > 継続的デプロイ」から GitHub の `Pillow-Hiro/Lantern` を選ぶのが早い。

## 7. 予算の見張り

```bash
gcloud billing budgets create --billing-account=<課金アカウントID> --display-name=lantern --budget-amount=1USD --threshold-rule=percent=0.5 --threshold-rule=percent=1.0
```

**アラートは支払いを止めない。**止めるのは `--max-instances` のほう。

## 8. 切り替えと後片付け

1. `api.golantern.app` の DNS を新しい方へ向ける
2. アプリから一通り触る（記録の保存・振り返り・深掘り・連携・購読）
3. 1週間様子を見る
4. Render を解約する（**作者の手で**）
5. `STACK.md` の「インフラと費用」と `PROJECT_MAP.md` を直す

## 選んだ理由（2026-10-11 に13通り調べた）

| | 無料か | 落ちるもの |
|---|---|---|
| **Cloud Run** | この規模なら$0 | 初回0.5〜2秒（温めれば消える）・カード必須 |
| Compute Engine の無料VM | 1台を常時無料 | 外向き通信が月1GBまで・OSと証明書を自分で面倒を見る |
| App Engine F1 | 1日28時間ぶん無料 | メモリ384MB・CPUが弱い（いまが512MBで既にきつい） |
| Render 無料 | 無料・カード不要 | 0.1 CPU（1/10）・15分で寝る |
| Azure Container Apps | 縮む前提の無料枠 | 常時1台だと月$3〜5 |
| AWS Lambda + CloudFront | 永久無料枠内 | Flask を包み直す作業 |
| Oracle の無料VM | 無料 | **7日間CPU20%未満で停止対象**（うちはまさにそれ） |
| Fly.io / Railway / Heroku | × | 無料枠なし・月$1クレジットのみ・廃止 |
| Cloudflare Workers / Supabase Edge Functions | 無料枠は手厚い | **Python が動かない。**21モジュールと1,444件のテストを書き直し |
| Vercel Hobby / Netlify / PythonAnywhere | — | 商用不可・Python非対応・外向き通信が許可リスト制 |

速さの比較では Workers がいちばん速いが、**差が出るのは1日の最初の1回だけで1秒前後。**
うちの待ち時間は Supabase と Anthropic の応答待ち（0.2〜8秒）が中身なので、
書き直しの対価に見合わない（作者「書き直ししたくないし」）。
