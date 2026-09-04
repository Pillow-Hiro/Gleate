// 語の移り変わり。**月ごとに、出てきた言葉と見なくなった言葉を並べる。**
//
// 2026-09-05・作者の選択（分析タブの強化・案B）。
//
// ## なぜ AI を使わないか
//
// 頻出キーワード（`components/KeywordSection.jsx`）は AI に数えさせて
// いて、有料の枠と1日の枠を使う。**月をまたいで比べるには2倍かかる。**
//
// ここでやるのは**数えて引き算するだけ**。材料は端末にある記録で、
// 通信もいらない。CLAUDE.md の「することは2つだけ。記録を並べること。
// 変化を示すこと」の、2つ目そのもの。
//
// ## 評価しない
//
// 出すのは「今月から出てきた」「先月まで出ていた」の2つ。
// **増えた・減った・良くなったとは言わない。**
// 語が入れ替わったという事実だけを置いて、読み方は本人に委ねる。
//
// ## 語の切り出し
//
// 形態素解析は入れない（辞書だけで数MBある。7.3MB の書体を外した
// 判断と同じ）。**漢字とカタカナの連なりを拾う。**
//
// 日本語は、助詞と活用がほぼ平仮名に寄る。平仮名だけの連なりを捨てると、
// **残るのはだいたい名詞**になる。粗いが、この用途には足りる——
// ここで欲しいのは正しい品詞ではなく、**去年と今年で違う言葉**。

// 拾う形。**2文字以上**（1文字は「日」「人」など、どの月にも出る）
const KANJI = /[一-鿿々]{2,}/g
const KATAKANA = /[ァ-ヶー]{2,}/g
const LATIN = /[A-Za-z][A-Za-z0-9]{1,}/g

// どの月にも出るので、違いが見えない語。**内容語だけを消す。**
// 迷ったら入れない——消しすぎると、本人にとって意味のある語まで落ちる。
const COMMON = new Set([
  '今日', '昨日', '明日', '今回', '今週', '今月', '来週', '来月',
  '自分', '時間', '場合', '感じ', '状態', '部分', '内容', '必要',
  '結果', '以上', '以下', '最近', '午前', '午後', '本日',
])

/** 文章から語を拾う。**同じ語は1文につき何度出ても1つ**とは数えない */
export function extractWords(text) {
  const src = String(text || '')
  const out = []
  for (const re of [KANJI, KATAKANA, LATIN]) {
    // `g` 付きの正規表現は `lastIndex` を持ち回る。**使うたびに戻す**
    re.lastIndex = 0
    for (const m of src.matchAll(re)) {
      const word = m[0]
      if (COMMON.has(word)) continue
      out.push(word)
    }
  }
  return out
}

/** 記録の束から、語 → 回数 */
export function countWords(logs) {
  const counts = new Map()
  for (const log of logs || []) {
    const text = [log?.created, log?.enjoyable, log?.struggled, log?.next]
      .filter(Boolean)
      .join(' ')
    for (const word of extractWords(text)) {
      counts.set(word, (counts.get(word) || 0) + 1)
    }
  }
  return counts
}

/** `2026-09` の1つ前 */
export function previousMonth(month) {
  const [y, m] = String(month || '').split('-').map(Number)
  if (!y || !m) return ''
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function ofMonth(logs, month) {
  return (logs || []).filter((l) => String(l?.date || '').startsWith(month))
}

/**
 * 2つの月を比べる。
 *
 * - `appeared` … 今月に出てきて、先月には無かった語
 * - `left`     … 先月まで出ていて、今月には無い語
 * - `kept`     … どちらの月にもある語
 *
 * **1回だけの語は出さない。** 打ち間違いや固有名詞が1つ混ざるたびに
 * 「出てきた言葉」に並ぶと、移り変わりが読めなくなる。
 *
 * 並びは回数の多い順。同数なら語順で決める——**日によって並びが
 * 変わると、同じものを見ている感じがしない。**
 */
export function monthDrift(logs, month, { min = 2, limit = 8 } = {}) {
  const prev = previousMonth(month)
  const now = countWords(ofMonth(logs, month))
  const before = countWords(ofMonth(logs, prev))

  const pick = (from, other) =>
    [...from.entries()]
      .filter(([word, count]) => count >= min && !other.has(word))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit)
      .map(([word, count]) => ({ word, count }))

  const kept = [...now.entries()]
    .filter(([word, count]) => count >= min && before.has(word))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }))

  return { month, previous: prev, appeared: pick(now, before), left: pick(before, now), kept }
}
