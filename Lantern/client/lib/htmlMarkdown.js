// HTML と Markdown を行き来する。**扱うのは3つだけ。**
// 太字・斜体・箇条書き。
//
// なぜ要るか。**編集は HTML、保存は Markdown**だから。
//
// 本物の編集画面（`WebEditor`）は WebView の中の `contenteditable` で、
// 出てくるのは HTML。一方 Gleate の記録は Markdown で保存してあり、
// AI に渡す前に記法を剥がす経路（`modules/markdown.py`）もそれ前提。
//
// **保存の形は変えない。** 変えると、これまでの記録を全部書き換えることになる。
// 入口と出口で変換する方が、影響が編集画面の中だけで収まる。
//
// ここは文字列の変換だけなので vitest で検査できる。
// **往復して元に戻ること**を検査で固定している。

// 箇条書きの行に付ける目印。**本文に出ない文字**を使う
const LI = ''
const NL = '\n'

export function escapeHtml(text) {
  return text.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;')
}

function unescapeHtml(text) {
  return text
    .split('&lt;').join('<')
    .split('&gt;').join('>')
    .split('&nbsp;').join(' ')
    .split('&amp;').join('&')
}

// 1行ぶんの Markdown を HTML の中身にする（行の外枠は付けない）
function inlineToHtml(line) {
  return escapeHtml(line)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<i>$1</i>')
}

/**
 * Markdown を `contenteditable` に入れる HTML にする。
 *
 * 行は `<div>`。**空行も `<div><br></div>` で残す。**
 * 詰めると、書いた人が空けた行が消える。
 */
export function markdownToHtml(markdown) {
  if (!markdown) return ''
  const out = []
  let bullets = null

  const flush = () => {
    if (bullets) {
      out.push(`<ul>${bullets.join('')}</ul>`)
      bullets = null
    }
  }

  for (const line of markdown.split(NL)) {
    const bullet = /^[ \t]*[-*+][ \t]+/.exec(line)
    if (bullet) {
      const body = inlineToHtml(line.slice(bullet[0].length))
      bullets = bullets || []
      bullets.push(`<li>${body || '<br>'}</li>`)
      continue
    }
    flush()
    const body = inlineToHtml(line)
    out.push(`<div>${body || '<br>'}</div>`)
  }
  flush()

  return out.join('')
}

// `<b>` `<i>` を記号に戻す。
// 書式を持たない包み（`contenteditable` が勝手に付ける `span` など）は落とす。
function inlineToMarkdown(html) {
  const out = html
    .replace(/<(b|strong)(\s[^>]*)?>/gi, '**')
    .replace(/<\/(b|strong)>/gi, '**')
    .replace(/<(i|em)(\s[^>]*)?>/gi, '*')
    .replace(/<\/(i|em)>/gi, '*')
    // 残った要素は落とす。**中身は残す**（文字が消えるより記号が消える方がよい）
    .replace(/<[^>]+>/g, '')

  // 中身が空のまま残った記号は消す。`****` を書き戻さない。
  // **閉じ側だけを消す処理は入れない。** `**あ**` の終わりまで持っていかれる
  return unescapeHtml(out).replace(/\*\*\*\*/g, '')
}

/**
 * `contenteditable` の HTML を Markdown に戻す。
 *
 * **入れ子は数えない。塊の切れ目を改行に置き換えるだけ。**
 *
 * 対を正規表現で数えようとして壊した（2026-08-15）。
 * ブラウザは `<div><ul><li>…</li></ul></div>` のように塊を包むことがあり、
 * 対を非貪欲で拾うと**外側の `<div>` が最初の `</li>` で閉じたことになる。**
 * 実ブラウザで打って確かめたときに見つけた。
 *
 * 切れ目を改行にするだけなら、何段包まれていても結果は変わらない。
 */
export function htmlToMarkdown(html) {
  if (!html) return ''

  const startsWithBlock = /^\s*</.test(html)

  const text = html
    // **塊をそのまま包んだだけの `<div>` は外す。**
    // すぐ次にまた塊が始まるものは、行ではなく入れ物。
    // 残すと、包まれた段の数だけ空行が増える。
    // 閉じ側は下でまとめて落とすので、開き側だけ消せばよい
    .replace(/<div[^>]*>(?=\s*<(?:div|ul|ol|p)\b)/gi, '')
    // 空の行
    .replace(/<(div|p)[^>]*>\s*<br\s*\/?>\s*<\/(?:div|p)>/gi, NL)
    // **箇条書きを外した直後は、外れた行が裸で `</ul>` の後ろに残る。**
    // 実ブラウザで箇条書きを外して確かめたときに見つけた。
    // 行の切れ目を入れないと、前の項目とくっつく。
    // 次が別の塊なら、その塊が自分で切れ目を作るので入れない
    .replace(/<\/(ul|ol)>(?=\s*[^\s<])/gi, NL)
    .replace(/<\/?(ul|ol)[^>]*>/gi, '')
    .replace(/<li[^>]*>/gi, NL + LI)
    .replace(/<\/li>/gi, '')
    .replace(/<(div|p)[^>]*>/gi, NL)
    .replace(/<\/(div|p)>/gi, '')
    .replace(/<br\s*\/?>/gi, NL)

  const lines = text.split(NL)
  // 先頭の塊が作った空行を1つだけ落とす。
  // **全部は落とさない。** 書いた人が頭で改行していることがある
  if (startsWithBlock && lines[0] === '') lines.shift()

  return lines
    .map((line) => {
      const bullet = line.startsWith(LI)
      const body = inlineToMarkdown(bullet ? line.slice(LI.length) : line)
      return bullet ? `- ${body}` : body
    })
    .join(NL)
    .replace(/[ \t]+$/gm, '')
}
