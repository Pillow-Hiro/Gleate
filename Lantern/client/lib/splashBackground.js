import { localDateStr } from './date'
import { splashImageFor } from './splashImage'
import { loadCached } from './splashPhoto'

// 起動画面とログイン画面が**同じ地を使うための1か所**。
//
// 案（`code.html`）の演出では、起動画面が去っても写真は残る。
// 残っているように見せているだけで、実際には
// **起動画面の鮮明な写真が薄れ、下にあるログイン画面のぼけた写真が現れる。**
//
// 2枚が別々に選んでいると、そこで写真が入れ替わる。
// **選び方を1か所に置いて、必ず同じ1枚になるようにする。**
//
// 覚えている写真があればそれを、無ければ同梱の地を使う
// （`lib/splashPhoto.js` / `lib/splashImage.js`）。
// どちらも端末の中にあるので通信を待たない。
export function currentSplashBackground() {
  const cached = loadCached()
  return cached ? { uri: cached } : splashImageFor(localDateStr())
}
