// ホームに並べる記録を選ぶ。
//
// **その日のうちは同じ顔ぶれになる。**
// 開き直すたびに入れ替わると、さっき見た記録が消えたように見えて、
// 読む手より探す手が先に動く。問いの資産で
// 「同じ日は同じ問いを出す」と決めたのと同じ考え方。
//
// **いちばん新しい記録は必ず入れる。** 書いた直後に開いて自分の記録が
// 無いと、保存できていないように見える。
//
// 順番は日付の新しい順のまま。**選び方が偶然でも、並びは偶然にしない。**
// 並びまで崩すと、いつのことなのかを読むたびに追い直すことになる。

// 文字列から数を作る（FNV-1a）。**乱数を使わない。**
// Math.random だと再読み込みで変わり、日付で固定できない。
function hash(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

// `items` から `count` 件を選ぶ。`seed` が同じなら結果も同じ。
export function dailySample(items, count, seed, keyOf = (x) => x.date) {
  if (!Array.isArray(items) || items.length === 0) return []
  if (items.length <= count) return [...items]

  const sorted = [...items].sort((a, b) => String(keyOf(b)).localeCompare(String(keyOf(a))))
  const newest = sorted[0]
  const rest = sorted.slice(1)

  const picked = rest
    .map((item) => ({ item, score: hash(`${seed}:${keyOf(item)}`) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, count - 1)
    .map((x) => x.item)

  return [newest, ...picked].sort((a, b) => String(keyOf(b)).localeCompare(String(keyOf(a))))
}
