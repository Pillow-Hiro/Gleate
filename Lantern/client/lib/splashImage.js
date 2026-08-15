// 起動画面の地。**アプリの中に持つ。**
//
// 2026-08-16 まで Unsplash から取っていた。届くまでの数秒（サーバーが
// 眠っていれば数十秒）は濃紺のままで、**写真は遅れて現れていた。**
// 作者の判断で「最初から出す」ことにしたので、外から取るのをやめた。
//
// 引き換えに、
// - **毎回、開いた瞬間に出る。** 通信を待たない
// - オフラインでも同じ
// - 枚数は決め打ちになる
//
// **日替わりで選ぶ。** 同じ日は同じ地（`lib/sample.js` と同じ考え方）。
// 開き直すたびに変わると、落ち着いて読むものではなくなる。
//
// ## 差し替えるとき
//
// `assets/splash/01.jpg` … を**同じ名前で上書きするだけ**。
// いま入っているのは写真ではなく、琥珀と夜でできた無地の地。
// 枚数を増やすときは、下の配列に `require` を足す
// （Metro は変数のパスを解決できないので、**必ず直接書く**）。
const IMAGES = [
  require('../assets/splash/01.jpg'),
  require('../assets/splash/02.jpg'),
  require('../assets/splash/03.jpg'),
]

/** その日の地。`date` は `2026-08-16` の形。 */
export function splashImageFor(date) {
  if (!date) return IMAGES[0]
  // 日付の数字を足すだけ。**乱数を使わない**（同じ日は同じ地）
  const sum = [...date].reduce((acc, c) => acc + (Number(c) || 0), 0)
  return IMAGES[sum % IMAGES.length]
}

export const SPLASH_IMAGE_COUNT = IMAGES.length
