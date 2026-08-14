// HTML と Markdown を行き来する。**扱うのは3つだけ。**
// 太字・斜体・箇条書き。
//
// なぜ要るか。**編集は HTML、保存は Markdown**だから。
//
// 本物の編集画面（`WebEditor`）は WebView の中の `contenteditable` で、
// 出てくるのは HTML。一方 Lantern の記録は Markdown で保存してあり、
// AI に渡す前に記法を剥がす経路（`modules/markdown.py`）もそれ前提。
//
// **保存の形は変えない。** 変えると、これまでの記録を全部書き換えることになる。
// 入口と出口で変換する方が、影響が編集画面の中だけで収まる。
//
// ここは文字列の変換だけなので vitest で検査できる。
// **往復して元に戻ること**を検査で固定している。

// 箇条書きの行に付ける目印。**本文に出ない文字**を使う
const LI = ''

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

  for (const line of markdown.split('\n')) {
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
    .replace(/<br\s*\/?>/gi, '')
    // 残った要素は落とす。**中身は残す**（文字が消えるより記号が消える方がよい）
    .replace(/<[^>]+>/g, '')

  // 中身が空のまま残った記号は消す。`****` を書き戻さない。
  // **閉じ側だけを消す処理は入れない。** `**あ**` の終わりまで持っていかれる
  return unescapeHtml(out).replace(/\*\*\*\*/g, '')
}

/**
 * `contenteditable` の HTML を Markdown に戻す。
 *
 * **行の外枠だけを見る。** `div` / `p` / `li` が1行にあたる。
 * それ以外の入れ子は書式として読む。
 */
export function htmlToMarkdown(html) {
  if (!html) return ''

  // 箇条書きは目印を付けてから、ふつうの行と同じ扱いにする
  const work = html
    .replace(/<\/?(ul|ol)(\s[^>]*)?>/gi, '')
    .replace(/<li(\s[^>]*)?>/gi, `<div>${LI}`)
    .replace(/<\/li>/gi, '</div>')

  const lines = []
  const re = /<(div|p)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi
  let match
  while ((match = re.exec(work)) !== null) lines.push(match[3])

  // 外枠が無いとき（1行だけ打った直後など）はそのまま1行として扱う
  if (lines.length === 0) lines.push(work)

  return lines
    .map((line) => {
      const bullet = line.startsWith(LI)
      const body = inlineToMarkdown(bullet ? line.slice(LI.length) : line)
      return bullet ? `- ${body}` : body
    })
    .join('\n')
    .replace(/[ \t]+$/gm, '')
}
