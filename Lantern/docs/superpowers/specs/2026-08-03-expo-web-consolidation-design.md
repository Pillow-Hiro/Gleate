# frontend/ の廃止と Expo Web への一本化

作成日: 2026-08-03
対象: `frontend/`（React + Vite）と `mobile/`（Expo）

---

## 目的

**同じものを2回書く状態をやめる。**

写真記録の実装で、`PhotoPicker` も `image.js` も `PhotoLightbox` も Web と mobile に
1つずつ書いた。その結果 mobile 側にだけバグが残った
（`setLogs` が常に append していて同じ日付が重複した）。
Web で直した内容が mobile に反映されていなかったためである。

現在 `date.js` `format.js` `image.js` は「内容が一致していること」を
検証するテストでドリフトを防いでいる。テストで守らなければ壊れる構造そのものを消す。

新機能は増えない。以降のすべての変更が半分の手間になることが成果である。

## スコープ

**含む**: `frontend/` の削除、Expo Web への一本化、レスポンシブなナビゲーション、
テスト基盤の移設、Flask の SPA 配信の削除、ディレクトリのリネーム。

**含まない**: 新機能、UIデザインの刷新、A7（配布・EASビルド）。

---

## 現状

### 画面のパリティはある

| 画面 | frontend/ | mobile/ |
|---|---|---|
| Home | `pages/Home.jsx` | `app/(tabs)/index.jsx` |
| Journal | `pages/Journal.jsx` | `app/(tabs)/journal.jsx` |
| Dashboard | `pages/Dashboard.jsx` | `app/(tabs)/dashboard.jsx` |
| Settings | `pages/Settings.jsx` | `app/(tabs)/settings.jsx` |
| Login | `pages/Login.jsx` | `app/login.jsx` |

写真機能も両方に入っている。移行は作り直しではなく「寄せて消す」作業になる。

### 二重保守しているもの

- `lib/date.js` `lib/format.js` `lib/image.js`（一致検証テストで保護中）
- `ActivityCalendar` `KeywordSection` `LogDetail` `LogItem` `LogSnapshot`
  `PhotoLightbox` `PhotoPicker` `ReviewSection` `SplashScreen` `TimelineSection`

### 差があるもの

| 論点 | frontend/ | mobile/ |
|---|---|---|
| ナビゲーション | サイドバー / ハンバーガー | ボトムタブ固定 |
| テスト | vitest 65件 | 基盤なし |
| グラフ | recharts | react-native-svg（`ViewsChart`） |
| Tailwind | v4（`@tailwindcss/vite`） | v3 + NativeWind |
| YouTube連携 | `window.location.href` で遷移 | `WebBrowser.openAuthSessionAsync` |

---

## 決定事項

| 論点 | 決定 | 理由 |
|---|---|---|
| 一本化の方向 | Expo に寄せる | ネイティブは Expo でしか出せない。Web は react-native-web で出せる |
| ディレクトリ名 | `mobile/` → `client/` | Web も出すのに `mobile` は読み違えの元。Vercel 設定はどのみち一度変えるので最終形に合わせる |
| ナビゲーション | 画面幅で サイドバー / ボトムタブ | 後述 |
| テスト | vitest を `client/` に持ち込む | 純粋関数のテストのみ必要。既に動いている道具を使う |
| Flask の SPA 配信 | 削除 | 配信は Vercel に一本化済み。古いビルドが残り害になっている |
| Vercel の切り替え | 既存プロジェクトの設定変更 | 切り戻しが設定1つ。Vercel の即時ロールバックもある |

---

## ナビゲーション

`useWindowDimensions` で画面幅を見て出し分ける。

| 幅 | 表示 |
|---|---|
| 768px 以上 | サイドバー常時表示 |
| 768px 未満 | ボトムタブ |

ネイティブ（iOS / Android）は実質すべて 768px 未満なのでボトムタブになる。
Web のデスクトップだけがサイドバーになる。

### CLAUDE.md の画面設計を変更する

現行の記述は次のとおり。

| デバイス | 表示 |
|---|---|
| モバイル | ハンバーガーメニュー→ドロワー |
| タブレット | サイドバー常時表示 |
| デスクトップ | サイドバー常時表示 |

**モバイルをハンバーガーからボトムタブに変更する。**
ハンバーガーは目的の画面までタップ2回、タブは1回で着く。
「入力負荷を最小化する — 1分以内に記録できるか」という判断基準に照らすと
タブが素直で、既に mobile 版がその形で動いている。
表示モードを3つ保守する理由も薄い。

`HamburgerMenu.jsx` は移植せず破棄する。

---

## テスト

### `imageMath.js` の切り出し

`lib/image.js` は先頭で `expo-image-manipulator` を import しているため、
素の vitest では読み込めない。純粋関数の部分を別ファイルに出す。

```
client/lib/imageMath.js   ← fitWithin と定数。import なし
client/lib/image.js       ← imageMath を import し、expo API と組み合わせる
```

これは移行のための小細工ではない。現在 `image.js` の中に
`// --- 寸法計算 ---` `// --- ここまで ---` というコメントで手動の境界が引かれており、
それをファイル境界として正式にするだけである。
純粋なロジックとプラットフォーム API が分離され、テストから mock が消える。

### 移設後の構成

| テスト | 件数 | 扱い |
|---|---:|---|
| `date.test.js` | 29 | そのまま移設（`date.js` は import なし） |
| `format.test.js` | 24 | そのまま移設（`format.js` は import なし） |
| `fitWithin` | 11 | `imageMath` を参照する形に変更 |
| ドリフト検証 | 1 | **削除**。二重保守が消え役目を終える |

合計 **64件**。`client/` の devDependencies に vitest を追加する。

### pytest 側

`serve_react` の削除に伴い `tests/test_route_auth.py` の
`PUBLIC_ENDPOINTS` から `serve_react` を外す。公開ルートは4つになる。

---

## YouTube 連携（最も注意が要る箇所）

### サーバー側の変更は不要

`main.py` の `_youtube_redirect_target` は既に両方に対応している。

```python
if platform == "app":
    return f"{_APP_SCHEME_ORIGIN}?youtube={status}"
return f"{_FRONTEND_ORIGIN}/dashboard?youtube={status}"
```

### クライアント側で分岐する

現在 `mobile/app/(tabs)/dashboard.jsx` はネイティブ専用の書き方になっている。

```js
const RETURN_URL = 'lantern://dashboard'
const result = await WebBrowser.openAuthSessionAsync(data.url, RETURN_URL)
```

Expo Web ではスキーム URL は意味を持たない。`Platform.OS` で分岐する。

| プラットフォーム | 認可URL取得 | 遷移 | 戻りの検出 |
|---|---|---|---|
| web | `/api/youtube/auth-url`（platform 指定なし） | `window.location.href` | `?youtube=connected` を読む |
| native | `/api/youtube/auth-url?platform=app` | `WebBrowser.openAuthSessionAsync` | 戻り値の URL を見る |

web 側の実装は `frontend/src/pages/Dashboard.jsx` の既存コードを移植する。

---

## 段取り

**各段階を通過するまで次に進まない。**

1. `mobile/` → `client/` にリネーム
2. レスポンシブなナビゲーションを実装（サイドバー / ボトムタブ）
3. `/insights` → `/journal` のリダイレクトを追加
4. YouTube 連携を `Platform.OS` で分岐
5. テスト移設（vitest 導入・`imageMath` 切り出し・ドリフト検証削除）
6. **ローカルで Expo Web 出力を全画面検証**
7. Vercel 切り替え（ユーザー操作）と本番確認
8. `frontend/` 削除・Flask 整理・ドキュメント更新

6 が通らなければ 7 に進まない。7 が通らなければ 8（削除）に進まない。
`frontend/` の削除を最後に置くのは、6 か 7 で問題が出たときに
設定を戻すだけで現状に復帰できるようにするため。

### Vercel の切り替え（ユーザー操作）

| 項目 | 変更前 | 変更後 |
|---|---|---|
| Root Directory | `Lantern/frontend` | `Lantern/client` |
| Build Command | （既定） | `npx expo export --platform web` |
| Output Directory | `dist` | `dist` |

`frontend/vercel.json` の SPA rewrite は `client/vercel.json` に引き継ぐ。
Root Directory はプロジェクト設定でブランチ単位に切り替えられないため、
この変更は一度の切り替えになる。切り戻しは設定を戻すだけで、
Vercel は過去のデプロイを保持しているため即座にロールバックできる。

---

## 想定リスク

| リスク | 中身 | 備え |
|---|---|---|
| **Tailwind のバージョン差** | frontend は v4、client は v3 + NativeWind。見た目が変わりうる | 段取り6で全画面を目視。差が大きければ移行を止める |
| **YouTube OAuth** | Web 出力で戻り先が壊れる | 段取り4で分岐を実装し、6で実際に連携を通す |
| グラフの見た目 | recharts を捨て `ViewsChart` に一本化 | 数字が正しく出ることを優先。見た目の差は許容する |
| バンドルサイズ | react-native-web を含むため現行 880KB より増える | 実測して記録する。個人利用のため許容範囲は広い |
| リネームによる参照漏れ | `.claude/launch.json`・ドキュメント・Vercel 設定 | 段取り1の直後に全文検索で `mobile/` の残りを確認 |

**Tailwind の差と OAuth の2つが、この移行を止めうる要因である。**
段取り6で潰しきれない場合は、`frontend/` を削除せずに撤退する。

---

## 完了条件

- `frontend/` が存在しない
- `client/` の1つのコードベースから iOS / Android / Web が出る
- Vercel が Expo Web 出力を配信し、全画面が動作する
- YouTube 連携が Web とネイティブの両方で通る
- vitest 64件・pytest 231件がパスする
  （`serve_react` の削除は許可リストの更新だけで、テスト件数は変わらない見込み。
  `REMOVED_PATHS` の404確認はルートが存在しないことで自然に満たされる）
- `lib/*.js` の一致検証テストが不要になり削除されている
- CLAUDE.md のディレクトリ構成・画面設計・ナビゲーションが実態と一致する

---

## 理念チェック（CLAUDE.md 作業前チェックリスト 3）

この変更はユーザーに見える機能を増やさないため、AI憲法に触れる部分はない。
ナビゲーションの変更だけが体験に関わる。

- **入力負荷を最小化する**: ハンバーガー（2タップ）からボトムタブ（1タップ）へ。
  記録に到達するまでの操作が1つ減る
- **数字で評価しない**: 変更なし
- 新規に追加するユーザー向け文言はない（既存の文言をそのまま移す）
