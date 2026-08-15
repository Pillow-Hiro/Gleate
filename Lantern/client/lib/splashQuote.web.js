// Web でも一言は覚える。
//
// 写真（`splashPhoto.web.js`）は覚えない。ブラウザ自身が同じ URL を
// 覚えているので二重に持つ理由がなかった。
// **一言はブラウザが覚えてくれない。** 毎回サーバーに聞くことになり、
// 届くまでの間に別の文を出せば、そこで文が入れ替わる。
//
// localStorage は同期で読めるので、描く前に決められる。
// 消えても困らない（同梱の一文に戻るだけ）。
const KEY = 'lantern.splash.quote'

export const isSupported = true

function store() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch (e) {
    // プライベートウィンドウなどで参照そのものが投げることがある
    return null
  }
}

/** 覚えている一言。無ければ null。**同期で返す**（描く前に決めたいので） */
export function loadCached() {
  const s = store()
  if (!s) return null
  try {
    const text = (s.getItem(KEY) || '').trim()
    return text || null
  } catch (e) {
    return null
  }
}

/** 次回のために置く。**いま出ている一言は変えない。** */
export function cacheForNextTime(quote) {
  if (!quote || !quote.trim()) return
  const s = store()
  if (!s) return
  try {
    s.setItem(KEY, quote.trim())
  } catch (e) {
    // 保存領域がいっぱいでも起動画面は出る
  }
}
