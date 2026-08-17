# STACK.md — 技術構成

**役割：「何で動いているか」。** 版・サービス・費用・アカウント。

- なぜそう決めたかは `CLAUDE.md`
- 何を満たすかは `REQUIREMENTS.md`
- どのファイルに何があるかは `PROJECT_MAP.md`
- 今どこにいるかは `HANDOFF.md`

最終更新: 2026-08-13（世代 v2.0 / リリース版数 1.0.0）

版数は `tests/test_docs.py` が実ファイルと照合する。**手で書き換えても、
実装と合っていなければ落ちる。**

---

## 1. 全体像

```
利用者
  ├─ iOS / Android ─┐
  └─ Web（Vercel） ─┴→ Flask API（api.golantern.app / Render）→ Supabase
                                          ├→ Anthropic（AI応答）
                                          ├→ YouTube Data API（任意）
                                          ├→ Twitch API（任意）
                                          └→ Unsplash（起動画面の背景）
```

**同じ `client/` から iOS / Android / Web を出す。** 画面のコードは1つ。
プラットフォーム差は `Platform.OS` の分岐ではなくファイル分割で吸収する
（`photoStore.js` と `photoStore.web.js` の対など）。

写真だけは例外で、**サーバーを通らない**。端末の中で完結する。

---

## 2. フロントエンド

| 項目 | 版 | 備考 |
|---|---|---|
| Expo SDK | 57.0.13 | 2026-06-30 リリース。SDK の寿命は約1年 |
| React Native | 0.86.2 | SDK 57 の指定 |
| React | 19.2.3 | 同上 |
| React Native Web | 0.21.2 | Web 出力 |
| Expo Router | 57.0.13 | ファイルベースのルーティング |
| NativeWind | 4.2.6 | Tailwind の記法を React Native に持ち込む |
| Tailwind CSS | 3.4.19 | NativeWind 4 が v3 系を要求する |
| Node（要件） | 22.13 以上 | SDK 57 の最低要件。手元は 24.16.0 |

規模: 画面 14 / コンポーネント 41 / `lib` 38。

**2026-08-08 に上流の不整合が解けた。** `expo@57.0.11` の想定表が要求する
`expo-sharing@~57.0.10` が公開されず数日止まっていたが、公開されたので
`expo install --fix` で揃えた。

**2026-08-13 にパッチ版8件を上げた**（`expo-doctor` 20/20）。
上げる時機を選んだ理由がある。**版を上げると指紋が変わり、
配信済みのビルドへ OTA が届かなくなる。** 同じ日に
`expo-notifications` を入れて既に指紋が変わっていたので、
**どうせ作り直すビルドに合わせてまとめた。**

このとき `expo export` が `EINVAL readlink` で落ちた。
OneDrive 配下の `node_modules` で起きる既知のもので、
`rm -rf node_modules .expo && npm ci` で直る。
**上げ方の問題ではないので、版は戻していない。**

配布まわりの依存も入れた。

| 追加 | 版 | 目的 |
|---|---|---|
| `expo-splash-screen` | 57.0.6 | ネイティブの起動画面。既定の白だとテーマ切替で点滅する |
| `expo-dev-client` | 57.0.12 | 開発用ビルド。**保存した瞬間に実機へ反映される** |
| `expo-updates` | 57.0.14 | OTA更新。JSだけの修正をビルドせずに配る |

書体も同梱している。読み込みは `client/lib/fonts.js` だけで行う。
どれを何に使うかは `DESIGN.md` と `CLAUDE.md`「デザインシステム」。

| 追加 | 版 | 目的 | 容量 |
|---|---|---|---|
| `expo-font` | ~57.0.1 | 書体の読み込み | — |
| `@expo-google-fonts/noto-sans-jp` | ^0.4.3 | 和文（Regular / Bold） | 10.4MB |
| `@expo-google-fonts/hanken-grotesk` | ^0.4.3 | 欧文のワードマーク（Bold） | 0.06MB |
| `@expo-google-fonts/inter` | ^0.4.2 | ラベル・数字（Medium / SemiBold） | 0.7MB |
| `expo-blur` | ~57.0.2 | **Web** のタブバーのすりガラス | — |
| `expo-notifications` | ~57.0.11 | 毎日のきっかけ。**端末の中だけで予約する** | 2026-08-13 |
| `react-native-webview` | 13.16.1 | 記録の編集画面（`contenteditable`）。**外へ取りに行かない** | 2026-08-15 |
| `expo-document-picker` | ~57.0.1 | 添付の選択。**端末の中だけに複製する** | 2026-08-15 |
| `@radix-ui/react-tabs` | ^1.1.21 | **Web だけ。** expo-router 57.0.13 の Web 側タブが要求する | 2026-08-15 |

**合計 約11MB。**

**ウェイトごとのパスから import すること。** パッケージ名から読むと
index.js が9ウェイト全部を require し、Metro は木揺すりで落とさない。
2026-08-08 にこれで web の書き出しが 114MB になった（フォントだけで111MB）。

**和文の書体は1ウェイトで約5MB ある。** 増やすと比例して増える。
字形を絞る手もあるが、記録アプリでは利用者が何の字を書くか分からないため
**絞ると書いた字が出ない事故になる。** やらない。

`DESIGN.md` が指定する Hanken Grotesk（見出し）と Source Sans 3（本文）は
**和文の字を持たない。** 和文は Noto Sans JP に読み替えている。
理由は `client/lib/fonts.js`。

---

## 3. バックエンド

| 項目 | 版 | 備考 |
|---|---|---|
| Python | 3.14（本番） | `.python-version` で固定。手元は 3.13.3 |
| Flask | 3.1.3 | **API専用。** テンプレートも静的配信も持たない |
| gunicorn | 23.0.0 | `--workers 1 --threads 8 --timeout 60` |
| supabase | 2.31.0 | DB とストレージのクライアント |
| anthropic | 0.109.1 | AI |
| PyJWT[crypto] | 2.13.0 | Supabase JWT の検証（ES256） |
| cryptography | 46.0.4 | 同上 |
| google-api-python-client | 2.189.0 | YouTube |

規模: モジュール 14 / API 36ルール・34パス。

**I/O 待ちが仕事のほぼ全て**（Supabase・Anthropic）なので、
プロセスを増やさずスレッドで捌く。Render の無料枠は 512MB のため
ワーカーを増やすとメモリが厳しい。1プロセスなら
Unsplash のプロセス内キャッシュも1つで済む。

`--timeout 60` は AI の待ち時間（10秒）より長い。
短いと応答を待っている最中にワーカーが落とされる。

---

## 4. インフラと費用

| 用途 | サービス | プラン | 費用 |
|---|---|---|---|
| API | Render | **Starter** | 月 $7 |
| ドメイン | `golantern.app`（お名前.com）。API は `api.golantern.app` | — | 年額はレジストラによる |
| Web | Vercel | Hobby | $0 |
| DB・認証 | Supabase | Free | $0 |
| ビルド | EAS（Expo） | Free | $0 |
| ストア | Apple Developer Program | — | 年 $99 |
| AI | Anthropic API | 従量 | 記録の保存時とボタン押下時のみ |

**Render を Starter にしたのは冷え起動のため。**
無料枠は一定時間で停止し、眠りからの初回が **43.8秒**かかっていた
（温まっていれば 0.2秒）。Lantern は1日1回開く道具なので毎回冷えていた。
プランで解決する問題だったため、他社への移行はしていない。
比較検討の結果は `HANDOFF.md` に残してある。

AI は**定期実行しない**。人が押したときだけ動く。

---

## 5. データの置き場所

| データ | 置き場所 | 提供者が見られるか |
|---|---|---|
| 記録・アイデア | Supabase | **見られる**（`PRIVACY.md` に明記） |
| メール・パスワード | Supabase Auth | パスワードは不可逆 |
| 写真 | **端末の中だけ** | **見られない** |
| 連携トークン | Supabase | 見られる |
| 記録の中身のログ | **残さない** | — |

写真をサーバーから外したのは 2026-08-06。
サーバーの鍵を持つ開発者が中身を見られる状態だったため。
記録テキストの暗号化は未着手で、設計だけがある
（`docs/superpowers/specs/2026-08-06-record-encryption-design.md`）。

---

## 6. AI

| 項目 | 内容 |
|---|---|
| モデル | `claude-sonnet-4-6` |
| タイムアウト | 10秒 |
| 呼ぶ場面 | 記録の保存時・各ボタンの押下時のみ |
| 渡さないもの | 写真 |
| 関数の数 | 15（`modules/ai.py`） |

**問いの50問は AI を使わない。** 固定の文面を日で巡回する。
毎日1回の生成は毎日の課金になるため。

モデルは Claude 5 系が出ており1世代前。上げると**文体が変わる**ので、
AI憲法に照らして出力を読んでから決める。

---

## 7. 検査

| 対象 | 道具 | 件数 |
|---|---|---|
| バックエンド | pytest | 837 |
| `client/lib` の純粋関数 | vitest | 141 |
| ネイティブ設定 | `expo config --type introspect` | — |

**普通のテストのほかに、腐りやすいものを機械で固定している。**

| 検査 | 何を守るか |
|---|---|
| `test_docs.py` | 文書が実装とずれていないか |
| `test_privacy.py` | 記録の中身や資格情報がログに出ないか |
| `test_deploy.py` | 本番が開発サーバーに戻っていないか・依存の固定 |
| `test_account.py` | 退会時の削除漏れと `user_id` の絞り忘れ |
| `test_questions.py` | 50問が AI憲法に違反していないか |
| `test_route_auth.py` | 全ルートに認証がかかっているか |
| `test_react_patterns.py` | 実機でしか露見しない書き方の誤り（描画のたびに作り直されるコンポーネント等） |
| `test_prompts.py` | AIのプロンプトが AI憲法と矛盾していないか |
| `test_ui_words.py` | **画面の文言**が AI憲法の禁止ワードを含んでいないか |
| `test_markdown.py` | 記録の記法が**AIに素通りしていないか**（静的検査つき） |

どれも「気をつける」では守れなかったものを機械に移したもの。
**落ちたらテストではなく、実装か文書の方を直す。**

---

## 8. 開発環境

| 項目 | 内容 |
|---|---|
| OS | Windows 11 |
| リポジトリ | GitHub（Private）。`.git` は `apps/` にある |
| ローカル起動（API） | `python main.py`（gunicorn は Unix 専用） |
| ローカル起動（Web） | `npx expo start --web` |
| Web の書き出し | `npx expo export --platform web` |

**`node_modules` が OneDrive の下にある。** 同期でファイルが欠け、
`EINVAL readlink` や `expo/src/Expo.ts が無い` でビルドが落ちることがある。
`rm -rf node_modules && npm ci` で直る。
EAS のビルドはクラウドで入れ直すため影響しない。

---

## 9. 配り方

| 変えたもの | 手段 | 所要 |
|---|---|---|
| 画面のコード・文言（JSだけ） | `eas update --branch <channel> --environment <env>` | 1〜2分 |
| `app.json`・権限・アイコン・ネイティブ依存 | `eas build` | 15〜20分 |
| 審査に出す | `eas build` → `eas submit` | 上記＋数分 |

開発中は**ビルドしない**。開発用ビルドを1回作り、`npx expo start` に
繋げば保存した瞬間に実機へ反映される。

**`runtimeVersion` は `fingerprint`。** ネイティブの構成から版を計算するため、
依存を足したビルドと足していないビルドが区別される。
`appVersion` にすると、この構成では `version` が 1.0.0 のまま動かないので、
**新しいJSが古いネイティブのビルドに配られて落ちる。**
`tests/test_deploy.py::TestOtaUpdates` が固定している。

### `eas.json` を触ると OTA が届かなくなる

**指紋の計算対象に `eas.json` が入っている。**
ネイティブの中身が1バイトも変わらなくても、`eas.json` を1行足せば
指紋が変わり、**配信済みのビルドは「自分向けではない」と判断して
更新を取りに行かない。**

2026-08-08 に実際に踏んだ。`submit.production.ios.ascAppId` を
追記した状態で `eas update` を流し、ビルド #6 に届かなかった
（`4ff774b0…` に対して更新は `1ccd1600…`）。
配信は成功しているので、**エラーは出ない。届かないだけ。**

流す前に必ず照合する。

```
npx eas-cli fingerprint:compare --build-id <配信先のビルドID>
```

`✅ ... matches ...` が出なければ、その更新は届かない。

**`--environment` は必須。** `--non-interactive` では省略できない。
どの環境変数をバンドルに焼くかが決まらないため。
`production` を渡すと `EXPO_PUBLIC_API_URL` などが `api.golantern.app`
になる。**間違えると、見た目だけのつもりの更新で接続先が変わる。**

### `eas submit` の `ascAppId`

`--non-interactive` で提出するには、App Store Connect のアプリID
（`6798753977`）が `eas.json` の `submit.production.ios.ascAppId` に要る。
コマンドラインのフラグは無い。

**ただし上記の理由で、置きっぱなしにすると OTA が届かなくなる。**
提出のときだけ書き、済んだら消す。次のビルドを作れば指紋は
そのときの `eas.json` で計算され直すので、書いたまま残せる。

**消すときに `git checkout` を使わないこと。** Windows では
CRLF で書き戻され、**改行コードだけで指紋が変わる。**
2026-08-09 に実際に踏んだ（`4ff774b0…` → `a29b0d07…`）。
LF のまま戻すこと。戻したら必ず `fingerprint:compare` で確かめる。

### 指紋はネイティブの追加を捉え損ねることがある

**`expo-glass-effect` を足しても指紋が変わらなかった。**

    build 7  fp=4ff774b0…  (glass あり)
    build 6  fp=4ff774b0…  (glass なし)

`@expo/fingerprint` のソース一覧には `node_modules/expo-glass-effect/ios` が
`expoAutolinkingIos` として入っているのに、ハッシュが同じになる。
**EAS Update はこの2つを区別できない。**

つまり**新しいJSが古いバイナリに配られる**。
読み込んだ時点でネイティブを要求するパッケージを静的 import すると、
画面を描く前に落ちる。関数の中で `require` し、`try/catch` で包むこと。
`tests/test_react_patterns.py::TestNativeOnlyModulesAreLoadedLazily` が
固定している。

---

## 10. 版を上げるときの手順

1. 上げる
2. `pytest` と `vitest` を通す
3. `npx expo-doctor` を通す（フロントの場合）
4. `npx expo export --platform web` が通ることを確認する
5. `requirements.txt` / `package.json` の固定値を書き換える
6. このファイルの表を直す（`test_docs.py` が照合する）

**先に上げてから確認する。** 固定値だけ書き換えて実物を上げ忘れると、
次のデプロイで初めて壊れる。
