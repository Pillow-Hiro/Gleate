// 記録を Markdown にする。
//
// ## なぜ JSON だけでは足りないのか
//
// JSON は**機械が読み直すため**の形。人が読むための形ではない。
// 書き出したものを開いても、括弧と引用符の間に自分の文章が挟まっている。
//
// Markdown なら、そのまま Notion にも Obsidian にも入る。
// **本文はもともと Markdown で保存している**（`lib/markdown.js`）ので、
// 変換ではなく、並べ直すだけで済む。
//
// ## 見出しを日付にする
//
// 記録は日付で1つ。だから `## 2026-08-17` が単位になる。
// 4つの欄はその下の小見出しにする。
//
// **空の欄は出さない。** 「やったこと」だけ書いた日に
// 空の見出しが3つ並ぶと、書けなかった日のように見える。
//
// ## Lantern の言葉は引用にする
//
// `> ` を付けて、自分が書いた文章と見分けられるようにする。
// 混ざると、あとで読み返したときに**どれが自分の言葉か分からなくなる。**

// **画面と同じ名前を使う。** 2026-08-18 まで、ここだけ
// 「楽しかったこと」「つまずいたこと」と書き換えていた。
// 画面は `components/RecordForm.jsx` も `components/LogDetail.jsx` も
// 「よかったこと」「困ったこと」で、**手元に出した時だけ見出しが変わっていた。**
// 「ユーザー自身の言葉を大切にする」を原則に置くアプリで、
// 一番自分のものに近い出口が言い換えていたことになる。
const FIELDS = [
  ['created', 'やったこと'],
  ['enjoyable', 'よかったこと'],
  ['struggled', '困ったこと'],
  ['next', '次にやること'],
]

function hasText(v) {
  return typeof v === 'string' && v.trim() !== ''
}

/** 1日ぶん。**中身が何も無ければ null**（見出しだけの日を作らない） */
export function logToMarkdown(log, options = {}) {
  if (!log || !hasText(log.date)) return null

  const parts = []
  for (const [key, label] of FIELDS) {
    if (!hasText(log[key])) continue
    parts.push(`### ${label}\n\n${log[key].trim()}`)
  }

  // 写真は ZIP の中の相対パスで指す。**同梱していないときは書かない**
  // （開いて画像が壊れているより、無い方がよい）
  if (options.photoName) {
    parts.push(`![写真](photos/${options.photoName})`)
  }

  if (Array.isArray(options.fileNames) && options.fileNames.length > 0) {
    // 文字列でも `{ name, path }` でも受ける。
    // **見せる名前と ZIP の中の名前は別**にできるようにしてある —
    // 別の日に同じ名前のファイルを添えると、ZIP の中でぶつかるため
    const list = options.fileNames
      .map((f) => (typeof f === 'string' ? { name: f, path: f } : f))
      .filter((f) => f && f.name)
      .map((f) => `- [${f.name}](files/${f.path || f.name})`)
      .join('\n')
    if (list) parts.push(`### 添えたもの\n\n${list}`)
  }

  if (hasText(log.ai_response)) {
    // **引用にする。** 自分の言葉と混ざらないように
    const quoted = log.ai_response
      .trim()
      .split('\n')
      .map((line) => `> ${line}`.trimEnd())
      .join('\n')
    parts.push(quoted)
  }

  if (parts.length === 0) return null

  // お気に入りは日付の隣に印を置くだけ。**数えない**
  const star = log.favorite ? ' ★' : ''
  return `## ${log.date}${star}\n\n${parts.join('\n\n')}`
}

/**
 * 全部を1枚にする。**新しい日が上**（読み返すのは最近のものから）。
 *
 * `photos` は日付 → ファイル名、`files` は日付 → ファイル名の配列。
 * どちらも同梱するときだけ渡す。
 */
export function logsToMarkdown(logs, { photos, files, generatedAt } = {}) {
  const list = Array.isArray(logs) ? logs : []
  const sorted = [...list].sort((a, b) => String(b?.date || '').localeCompare(String(a?.date || '')))

  const body = sorted
    .map((log) =>
      logToMarkdown(log, {
        photoName: photos?.get?.(log?.date) ?? photos?.[log?.date],
        fileNames: files?.get?.(log?.date) ?? files?.[log?.date],
      })
    )
    .filter(Boolean)
    .join('\n\n---\n\n')

  // 表紙。**件数は出すが、多い少ないは言わない**
  const when = generatedAt || new Date().toISOString().slice(0, 10)
  const header = `# Lantern の記録\n\n${when} に書き出したもの。`

  if (!body) {
    // 1件も無い。**空のファイルを渡さない**
    return `${header}\n\nまだ記録がありません。\n`
  }
  return `${header}\n\n---\n\n${body}\n`
}
