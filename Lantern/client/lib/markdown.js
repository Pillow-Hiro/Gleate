// 記録の Markdown を扱う。**扱うのは3つだけ。**
// 太字（`**`）・斜体（`*`）・箇条書き（行頭の `- `）。
//
// 見出しも表もリンクも画像も扱わない。**画面が出せないものは書けない。**
// 書けないものを解釈する必要はない。
//
// 外部の Markdown 部品を入れなかったのは、
// - 出せるのが3つだけなので、要る処理が小さい
// - 見出しや引用が「書けてしまう」と、画面と保存の形がずれる
// - 依存を足すと、ネイティブの指紋が変わるかを毎回確かめることになる
//
// 描画から切り離してあるのは、ここだけ vitest で検査できるため。

const BOLD = /\*\*(.+?)\*\*|__(.+?)__/s
const ITALIC = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/s
const BULLET = /^[ \t]*[-*+][ \t]+/

/**
 * 記法を外して素のテキストにする。
 *
 * 一覧の抜粋に使う。**抜粋に `**` が出ると、装飾ではなく文字として読まれる。**
 * 改行は残す。1行にまとめると、書いた人が分けた意味が失われる。
 */
export function stripMarkdown(text) {
  if (!text) return ''
  return text
    .split('\n')
    .map((line) => stripInline(line.replace(BULLET, '')))
    .join('\n')
}

function stripInline(line) {
  return parseInline(line)
    .map((s) => s.text)
    .join('')
}

/**
 * 1行を、装飾つきの断片に割る。
 *
 * 返すのは `{ text, bold, italic }` の配列。
 * **太字を先に取る。** 逆順だと `**a**` が `*` ＋ `*a*` ＋ `*` に割れる。
 */
export function parseInline(line) {
  if (!line) return []
  return walk(line, false, false)
}

function walk(text, bold, italic) {
  if (!text) return []

  const b = bold ? null : BOLD.exec(text)
  const i = italic ? null : ITALIC.exec(text)

  // 先に現れた方から処理する。太字と斜体が同じ位置なら太字を優先
  let m = null
  let nextBold = bold
  let nextItalic = italic
  if (b && (!i || b.index <= i.index)) {
    m = b
    nextBold = true
  } else if (i) {
    m = i
    nextItalic = true
  }

  if (!m) return [{ text, bold, italic }]

  const inner = m[1] ?? m[2] ?? ''
  return [
    ...(m.index > 0 ? [{ text: text.slice(0, m.index), bold, italic }] : []),
    ...walk(inner, nextBold, nextItalic),
    ...walk(text.slice(m.index + m[0].length), bold, italic),
  ]
}

/**
 * **書いている最中の本文**を、記号ごと断片に割る。
 *
 * `parseInline` は記号を捨てる（読むための形）。こちらは**捨てない。**
 * 返した `text` をつなぐと、渡した文字列にそのまま戻る。
 *
 * 入力欄の中で装飾を見せるために使う。記号を消してしまうと、
 * 画面の文字と入力欄の中身がずれ、打つたびにカーソルが飛ぶ。
 * **記号は残したまま薄くする。**
 *
 * 返すのは `{ text, bold, italic, marker }` の配列。
 * `marker` は `**` や `- ` のような記号そのもの。
 */
export function parseWithMarkers(text) {
  if (!text) return []
  const out = []

  text.split('\n').forEach((line, i) => {
    if (i > 0) out.push({ text: '\n', bold: false, italic: false, marker: false })

    const bulletMatch = line.match(BULLET)
    let rest = line
    if (bulletMatch) {
      out.push({ text: bulletMatch[0], bold: false, italic: false, marker: true })
      rest = line.slice(bulletMatch[0].length)
    }
    walkMarked(rest, false, false, out)
  })

  return out
}

function walkMarked(text, bold, italic, out) {
  if (!text) return

  const b = bold ? null : BOLD.exec(text)
  const i = italic ? null : ITALIC.exec(text)

  let m = null
  let nextBold = bold
  let nextItalic = italic
  if (b && (!i || b.index <= i.index)) {
    m = b
    nextBold = true
  } else if (i) {
    m = i
    nextItalic = true
  }

  if (!m) {
    out.push({ text, bold, italic, marker: false })
    return
  }

  if (m.index > 0) out.push({ text: text.slice(0, m.index), bold, italic, marker: false })

  // 記号は本体の前後に同じ長さで付く（`**` なら 2 文字ずつ）
  const inner = m[1] ?? m[2] ?? ''
  const markLen = (m[0].length - inner.length) / 2
  const open = m[0].slice(0, markLen)
  const close = m[0].slice(m[0].length - markLen)

  out.push({ text: open, bold: nextBold, italic: nextItalic, marker: true })
  walkMarked(inner, nextBold, nextItalic, out)
  out.push({ text: close, bold: nextBold, italic: nextItalic, marker: true })

  walkMarked(text.slice(m.index + m[0].length), bold, italic, out)
}

/**
 * 本文を行の配列に割る。
 *
 * 返すのは `{ bullet, spans }` の配列。
 * 空行も1行として返す。**書いた人が空けた行を詰めない。**
 */
export function parseBlocks(text) {
  if (!text) return []
  return text.split('\n').map((line) => {
    const bullet = BULLET.test(line)
    return { bullet, spans: parseInline(bullet ? line.replace(BULLET, '') : line) }
  })
}

// 語の切れ目。**日本語には空白が無い**ので、空白と改行と約物で切る。
// 完全な語の判定は要らない。**囲む範囲の見当が付けばよい。**
const WORD_BREAK = /[\s、。，．・「」『』（）()!?！？:：;；]/

/**
 * 選択範囲を記号で囲む。入力欄の装飾ボタンが使う。
 *
 * **何も選んでいないときは、カーソルのある語を囲む**（2026-08-15）。
 * それまでは記号だけ置いていたので、押すと `****` が現れていた。
 * 実機で「****が表示されるのは良くない」と言われた。
 *
 * Apple の「メモ」は押した時点から先を太字にするが、
 * こちらは記法を本文に持つので、**いま書いている語**を対象にする。
 * 語が見当たらないとき（空行・空白の上）だけ、記号を置いてその間に戻す。
 */
export function wrapSelection(text, start, end, mark) {
  let from = start
  let to = end

  if (start === end) {
    // カーソルの左右へ、切れ目に当たるまで伸ばす
    while (from > 0 && !WORD_BREAK.test(text[from - 1])) from -= 1
    while (to < text.length && !WORD_BREAK.test(text[to])) to += 1
  }

  const body = text.slice(from, to)
  const next = text.slice(0, from) + mark + body + mark + text.slice(to)
  return { text: next, cursor: from + mark.length + body.length }
}

/** 選択している行の頭に `- ` を付ける／外す。 */
export function toggleBullet(text, start, end) {
  const head = text.lastIndexOf('\n', Math.max(0, start - 1)) + 1
  const tailIndex = text.indexOf('\n', end)
  const tail = tailIndex === -1 ? text.length : tailIndex

  const target = text.slice(head, tail)
  const lines = target.split('\n')
  // **1行でも付いていなければ全部に付ける。** 混在したまま切り替えない
  const allBulleted = lines.every((l) => l.trim() === '' || BULLET.test(l))
  const next = lines
    .map((l) => {
      if (l.trim() === '') return l
      return allBulleted ? l.replace(BULLET, '') : `- ${l}`
    })
    .join('\n')

  return {
    text: text.slice(0, head) + next + text.slice(tail),
    cursor: head + next.length,
  }
}
