// 画面のコードが**読めるか**と、**無い名前を呼んでいないか**だけを見る。
// 速さが取り柄。
//
// ## なぜ要るのか（2026-09-03）
//
// `journal.jsx` の三項演算子の中に `{/* … */}` を置いてしまい、
// **配信の直前で初めて分かった。**`eas update` は束ね直しの途中で
// 落ちるので、気づくまでに82秒かかる。
//
// pytest も vitest も通っていた。vitest が見ているのは `lib/` の
// 純粋関数だけで、**画面のファイルは1行も読まれていない**
// （`tests/test_react_patterns.py` の冒頭に理由がある）。
// lint も入っていない。つまり**構文を見る場所がどこにも無かった。**
//
// ## 無い名前も見る（2026-09-04）
//
// 作者から「Lanternの回答がなかった」。
//
// `RecordForm` から3つの欄を消したとき、**状態は消したのに
// `handleSave` の中の呼び出しを残していた**（`setOpenFields(new Set())`）。
// 構文としては正しいので、ここは通っていた。
//
// 実際には保存の途中で `ReferenceError` になり、`catch` が飲み込んで、
// **その先の `requestLight` に届かなかった。** 記録は残るが灯りは来ない。
// 画面には「保存に失敗しました」とだけ出て、原因は何も分からない。
//
// 構文の次に多いのがこれ——**消した名前の呼び出しが残る。**
// 見るのは「その名前がどこにも定義されていない」ことだけ。
// 型も、値の流れも見ない。それでこの種の事故は捕まる。
//
//     npm run check
//
// 配信の前に必ず通すこと。数秒で終わる。

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { parse } from '@babel/parser'
import _traverse from '@babel/traverse'

// CommonJS の既定書き出しを ESM から呼ぶときの受け取り方
const traverse = _traverse.default || _traverse

const CLIENT = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const DIRS = ['app', 'components', 'lib', 'modules']

// **ここに無い名前は「無い名前」として報せる。**
//
// 増やすときは、**本当にどこでも使える名前か**を確かめること。
// 迷ったら足さない。誤って報せる方が、見逃すより安い。
const GLOBALS = new Set([
  // 言語
  'globalThis', 'undefined', 'NaN', 'Infinity',
  'Object', 'Array', 'String', 'Number', 'Boolean', 'Symbol', 'BigInt',
  'Math', 'JSON', 'Date', 'RegExp', 'Error', 'TypeError', 'RangeError',
  'Map', 'Set', 'WeakMap', 'WeakSet', 'Promise', 'Proxy', 'Reflect',
  'Intl', 'ArrayBuffer', 'Uint8Array', 'DataView',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent',
  'decodeURIComponent', 'encodeURI', 'decodeURI', 'structuredClone',
  // 実行環境（React Native / Web どちらでも居る）
  'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'requestAnimationFrame', 'cancelAnimationFrame', 'queueMicrotask',
  'fetch', 'Headers', 'Request', 'Response', 'FormData', 'Blob', 'File',
  'FileReader', 'URL', 'URLSearchParams', 'AbortController', 'TextEncoder',
  'TextDecoder', 'atob', 'btoa', 'crypto', 'performance',
  'process', 'global', '__DEV__', 'require', 'module', 'exports',
  // Web だけ（`.web.jsx` と `lib/*.web.js` が触る）
  'window', 'document', 'navigator', 'localStorage', 'sessionStorage',
  'location', 'history', 'alert', 'Image', 'Event', 'CustomEvent',
  'MutationObserver', 'IntersectionObserver', 'getComputedStyle',
])

// `node_modules` には入らない。見るのは自分で書いたものだけ
function collect(dir, out = []) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const name of entries) {
    if (name === 'node_modules') continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      collect(full, out)
    } else if (/\.(jsx?|mjs)$/.test(name)) {
      out.push(full)
    }
  }
  return out
}

const files = DIRS.flatMap((d) => collect(join(CLIENT, d)))
const broken = []
const undefined_ = []

for (const file of files) {
  let ast
  try {
    ast = parse(readFileSync(file, 'utf8'), {
      sourceType: 'module',
      // 画面は JSX。`lib/` は素の JS だが、混ぜて困ることはない
      plugins: ['jsx'],
    })
  } catch (e) {
    broken.push({ file: relative(CLIENT, file), message: e.message })
    continue
  }

  // **どこにも束縛の無い名前を拾う。**
  //
  // `path.scope.getBinding` が無く、グローバルにも無いものだけ。
  // 同じ名前を何度呼んでいても1回だけ報せる（同じ直しで全部消える）。
  const seen = new Set()
  try {
    traverse(ast, {
      ReferencedIdentifier(path) {
        const { name } = path.node
        if (seen.has(name) || GLOBALS.has(name)) return
        if (path.scope.hasBinding(name, true)) return
        seen.add(name)
        undefined_.push({
          file: relative(CLIENT, file),
          name,
          line: path.node.loc?.start.line ?? 0,
        })
      },
    })
  } catch (e) {
    // 走査で落ちても構文は通っている。**検査の都合で配信を止めない**
    console.warn(`（${relative(CLIENT, file)} の名前の検査を飛ばした: ${e.message}）`)
  }
}

for (const { file, message } of broken) {
  console.error(`✖ ${file}\n  ${message}`)
}
for (const { file, name, line } of undefined_) {
  console.error(`✖ ${file}:${line}\n  無い名前を呼んでいる: ${name}`)
}

if (broken.length > 0 || undefined_.length > 0) {
  console.error(`\n読めない ${broken.length} 件 / 無い名前 ${undefined_.length} 件。`)
  process.exit(1)
}

// ── 色の名前 ──────────────────────────────────────────────
//
// **打ち間違えた色は、黙って消える**（2026-09-04）。
//
// Tailwind は知らないクラス名を無視する。`text-primry` と書いても
// エラーにならず、**その字だけ既定の色で出る。**構文も名前も通るので、
// ここまでの検査では捕まらない。
//
// 色の名前は `tailwind.config.js` にある。使っている名前が
// そこに無ければ報せる。**打ち間違いと、消した名前の使い残しが捕まる。**
const require_ = createRequire(import.meta.url)
const config = require_(join(CLIENT, 'tailwind.config.js'))

// `{ surface: { DEFAULT, low } }` → `surface`, `surface-low`
function flatten(colors, prefix = '') {
  const out = new Set()
  for (const [key, value] of Object.entries(colors || {})) {
    const name = key === 'DEFAULT' ? prefix : prefix ? `${prefix}-${key}` : key
    if (value && typeof value === 'object') {
      for (const n of flatten(value, name)) out.add(n)
    } else if (name) {
      out.add(name)
    }
  }
  return out
}

const COLORS = flatten(config?.theme?.extend?.colors)
// Tailwind が元から持つもの。設定に書かなくても使える
for (const n of ['black', 'white', 'transparent', 'current', 'inherit']) COLORS.add(n)

// 色ではない `text-` / `border-` / `bg-`。**ここに無いものは色として見る**
const NOT_COLORS = new Set([
  // 大きさ（`tailwind.config.js` の fontSize）
  ...Object.keys(config?.theme?.extend?.fontSize || {}),
  // Tailwind が元から持つ大きさ
  'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl',
  // 揃え・装飾
  'center', 'left', 'right', 'justify', 'start', 'end',
  'wrap', 'nowrap', 'balance', 'pretty', 'ellipsis', 'clip',
  // 枠の辺と太さと種類
  'b', 't', 'l', 'r', 'x', 'y', '0', '2', '4', '8',
  'solid', 'dashed', 'dotted', 'double', 'none', 'hidden',
])

const CLASS = /(?:^|[\s"'`{])(bg|text|border)-(\[[^\]]+\]|[a-z][a-z0-9-]*?)(?:\/\d+)?(?=[\s"'`}]|$)/gm
const unknown = []

for (const file of files) {
  const src = readFileSync(file, 'utf8')
  const seen = new Set()
  for (const m of src.matchAll(CLASS)) {
    const name = m[2]
    // `text-[11px]` のような直値は見ない。設定の外なので照らす先が無い
    if (name.startsWith('[')) continue
    if (COLORS.has(name) || NOT_COLORS.has(name)) continue
    const key = `${m[1]}-${name}`
    if (seen.has(key)) continue
    seen.add(key)
    unknown.push({ file: relative(CLIENT, file), name: key })
  }
}

for (const { file, name } of unknown) {
  console.error(`✖ ${file}
  知らない色の名前: ${name}`)
}

if (unknown.length > 0) {
  console.error(`
知らない色 ${unknown.length} 件。`)
  process.exit(1)
}

console.log(
  `${files.length} ファイル、すべて読めます。無い名前も、知らない色もありません。`,
)
