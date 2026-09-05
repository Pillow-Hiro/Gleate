// Apple Music で曲を探す（2026-09-05・作者の指示「Apple music は9月の
// ビルドに組み込もう」）。**言葉を組み立てる所と、読み解く所だけ。**
// 通信そのものは呼ぶ側（`components/AttachRow.jsx`）が持つ。
// `react-native` を読み込まないのは検査のため（`lib/attachLink.js` と同じ）。
//
// ## ここは「黙って足さない」の例外ではない
//
// `lib/attachLink.js` にこう書いてある——**「何を見て、何を聴いていたか」を
// 外部へ知らせる通信を、黙って足さない。**貼られたリンクの題名を
// 取りに行かないのはそのため。
//
// 探すのは、その禁を破っていない。**線引きは「黙って」の側にある。**
// 送るのは本人が探すために打った言葉で、記録の中身ではない。
// State of Mind のときと同じ形で、**主体が誰かを見ている**
// （`CLAUDE.md`「気分について」）。
//
// だから守ることが3つある。
//
// 1. **記録の中身から自動で探さない。** 書いたものを種にしない
// 2. **打つたびに送らない。**押して初めて出る（`AttachRow`）。
//    その場で探しに行くと、消した言葉まで Apple に届く
// 3. **サーバーは残さない**（`modules/applemusic.py`）
//
// ## なぜサーバーを通すのか
//
// MusicKit は開発者トークンを要る。端末に配ると、こちらの開発者名義で
// 叩ける状態になる。**出さずに済むなら出さない**ので、サーバーが
// 代わりに叩く（`GET /api/apple-music/search`）。

// Apple に渡す前に整える。**長すぎるものは切る**——曲名として
// 打たれたとは考えにくく、記録の一節を貼り付けた可能性のほうが高い。
// 切っても探せる。切らずに送ると、送らないと決めたものが混ざる
const MAX_TERM = 80

/** 探す言葉を整える。空白を潰し、長すぎるものは切る */
export function normalizeTerm(input) {
  return String(input == null ? '' : input)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TERM)
}

/** 探しに行く道。**言葉は URL に載るので必ず包む** */
export function searchPath(term) {
  const q = normalizeTerm(term)
  if (!q) return ''
  return `/api/apple-music/search?q=${encodeURIComponent(q)}`
}

/**
 * 返ってきたものを、並べられる形にする。
 *
 * **URL の無いものは捨てる。**添えるのはリンクなので、
 * 押せないものを並べても選べない。
 *
 * 取れなければ空。**探せないことでアプリを止めない。**
 */
export function parseSongs(body) {
  const songs = body && Array.isArray(body.songs) ? body.songs : []
  const out = []
  const seen = new Set()
  for (const s of songs) {
    const url = String((s && s.url) || '').trim()
    if (!url || seen.has(url)) continue
    seen.add(url)
    out.push({
      url,
      title: String((s && s.title) || '').trim(),
      artist: String((s && s.artist) || '').trim(),
    })
  }
  return out
}
