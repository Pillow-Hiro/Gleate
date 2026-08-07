# STACK.md — 技術構成

**役割：「何で動いているか」。** 版・サービス・費用・アカウント。

- なぜそう決めたかは `CLAUDE.md`
- 何を満たすかは `REQUIREMENTS.md`
- どのファイルに何があるかは `PROJECT_MAP.md`
- 今どこにいるかは `HANDOFF.md`

最終更新: 2026-08-07（世代 v2.0 / リリース版数 1.0.0）

版数は `tests/test_docs.py` が実ファイルと照合する。**手で書き換えても、
実装と合っていなければ落ちる。**

---

## 1. 全体像

```
利用者
  ├─ iOS / Android ─┐
  └─ Web（Vercel） ─┴→ Flask API（Render）→ Supabase（DB・認証）
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
| Expo SDK | 57.0.10 | 2026-06-30 リリース。SDK の寿命は約1年 |
| React Native | 0.86.2 | SDK 57 の指定 |
| React | 19.2.3 | 同上 |
| React Native Web | 0.21.2 | Web 出力 |
| Expo Router | 57.0.10 | ファイルベースのルーティング |
| NativeWind | 4.2.6 | Tailwind の記法を React Native に持ち込む |
| Tailwind CSS | 3.4.19 | NativeWind 4 が v3 系を要求する |
| Node（要件） | 22.13 以上 | SDK 57 の最低要件。手元は 24.16.0 |

規模: 画面 8 / コンポーネント 22 / `lib` 15。

**Expo の追随は上流の不整合で止まっている。** `expo@57.0.11` の想定表が
未公開の `expo-sharing@~57.0.10` を要求するため `expo install --fix` が通らない。
検証済みの 57.0.10 に留めている。

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

規模: モジュール 10 / API 33ルール・31パス。

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
| ドメイン | `golantern.app`（2026-08-07 決定） | — | 年額はレジストラによる |
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
| バックエンド | pytest | 621 |
| `client/lib` の純粋関数 | vitest | 82 |
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

## 9. 版を上げるときの手順

1. 上げる
2. `pytest` と `vitest` を通す
3. `npx expo-doctor` を通す（フロントの場合）
4. `npx expo export --platform web` が通ることを確認する
5. `requirements.txt` / `package.json` の固定値を書き換える
6. このファイルの表を直す（`test_docs.py` が照合する）

**先に上げてから確認する。** 固定値だけ書き換えて実物を上げ忘れると、
次のデプロイで初めて壊れる。
