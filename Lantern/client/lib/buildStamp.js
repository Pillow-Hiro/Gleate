import * as Updates from 'expo-updates'

// **いま動いているのがどれかを、画面から言えるようにする**（2026-09-06）。
//
// ## なぜ要ったか
//
// 実機で「装飾の列が出ない」と報告があり、直しを配信した。
// 出ない。作者「ビルド26に出してますか？」——**答えられなかった。**
//
// サーバー側は確かめられる（`eas channel:view`）。届いていることも、
// 狙いが合っていることも分かる。**分からないのは端末の側。**
//
// - 端末はビルド26 なのか（25 や App Store の 22 のままではないか）
// - 配信は取り込まれたのか（`expo-updates` は次回の起動で当たる）
//
// これが見えないと、**直っていないのか、届いていないのかが
// 区別できない。**区別できないまま次の直しを出すと、
// 当たったかどうかも分からないまま積み上がる。
//
// ## 出すもの
//
// 版数（`1.1.0`）と、**いま動いている中身の出どころ。**
//
// - 焼き込みのまま … 配信を1つも取り込んでいない
// - 配信の日時 … その時刻の配信で動いている
//
// 日時にしたのは、**id では照らし合わせられない**から。
// 「9/6 0:41 の配信です」と言えば、こちらの記録とすぐ突き合わせられる。

/** いま動いている中身の出どころ。画面にそのまま出せる一行 */
export function buildStamp() {
  try {
    // **開発中は焼き込みでもなんでもない。**紛らわしいので黙る
    if (__DEV__) return '開発中'
    if (Updates.isEmbeddedLaunch) return '同梱のまま'
    const at = Updates.createdAt
    if (!at) return '配信ずみ'
    return `配信 ${stampOf(at)}`
  } catch (e) {
    // **ここでアプリを止めない。**版数が出ないだけ
    console.warn('[版数] 出どころを読めなかった', e)
    return ''
  }
}

/** `2026/9/6 0:41` の形。**秒は要らない**——照らし合わせるだけ */
export function stampOf(date) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const mm = d.getMonth() + 1
  const dd = d.getDate()
  const hh = d.getHours()
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}/${dd} ${hh}:${mi}`
}
