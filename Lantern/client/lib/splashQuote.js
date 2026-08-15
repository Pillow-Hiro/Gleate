import { Directory, File, Paths } from 'expo-file-system'

// 起動画面の一言を、**端末に覚えさせる。**
//
// ## なぜ
//
// 一言はサーバーから取っている（`/api/splash/content`）。
// 届くまでの間は出せないので、こちらが持っている一文を先に出し、
// **届いた時点で差し替えていた。**
//
// 読んでいる最中に文が変わる。作者は「言葉が2回出てくる」と言った。
// **バグである。**
//
// 地（写真）で決めたことと同じ扱いにする。
// **描く前に1つ決めて、そのあと変えない**（`lib/splashPhoto.js`）。
//
// ## その場では差し替えない
//
// 新しく取れた一言は**次回のために置くだけ。**
// つまり1日ずれる。**前に取った言葉が今日出る。**
// 起動画面の一言はその日を指すものではないので、ずれても困らない。
//
// ## 初回だけ覚えていない
//
// そのときは同梱の一文が出る（`components/SplashScreen.jsx` の `FALLBACKS`）。
const NAME = 'splash-quote.txt'

export const isSupported = true

function file() {
  return new File(new Directory(Paths.document), NAME)
}

/** 覚えている一言。無ければ null。**同期で返す**（描く前に決めたいので） */
export function loadCached() {
  try {
    const f = file()
    if (!f.exists) return null
    const text = f.textSync().trim()
    return text || null
  } catch (e) {
    console.warn('[Splash] 一言の読み込みに失敗', e)
    return null
  }
}

/** 次回のために置く。**いま出ている一言は変えない。** */
export function cacheForNextTime(quote) {
  if (!quote || !quote.trim()) return
  try {
    const f = file()
    if (!f.exists) f.create()
    f.write(quote.trim())
  } catch (e) {
    // 覚えられなくても起動画面は出る
    console.warn('[Splash] 一言を覚えられなかった', e)
  }
}
