# 課金の配線（App Store Connect ＋ RevenueCat）

**画面を見ながら進める手順書は Artifact にある。** ここは値と順番の記録。

    https://claude.ai/code/artifact/6183f295-1366-42d4-addd-5da6199623ec

## コードが前提にしている値

**変えると動かない。** 管理画面でこのとおりに作ること。

| 何 | 値 | 読んでいる場所 |
|---|---|---|
| Bundle ID | `com.pillowhiro.lantern` | `client/app.json` |
| Entitlement 識別子 | `plus` | （サーバーは状態だけ見る。名前は人間の都合） |
| Offering 識別子 | `default` | `client/lib/purchases.js`（`offerings.current`） |
| Package | **標準の Monthly / Annual** | `client/components/Paywall.jsx` |
| 月額の Product ID | `lantern_plus_monthly` | — |
| 年額の Product ID | `lantern_plus_yearly` | — |
| Webhook の受け口 | `POST /api/billing/revenuecat` | `main.py` |

**Package を独自の名前にしないこと。** `packageType` が `CUSTOM` になり、
`Paywall.jsx` の対応表（`MONTHLY` / `ANNUAL` …）に載らないので
「1か月」「1年」が出なくなる。期間と価格の明示は Apple の審査要件
（3.1.2）なので、そこで落ちる。

## 環境変数

| 名前 | 置き場所 | 秘密か |
|---|---|---|
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | `.env`（ビルドに焼き込む） | **公開前提**（`appl_` で始まる） |
| `REVENUECAT_WEBHOOK_SECRET` | サーバーの環境変数 | **秘密** |

`EXPO_PUBLIC_` は焼き込みなので、入れたら**リビルドが要る**（OTA では届かない）。

`REVENUECAT_WEBHOOK_SECRET` は**署名ではない。** RevenueCat が
`Authorization` ヘッダにそのまま載せてくる文字列と一致を見るだけ
（`modules/billing.py`）。だから**推測されない長さ**にする。
未設定なら受け口ごと閉じる（503）。既定値を持たせない。

## 順番

前が終わっていないと次が必ず失敗する。

1. **有料契約を有効にする**（App Store Connect → ビジネス）
   これが有効になるまで、商品は「販売準備完了」にならない。
   RevenueCat も価格を取れず、サンドボックスの購入テストもできない。
2. サブスクリプション商品を2つ作る（**製品IDは変更も再利用もできない**）
3. App用共有シークレットを発行
4. RevenueCat にアプリを登録（Bundle ID ＋ 共有シークレット）
5. Entitlement `plus` を作り、商品2つを紐づける
6. Offering `default` を作り、**標準の Monthly / Annual** を足す
7. 公開SDKキーを `.env` へ → リビルド
8. Webhook を登録し、同じ文字列をサーバーの環境変数へ
9. **`docs/sql/subscriptions.sql` を流す**
10. サンドボックスで買ってみる

### 9 を最後にする理由

サーバーは**この表が読めないあいだ全員を有料として扱う**
（`modules/plan.py` の「表が無いときは通す」）。
逆にすると、表の作成が遅れただけで**お金を払った人が締め出される**。
ただ乗りされるより悪い。

**ただし公開前には必ず流すこと。** 忘れると全員が有料扱いのまま。

## 通ったことの記録（2026-08-19）

サンドボックスで1回買って、端から端まで動くことを確かめた。

    購入 → RevenueCat がレシート検証 → Webhook
         → サーバーが subscriptions に書き込み

書かれた行:

| 列 | 値 |
|---|---|
| `status` | `active` |
| `product_id` | `lantern_plus_monthly` |
| `expires_at` | 購入の**24時間後** |

**サンドボックスの1か月は24時間だった。** 「5分」と書かれた情報が多いが、
実際はそうならない。切れると `EXPIRATION` が飛んできて `expired` になる。

RevenueCat の Customers に `SANDBOX DATA` と出ていれば本物ではない。
本物なら Apple から領収書のメールが届く。

### 分かりにくかったところ

- **サンドボックスのサインインは、購入ボタンを押した「あと」に出る。**
  押す前の確認画面には、いつもの Apple ID の名前が出る
- 設定に「デベロッパ」の項目が無くてもよい。
  **TestFlight のビルドは必ずサンドボックスで処理される**
- 商品の状態が「提出準備中」のままでもテストできる。
  「販売準備完了」になるのは、アプリのバージョンと一緒に審査を通したあと

---

## 残っているもの

- **小規模事業者プログラム**（手数料 30% → 15%）
- **最初のサブスクリプションの審査。** 商品が「提出準備中」のままなのは
  正常だが、**販売開始にはアプリのバージョンと一緒に審査へ出す**必要がある
- App Store の掲載情報（スクリーンショット・説明文・プライバシー質問票）

特商法の表記は埋め終わった（電話番号・価格とも）。
