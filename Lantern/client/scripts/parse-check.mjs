// 画面のコードが**構文として通るか**だけを見る。速さが取り柄。
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
// ここは描画を見ない。**読めるかどうかだけ。**それで足りる種類の
// 事故があり、それが一番よく起きる。
//
//     npm run check
//
// 配信の前に必ず通すこと。数秒で終わる。

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@babel/parser'

const CLIENT = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const DIRS = ['app', 'components', 'lib']

// `node_modules` には入らない。見るのは自分で書いたものだけ
function collect(dir, out = []) {
  for (const name of readdirSync(dir)) {
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

for (const file of files) {
  try {
    parse(readFileSync(file, 'utf8'), {
      sourceType: 'module',
      // 画面は JSX。`lib/` は素の JS だが、混ぜて困ることはない
      plugins: ['jsx'],
    })
  } catch (e) {
    broken.push({ file: relative(CLIENT, file), message: e.message })
  }
}

if (broken.length > 0) {
  for (const { file, message } of broken) {
    console.error(`✖ ${file}\n  ${message}`)
  }
  console.error(`\n${broken.length} 件が読めません。`)
  process.exit(1)
}

console.log(`${files.length} ファイル、すべて読めます。`)
