// 文に切る（2026-09-24）。**深掘りの見立てを1文ずつ出すため**
// （作者「ロード中だと不安なので、できた文章をフェードインするみたいに」）。
//
// **ここは純粋な計算だけ**（`sentences.test.js`）。`react-native` を読むものを
// 混ぜると vitest が読めない（`readingChoice.js` で一度やった）。

/**
 * 「。」で切る。**句点は前の文に残す。**切れ目が無ければ、全体で1文。
 *
 * **かぎ括弧の中では切らない。**見立ては本人の言葉を「」で引くので、
 * 引用の中の句点で切ると、本人の文が途中で切れて出てくる。
 */
export function splitSentences(text) {
  const body = String(text || '').trim()
  if (!body) return []
  const out = []
  let buf = ''
  let depth = 0
  for (const ch of body) {
    buf += ch
    if (ch === '「') depth += 1
    else if (ch === '」') depth = Math.max(0, depth - 1)
    else if (ch === '。' && depth === 0) {
      out.push(buf.trim())
      buf = ''
    }
  }
  if (buf.trim()) out.push(buf.trim())
  return out
}
