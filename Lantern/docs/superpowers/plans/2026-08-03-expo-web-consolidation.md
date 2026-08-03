# Expo Web への一本化 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `frontend/`（React + Vite）を廃止し、1つの Expo コードベースから iOS / Android / Web を出す。

**Architecture:** `mobile/` を `client/` にリネームして唯一のクライアントにする。ナビゲーションは React Navigation の `tabBarPosition` を画面幅で切り替える。プラットフォーム差はファイル分割（`.web.js`）で吸収し、呼び出し側に分岐を持たせない。純粋関数を `imageMath.js` に切り出して vitest でテストする。

**Tech Stack:** Expo SDK 57 / expo-router 57 / React Navigation 7 / NativeWind 4 / vitest / Flask / pytest

**Spec:** `docs/superpowers/specs/2026-08-03-expo-web-consolidation-design.md`

---

## 前提

- 作業前に開発サーバーを止めること。`client/node_modules` を掴んだままだと Windows で `git mv` が失敗する
- 現在の状態: pytest 231件 / vitest 65件（`frontend/`）
- 移行後の目標: pytest 231件 / vitest 62件（`client/`）

```powershell
Get-NetTCPConnection -LocalPort 5173,8081,5000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

---

## ファイル構成

| ファイル | 責務 |
|---|---|
| `client/`（`mobile/` からリネーム） | 唯一のクライアント。iOS / Android / Web |
| `client/lib/imageMath.js`（新規） | 縮小寸法の計算。import を持たない純粋関数 |
| `client/lib/image.js`（変更） | `imageMath` と expo-image-manipulator を組み合わせる |
| `client/lib/youtubeConnect.js`（新規） | ネイティブの認可フロー |
| `client/lib/youtubeConnect.web.js`（新規） | Web の認可フロー |
| `client/app/(tabs)/_layout.jsx`（変更） | 画面幅でサイドバー / ボトムタブを切り替える |
| `client/app/insights.jsx`（新規） | `/journal` へのリダイレクト |
| `client/vitest.config.js`（新規） | `lib/**` の純粋関数だけを対象にする |
| `main.py`（変更） | `serve_react` を削除して API 専用に戻す |
| `frontend/`（削除） | — |

---

## Task 1: `mobile/` を `client/` にリネームする

**Files:**
- Rename: `mobile/` → `client/`
- Modify: `.claude/launch.json`

- [ ] **Step 1: 開発サーバーを止める**

Run:
```powershell
Get-NetTCPConnection -LocalPort 5173,8081,5000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

- [ ] **Step 2: リネームする**

Run:
```bash
git -C "C:/Users/tinot/OneDrive/ドキュメント/apps" mv Lantern/mobile Lantern/client
```

Expected: エラーなし。失敗する場合は Step 1 のプロセスが残っている。

- [ ] **Step 3: 残っている `mobile/` 参照を洗い出す**

Run:
```bash
cd "C:/Users/tinot/OneDrive/ドキュメント/apps/Lantern" && grep -rn "mobile/" --include="*.json" --include="*.md" --include="*.js" --include="*.jsx" --include="*.py" . | grep -v node_modules | grep -v "/dist/" | grep -v "docs/superpowers"
```

Expected: `.claude/launch.json` と `CLAUDE.md` / `PROGRESS.md`、および
`frontend/src/lib/*.test.js` のドリフト検証（Task 3 と Task 9 で消える）が出る。

- [ ] **Step 4: `.claude/launch.json` を書き換える**

`frontend` の Vite ではなく Expo Web を起動する形にする。

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "flask",
      "runtimeExecutable": "python",
      "runtimeArgs": ["main.py"],
      "port": 5000
    },
    {
      "name": "web",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["--prefix", "client", "expo", "start", "--web", "--port", "8081"],
      "port": 8081
    }
  ]
}
```

- [ ] **Step 5: バンドルできることを確認**

Run: `cd Lantern/client && npx expo export --platform web --clear`
Expected: `Exported: dist`

- [ ] **Step 6: 既存のテストが壊れていないことを確認**

`frontend` のドリフト検証は `../../../mobile/lib/...` を見ているため、ここで落ちる。

Run: `cd Lantern/frontend && npm test`
Expected: FAIL 3件（`date` / `format` / `image` のドリフト検証が `mobile/lib` を見つけられない）

これは想定どおり。Task 3 で削除する。

- [ ] **Step 7: コミット**

```bash
git add -A
git commit -m "refactor: mobile/ を client/ にリネームする"
```

---

## Task 2: `imageMath.js` を切り出す

**Files:**
- Create: `client/lib/imageMath.js`
- Modify: `client/lib/image.js`

- [ ] **Step 1: `imageMath.js` を作る**

Create `client/lib/imageMath.js`:

```javascript
// 記録に添える写真の縮小寸法の計算。
//
// このファイルは import を持たない。
// expo-image-manipulator を読み込む image.js から切り離すことで、
// テストがプラットフォームAPIの mock なしで書ける。

export const PHOTO_MAX_EDGE = 1600
export const THUMB_MAX_EDGE = 400
export const PHOTO_QUALITY = 0.8
export const THUMB_QUALITY = 0.7

// 縦横比を保ったまま長辺を maxEdge に収める。元が小さければ拡大しない。
export function fitWithin(width, height, maxEdge) {
  const longest = Math.max(width, height)
  if (longest <= maxEdge) return { width, height }
  const scale = maxEdge / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}
```

- [ ] **Step 2: `image.js` を書き換える**

Replace the whole of `client/lib/image.js`:

```javascript
// 記録に添える写真の圧縮。
// アーカイブが目的ではないため、画質より軽さを優先する。
// 寸法の計算は imageMath.js にある（純粋関数として単体でテストしている）。

import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import {
  fitWithin,
  PHOTO_MAX_EDGE,
  THUMB_MAX_EDGE,
  PHOTO_QUALITY,
  THUMB_QUALITY,
} from './imageMath'

export { fitWithin, PHOTO_MAX_EDGE, THUMB_MAX_EDGE, PHOTO_QUALITY, THUMB_QUALITY }

// SDK 57 では manipulateAsync() が非推奨。
// manipulate() -> resize() -> renderAsync() -> saveAsync() のビルダー型APIを使う。
async function toJpeg(uri, width, height, quality) {
  const context = ImageManipulator.manipulate(uri)
  context.resize({ width, height })
  const rendered = await context.renderAsync()
  const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: quality })
  return result.uri
}

// 本体とサムネイルの2つを作る。
// ImagePicker が asset として uri と元寸法を返すため、それを受け取る。
export async function compressPhoto(uri, originalWidth, originalHeight) {
  const p = fitWithin(originalWidth, originalHeight, PHOTO_MAX_EDGE)
  const t = fitWithin(originalWidth, originalHeight, THUMB_MAX_EDGE)
  const [photo, thumb] = await Promise.all([
    toJpeg(uri, p.width, p.height, PHOTO_QUALITY),
    toJpeg(uri, t.width, t.height, THUMB_QUALITY),
  ])
  return { photo, thumb }
}
```

`fitWithin` などを再 export しているのは、`PhotoPicker.jsx` が
`import { compressPhoto } from '../lib/image'` のままで動くようにするため。

- [ ] **Step 3: バンドルできることを確認**

Run: `cd Lantern/client && npx expo export --platform web --clear`
Expected: `Exported: dist`

- [ ] **Step 4: コミット**

```bash
git add Lantern/client/lib/imageMath.js Lantern/client/lib/image.js
git commit -m "refactor: 写真の寸法計算を imageMath.js に切り出す"
```

---

## Task 3: vitest を `client/` に導入してテストを移設する

**Files:**
- Create: `client/vitest.config.js`
- Create: `client/lib/date.test.js`, `client/lib/format.test.js`, `client/lib/imageMath.test.js`
- Modify: `client/package.json`

- [ ] **Step 1: vitest を入れる**

Run: `cd Lantern/client && npm install -D vitest`

`npx expo install` ではなく `npm install -D` を使う。
vitest は Expo のランタイムに載らない開発ツールのため、SDK のバージョン整合の対象外。

- [ ] **Step 2: `package.json` に test スクリプトを足す**

`client/package.json` の `scripts` に追加:

```json
"test": "vitest run"
```

- [ ] **Step 3: `vitest.config.js` を作る**

Create `client/vitest.config.js`:

```javascript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // lib/ の純粋関数だけを対象にする。
    // app/ と components/ は React Native のコンポーネントで、
    // vitest では解決できない（テストするなら jest-expo が要る）。
    // dist/ を拾わないよう include を明示している。
    include: ['lib/**/*.test.js'],
  },
})
```

- [ ] **Step 4: `date.test.js` と `format.test.js` を移設する**

`frontend/src/lib/date.test.js` と `frontend/src/lib/format.test.js` を
`client/lib/` にコピーする。`date.js` / `format.js` は
frontend と client でバイト単位で同一のため、テスト本体の変更は不要。

**ただし各ファイル末尾のドリフト検証 describe ブロックを削除すること。**
二重保守が消えるため役目を終えている。

削除する対象（`format.test.js` の例。`date.test.js` も同じ形）:

```javascript
describe('frontend と mobile の format.js', () => {
  it('内容が完全に一致している', () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const read = (p) => readFileSync(resolve(here, p), 'utf8').replace(/\r\n/g, '\n')
    expect(read('./format.js')).toBe(read('../../../mobile/lib/format.js'))
  })
})
```

不要になった `node:fs` / `node:url` / `node:path` の import 行も消すこと。

- [ ] **Step 5: `imageMath.test.js` を作る**

Create `client/lib/imageMath.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import { fitWithin, PHOTO_MAX_EDGE, THUMB_MAX_EDGE } from './imageMath'

describe('fitWithin', () => {
  it('横長は幅が上限になる', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 })
  })

  it('縦長は高さが上限になる', () => {
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 })
  })

  it('正方形は両辺が上限になる', () => {
    expect(fitWithin(2000, 2000, 1600)).toEqual({ width: 1600, height: 1600 })
  })

  it('上限より小さい画像は拡大しない', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })

  it('ちょうど上限ならそのまま', () => {
    expect(fitWithin(1600, 900, 1600)).toEqual({ width: 1600, height: 900 })
  })

  it('整数に丸める', () => {
    const { width, height } = fitWithin(1000, 333, 500)
    expect(Number.isInteger(width)).toBe(true)
    expect(Number.isInteger(height)).toBe(true)
  })

  it('丸めても0にならない', () => {
    // 極端な縦横比でも 0px にすると canvas や ImageManipulator が例外を投げる
    expect(fitWithin(10000, 5, 1600).height).toBeGreaterThanOrEqual(1)
  })

  it('上限の定数', () => {
    expect(PHOTO_MAX_EDGE).toBe(1600)
    expect(THUMB_MAX_EDGE).toBe(400)
  })

  it('幅と高さが入れ替わっても対称に動く', () => {
    const a = fitWithin(4000, 3000, 1600)
    const b = fitWithin(3000, 4000, 1600)
    expect(a.width).toBe(b.height)
    expect(a.height).toBe(b.width)
  })

  it('縦横比を保つ', () => {
    const { width, height } = fitWithin(4000, 3000, 1600)
    expect(width / height).toBeCloseTo(4000 / 3000, 2)
  })

  it('maxEdge が元より大きければ何もしない', () => {
    expect(fitWithin(100, 50, 99999)).toEqual({ width: 100, height: 50 })
  })
})
```

- [ ] **Step 6: テストを実行する**

Run: `cd Lantern/client && npm test`
Expected: PASS 62件（date 28 / format 23 / imageMath 11）

件数が合わない場合は、ドリフト検証の削除漏れか、コピー漏れがある。

- [ ] **Step 7: コミット**

```bash
git add Lantern/client/vitest.config.js Lantern/client/package.json Lantern/client/package-lock.json Lantern/client/lib
git commit -m "test: vitest を client/ に移設し、ドリフト検証を削除する"
```

---

## Task 4: 画面幅でサイドバーとボトムタブを切り替える

**Files:**
- Modify: `client/app/(tabs)/_layout.jsx`

- [ ] **Step 1: 実装する**

Replace the whole of `client/app/(tabs)/_layout.jsx`:

```jsx
import { Tabs } from 'expo-router'
import { useWindowDimensions } from 'react-native'
import { useColorScheme } from 'nativewind'

// タブ項目は4つ。「振り返り」はJournal内のタブへ統合したためここには置かない。
//
// 画面が広いときはサイドバー、狭いときはボトムタブにする。
// React Navigation 7 の bottom-tabs は tabBarPosition に left を渡すと
// サイドバーとして描画する（公式ドキュメントが大画面向けの用途として挙げている）。
// 自前でサイドバーを組むと保守対象が増えるため、この仕組みに乗る。
const WIDE_SCREEN_MIN_WIDTH = 768

const THEME = {
  light: { bg: '#faf9f7', border: 'rgba(0,0,0,0.08)', active: '#2d4a3e', inactive: '#999999' },
  dark: { bg: '#1c1c1e', border: 'rgba(255,255,255,0.10)', active: '#5fa882', inactive: '#636366' },
}

export default function TabsLayout() {
  const { colorScheme } = useColorScheme()
  const { width } = useWindowDimensions()
  const c = THEME[colorScheme === 'dark' ? 'dark' : 'light']
  const isWide = width >= WIDE_SCREEN_MIN_WIDTH

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: isWide ? 'left' : 'bottom',
        tabBarActiveTintColor: c.active,
        tabBarInactiveTintColor: c.inactive,
        tabBarStyle: {
          backgroundColor: c.bg,
          // サイドバーのときは右側、ボトムタブのときは上側に線を引く
          borderTopColor: c.border,
          borderRightColor: c.border,
        },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: '今日' }} />
      <Tabs.Screen name="journal" options={{ title: '記録' }} />
      <Tabs.Screen name="dashboard" options={{ title: 'ダッシュボード' }} />
      <Tabs.Screen name="settings" options={{ title: '設定' }} />
    </Tabs>
  )
}
```

- [ ] **Step 2: バンドルできることを確認**

Run: `cd Lantern/client && npx expo export --platform web --clear`
Expected: `Exported: dist`

- [ ] **Step 3: 実際の切り替わりを目視する**

Run: `cd Lantern/client && npx expo start --web --port 8081`

ブラウザで開き、ウィンドウ幅を 768px の前後で変える。

- 広いとき: ナビゲーションが左側に縦に並ぶ
- 狭いとき: ナビゲーションが下部に横に並ぶ

`tabBarPosition` が期待どおり効かない場合は、この場で止めて報告する。
`tabBar` プロップで自作する案に切り替える判断が要る。

- [ ] **Step 4: コミット**

```bash
git add "Lantern/client/app/(tabs)/_layout.jsx"
git commit -m "feat: 画面幅でサイドバーとボトムタブを切り替える"
```

---

## Task 5: `/insights` を `/journal` にリダイレクトする

**Files:**
- Create: `client/app/insights.jsx`

- [ ] **Step 1: 実装する**

Create `client/app/insights.jsx`:

```jsx
import { Redirect } from 'expo-router'

// Insights は 2026-07-30 に Journal の振り返りタブへ統合した。
// 旧URLをブックマークしている場合に備えて残している。
export default function InsightsRedirect() {
  return <Redirect href="/journal" />
}
```

- [ ] **Step 2: バンドルできることを確認**

Run: `cd Lantern/client && npx expo export --platform web --clear`
Expected: `Exported: dist`

- [ ] **Step 3: コミット**

```bash
git add Lantern/client/app/insights.jsx
git commit -m "feat: /insights から /journal へのリダイレクトを追加する"
```

---

## Task 6: YouTube 連携をプラットフォームで分割する

**Files:**
- Create: `client/lib/youtubeConnect.js`, `client/lib/youtubeConnect.web.js`
- Modify: `client/app/(tabs)/dashboard.jsx`

- [ ] **Step 1: ネイティブ版を作る**

Create `client/lib/youtubeConnect.js`:

```javascript
// YouTube 連携の認可フロー（ネイティブ）。
// Web 版は youtubeConnect.web.js にある。Metro がプラットフォームで選ぶため、
// 呼び出し側は分岐を持たない（lib/exportLogs.js と同じ作り）。

import * as WebBrowser from 'expo-web-browser'
import { authFetch } from './supabase'

// app.json の scheme と一致させること。バックエンドの _APP_SCHEME_ORIGIN と対になる。
const RETURN_URL = 'lantern://dashboard'

// 認可フローを開始する。
// 戻り値: 'connected' | 'failed' | 'cancelled'
export async function startConnect() {
  const res = await authFetch('/api/youtube/auth-url?platform=app')
  const data = await res.json()
  if (!data.url) throw new Error('no auth url')

  const result = await WebBrowser.openAuthSessionAsync(data.url, RETURN_URL)
  if (result.type !== 'success') return 'cancelled'
  return result.url?.includes('youtube=connected') ? 'connected' : 'failed'
}

// 画面を開いた時点で「連携から戻ってきた直後」かを判定する。
// ネイティブは startConnect の戻り値で分かるため常に null。
export function readConnectResult() {
  return null
}

// 戻り直後の印を消す。ネイティブでは何もしない。
export function clearConnectResult() {}
```

- [ ] **Step 2: Web 版を作る**

Create `client/lib/youtubeConnect.web.js`:

```javascript
// YouTube 連携の認可フロー（Web）。
// ネイティブ版は youtubeConnect.js にある。
// スキームURL（lantern://）は Web では意味を持たないため、
// バックエンドが _FRONTEND_ORIGIN へリダイレクトしてくるのを受ける。

import { authFetch } from './supabase'

// 認可フローを開始する。ページ遷移するため呼び出し元には戻らない。
// 戻り値: 'redirecting'
export async function startConnect() {
  // platform を指定しないと、バックエンドは Web 向けの戻り先を使う
  const res = await authFetch('/api/youtube/auth-url')
  const data = await res.json()
  if (!data.url) throw new Error('no auth url')
  window.location.href = data.url
  return 'redirecting'
}

// 連携から戻ってきた直後かを URL のクエリで判定する。副作用は持たない。
// 戻り値: 'connected' | null
export function readConnectResult() {
  return new URLSearchParams(window.location.search).get('youtube') === 'connected'
    ? 'connected'
    : null
}

// クエリを消す。残すとリロードのたびに接続完了扱いになる。
export function clearConnectResult() {
  window.history.replaceState({}, '', '/dashboard')
}
```

- [ ] **Step 3: `dashboard.jsx` の import を差し替える**

`client/app/(tabs)/dashboard.jsx` の先頭から `expo-web-browser` の import を消し、
代わりに `youtubeConnect` を読む。

削除する行:

```javascript
import * as WebBrowser from 'expo-web-browser'
```

追加する行（`authFetch` の import の下）:

```javascript
import { startConnect, readConnectResult, clearConnectResult } from '../../lib/youtubeConnect'
```

`RETURN_URL` の定数定義も削除する（`youtubeConnect.js` へ移動済み）:

```javascript
// app.json の scheme と一致させること。バックエンドの _APP_SCHEME_ORIGIN と対になる。
const RETURN_URL = 'lantern://dashboard'
```

- [ ] **Step 4: 戻り直後の検出を追加する**

`const [message, setMessage] = useState('')` を次に置き換える:

```javascript
  // 連携から戻った直後かは URL で決まるため初期値として導出する。
  // useEffect の中で setState すると余分な再レンダリングが起きる。
  const [message, setMessage] = useState(
    () => (readConnectResult() === 'connected' ? 'YouTubeと繋がりました。' : '')
  )
```

`useEffect(() => { loadAll() }, [loadAll])` を次に置き換える:

```javascript
  useEffect(() => {
    // クエリを残すとリロードのたびに接続完了扱いになる
    if (readConnectResult() === 'connected') clearConnectResult()
    loadAll()
  }, [loadAll])
```

- [ ] **Step 5: `handleConnect` を書き換える**

`handleConnect` の中身を次に置き換える:

```javascript
  async function handleConnect() {
    setConnecting(true)
    try {
      const result = await startConnect()
      if (result === 'connected') {
        setMessage('YouTubeと繋がりました。')
        setTimeout(() => setMessage(''), 4000)
        await loadAll()
      } else if (result === 'failed') {
        setMessage('連携できませんでした。')
        setTimeout(() => setMessage(''), 4000)
      }
      // 'cancelled' はユーザーが閉じただけ。'redirecting' は Web の遷移中
    } catch (e) {
      console.warn('[Dashboard] YouTube連携に失敗', e)
      setMessage('連携できませんでした。')
      setTimeout(() => setMessage(''), 4000)
    } finally {
      setConnecting(false)
    }
  }
```

- [ ] **Step 6: Web バンドルに expo-web-browser が入っていないことを確認**

Run:
```bash
cd Lantern/client && npx expo export --platform web --clear && grep -c "openAuthSessionAsync" dist/_expo/static/js/web/*.js
```

Expected: `0`

1以上なら Web バンドルにネイティブ専用コードが混ざっている。
`.web.js` が選ばれていないので、ファイル名を確認する。

- [ ] **Step 7: コミット**

```bash
git add Lantern/client/lib/youtubeConnect.js Lantern/client/lib/youtubeConnect.web.js "Lantern/client/app/(tabs)/dashboard.jsx"
git commit -m "refactor: YouTube連携をプラットフォームで分割する"
```

---

## Task 7: ローカルで Expo Web 出力を検証する

**Files:** なし（検証のみ）

**この Task が通らなければ Task 8 に進まない。**

- [ ] **Step 1: Flask と Expo Web を起動する**

```bash
cd Lantern && python main.py
```

```bash
cd Lantern/client && npx expo start --web --port 8081
```

Flask の CORS は `http://localhost:8081` を既に許可している（`main.py:43`）。

- [ ] **Step 2: 全画面を目視する**

各項目を OK / NG で記録する。NG があれば止めて報告する。

| 確認項目 |
|---|
| ログインできる |
| Home: 今日の灯り・記録フォーム・今週の発見が出る |
| Home: 写真を選んでプレビューが出る |
| Journal: カレンダー・記録一覧・検索が動く |
| Journal: 記録モーダルで写真を添付できる |
| Journal: 一覧にサムネイルが出る |
| Journal: 振り返りタブ（今週・今月・過去との対話・キーワード）が出る |
| 添付写真をタップして拡大表示できる |
| Dashboard: 数字とグラフが出る |
| Settings: テーマ切替・エクスポートが動く |
| 幅768px以上でサイドバー、未満でボトムタブになる |
| `/insights` を開くと `/journal` に飛ぶ |

- [ ] **Step 3: 見た目の差を記録する**

`frontend`（Tailwind v4）と `client`（Tailwind v3 + NativeWind）で
見た目が変わる可能性がある。**これは移行を止めうる要因**。

比較のため、必要なら旧 Web を並べて起動する:

```bash
cd Lantern/frontend && npm run dev
```

差が受け入れられない水準なら、ここで止めて報告する。
`frontend/` はまだ削除していないため、撤退できる。

- [ ] **Step 4: YouTube 連携を実際に通す**

Web で「YouTubeと繋ぐ」を押し、Google の認可画面から戻ってくることを確認する。

- 戻り先が `/dashboard?youtube=connected` になる
- 「YouTubeと繋がりました。」が出る
- リロードしてもメッセージが再表示されない（クエリが消えている）

**これが通らなければ Task 8 に進まない。**

- [ ] **Step 5: バンドルサイズを記録する**

Run: `cd Lantern/client && npx expo export --platform web --clear`

出力される JS のサイズを控える。現行 `frontend` は 880KB（gzip 250KB）。
増加は想定内だが、実測値を Task 9 のドキュメント更新で残す。

---

## Task 8: Vercel を切り替える（ユーザー操作）

**Files:**
- Create: `client/vercel.json`

**この Task が通らなければ Task 9 に進まない。**

- [ ] **Step 1: `vercel.json` を移す**

Create `client/vercel.json`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

- [ ] **Step 2: コミットして push する**

```bash
git add Lantern/client/vercel.json
git commit -m "chore: Expo Web 用の vercel.json を追加する"
git push
```

- [ ] **Step 3: ユーザーに Vercel の設定変更を依頼する**

以下をユーザーに提示し、完了の返答を待つ。

| 項目 | 変更前 | 変更後 |
|---|---|---|
| Root Directory | `Lantern/frontend` | `Lantern/client` |
| Build Command | （既定） | `npx expo export --platform web` |
| Output Directory | `dist` | `dist` |

切り戻しは設定を戻すだけ。Vercel は過去のデプロイを保持しているため
即座にロールバックできる。

- [ ] **Step 4: 本番を確認する**

`https://lantern-inky-three.vercel.app` をブラウザで開く。
curl は bot 保護（403）に当たるため使わない。

- ログイン画面が出る
- Task 7 Step 2 の主要項目が本番でも動く
- YouTube 連携が本番のドメインで通る

NG があれば Vercel の設定を戻して報告する。

---

## Task 9: `frontend/` を削除して後片付けする

**Files:**
- Delete: `frontend/`, `static/`
- Modify: `main.py`, `tests/test_route_auth.py`, `CLAUDE.md`, `PROGRESS.md`

**Task 8 が通ってから着手する。**

- [ ] **Step 1: 認証テストの許可リストを更新する**

`tests/test_route_auth.py` の `PUBLIC_ENDPOINTS` から `serve_react` の行を削除する。

削除する行:

```python
    "serve_react": "SPAのindex.html・静的ファイル配信。ユーザーデータを返さない",
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `cd Lantern && python -m pytest tests/test_route_auth.py -q`
Expected: FAIL — `増えた: ['serve_react']`（まだ実装が残っているため）

- [ ] **Step 3: `serve_react` を削除する**

`main.py` の末尾にある `serve_react` の route デコレータと関数、
および `STATIC_DIR` の定義を削除する。

削除する定義（`main.py:46` 付近）:

```python
STATIC_DIR = os.path.join(os.path.dirname(__file__), 'static', 'dist')
```

削除する関数（`main.py` 末尾）:

```python
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    ...
```

`send_from_directory` と `abort` が他で使われていなければ、
`main.py:4` の import からも外す。

Run: `cd Lantern && grep -n "send_from_directory\|abort(" main.py`
使われていなければ import 行を整理する。

- [ ] **Step 4: テストが通ることを確認**

Run: `cd Lantern && python -m pytest -q`
Expected: PASS 231件

公開ルートは `static` / `debug_version` / `splash_content_api` / `youtube_callback` の4つになる。

- [ ] **Step 5: `frontend/` と `static/` を削除する**

```bash
git rm -r --quiet Lantern/frontend Lantern/static
```

`static/` には写真機能の入っていない古いビルドが残っている。
配信は Vercel に一本化されたため不要。

- [ ] **Step 6: `CLAUDE.md` を更新する**

3箇所を直す。

技術スタックの表の「フロントエンド」を変更:

```markdown
| フロントエンド | Expo（React Native / React Native Web） |
```

ディレクトリ構成を差し替え:

```
Lantern/                      ← .git はさらに1つ上の apps/ にある
├── CLAUDE.md
├── .env                     ← APIキー（GitHubに上げない）
├── main.py                  ← Flaskアプリ（APIのみ・ルートは全てここ）
├── modules/
│   ├── ai.py                ← AI応答・プロンプト処理
│   ├── logs.py              ← ログの読み書き・Supabaseカラム変換
│   ├── auth.py              ← require_auth（Supabase JWT検証）
│   ├── photos.py            ← 写真のStorage操作
│   ├── timeutil.py          ← 日付の判定（JST基準）
│   └── youtube.py           ← YouTube OAuth・API
├── tests/                   ← pytest
└── client/                  ← Expo。iOS / Android / Web をここから出す
    ├── app/                 ← expo-router（(tabs)/ と login / insights）
    ├── components/
    └── lib/                 ← date / format / imageMath / supabase など
```

ナビゲーションの表を差し替え:

```markdown
| デバイス | 表示 |
|---|---|
| モバイル（幅768px未満） | ボトムタブ |
| タブレット・デスクトップ（幅768px以上） | サイドバー（左側のタブバー） |

ハンバーガーメニューは 2026-08-03 に廃止した。
目的の画面までタップ2回かかるため、1回で着くタブに寄せた。
実装は React Navigation の `tabBarPosition` を画面幅で切り替えるだけで、
サイドバーを自作していない。
```

- [ ] **Step 7: `PROGRESS.md` に節を追加する**

`## 進行中` の直前に次の節を挿入する。`<>` の箇所は実測値で埋める。

```markdown
### 2026/08/03（frontend/ の廃止と Expo Web への一本化）

設計は `docs/superpowers/specs/2026-08-03-expo-web-consolidation-design.md`、
計画は `docs/superpowers/plans/2026-08-03-expo-web-consolidation.md`。

**動機**

写真記録で PhotoPicker・image.js・PhotoLightbox を Web と mobile に
1つずつ書き、mobile 側にだけバグが残った（setLogs が常に append していた）。
date.js / format.js / image.js は一致検証テストでドリフトを防いでいたが、
テストで守らなければ壊れる構造そのものを消した。

**やったこと**

- [x] `mobile/` を `client/` にリネーム（Web も出すため名前が実態と合わなくなっていた）
- [x] 写真の寸法計算を `lib/imageMath.js` に切り出し、純粋関数とプラットフォームAPIを分離
- [x] vitest を `client/` に移設。一致検証テスト3件を削除（65件 → 62件）
- [x] ナビゲーションを画面幅で切り替え（768px以上はサイドバー）。
      React Navigation の `tabBarPosition: 'left'` に乗せ、サイドバーは自作していない
- [x] ハンバーガーメニューを廃止（タップ2回 → 1回）
- [x] YouTube連携を `lib/youtubeConnect.js` / `.web.js` に分割。
      呼び出し側は分岐を持たない（`lib/exportLogs.js` と同じ作り）
- [x] `/insights` → `/journal` のリダイレクトを維持
- [x] Flask の `serve_react` と `static/` を削除。API専用に戻した
- [x] `frontend/` を削除

**検証結果: OK**

- pytest 231件パス / vitest 62件パス
- Expo Web 出力で全画面を目視確認（ログイン・記録・写真・振り返り・Dashboard・設定）
- YouTube連携を Web の本番ドメインで実際に通した
- 幅768pxの前後でサイドバーとボトムタブが切り替わることを確認

**バンドルサイズ**

| | 変更前（Vite） | 変更後（Expo Web） |
|---|---|---|
| JS | 880KB（gzip 250KB） | <実測値> |

react-native-web を含むため増加する。個人利用のため許容した。

**失われたもの**

デスクトップのサイドバーから、ロゴ・タグライン・バージョン表記・
テーマ切替ボタンが消えた。`tabBarPosition` が描くのはナビゲーション項目だけのため。
テーマ切替は Settings 画面に同じものがある。
維持のためにカスタムタブバーを自作すると、一本化で減らした保守対象が戻るため受け入れた。
```

- [ ] **Step 8: 全体を確認する**

```bash
cd Lantern && python -m pytest -q
cd client && npm test && npx expo export --platform web --clear
```

Expected: pytest 231件 / vitest 62件 / `Exported: dist`

- [ ] **Step 9: `mobile` と `frontend` への参照が残っていないことを確認**

Run:
```bash
cd "C:/Users/tinot/OneDrive/ドキュメント/apps/Lantern" && grep -rn "frontend/\|mobile/" --include="*.json" --include="*.md" --include="*.py" --include="*.js" --include="*.jsx" . | grep -v node_modules | grep -v "/dist/" | grep -v "docs/superpowers" | grep -v PROGRESS.md
```

Expected: 出力なし（`docs/superpowers/` と `PROGRESS.md` は履歴として残ってよい）

- [ ] **Step 10: コミット**

```bash
git add -A
git commit -m "refactor: frontend/ を削除し Expo Web に一本化する"
```

---

## 完了条件

- `frontend/` と `static/` が存在しない
- `client/` の1つのコードベースから iOS / Android / Web が出る
- Vercel が Expo Web 出力を配信し、全画面が動作する
- YouTube 連携が Web とネイティブの両方で通る
- pytest 231件 / vitest 62件がパスする
- 一致検証テストが3件とも削除されている
- CLAUDE.md のディレクトリ構成・技術スタック・ナビゲーションが実態と一致する

## 撤退条件

Task 7 で以下のいずれかに当たった場合、`frontend/` を削除せずに止める。

- Tailwind のバージョン差による見た目の劣化が受け入れられない
- YouTube 連携が Web で通らない
- `tabBarPosition: 'left'` が期待どおり動かず、自作が必要と判明した

いずれも `frontend/` が残っている段階なので、Vercel の設定を戻すだけで現状に復帰できる。
