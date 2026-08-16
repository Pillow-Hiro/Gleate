// 起動画面からログイン画面への**受け渡し**。
//
// ## なぜ要るか
//
// 案（`code.html`）の演出は、起動画面が消えてログイン画面が現れる、
// という作りではない。**写真はそのまま残り、ぼけて沈み、
// その上にログインのカードが下から上がってくる。**
//
// つまり2つの画面が**同じ時間の中で動く**。
// ログイン画面は起動画面が去り始めたことを知らないと動き出せない。
//
// ## なぜ Context にしないか
//
// ログイン画面は起動画面の下にずっと居る（`app/_layout.jsx` は
// `<Stack>` と起動画面を並べて描く）。親子ではないので props で渡せない。
// Context を足すと、この1件のために全画面を包む層が増える。
//
// 状態は「出ている / 去り始めた」の2つだけなので、
// **小さな知らせ役**をひとつ置く。
//
// ## 状態
//
//   idle     … 起動画面は出ない（この起動では出さないと決まった）
//   showing  … 出ている。ログイン画面は待つ
//   leaving  … 去り始めた。ログイン画面は上がってよい
let state = 'idle'
const listeners = new Set()

/** 起動画面を出すと決まった。ログイン画面は待機する */
export function markShowing() {
  state = 'showing'
}

/** 起動画面は出さないと決まった。ログイン画面はすぐ上がってよい */
export function markSkipped() {
  // 去り始めたあとに呼ばれても巻き戻さない
  if (state !== 'leaving') state = 'idle'
}

/** 起動画面が去り始めた。**待っている画面に知らせる** */
export function markLeaving() {
  if (state === 'leaving') return
  state = 'leaving'
  for (const fn of [...listeners]) {
    try {
      fn()
    } catch (e) {
      // 1つが投げても残りには知らせる。**起動画面は必ず去る**
      console.warn('[Splash] 受け渡しの通知に失敗', e)
    }
  }
}

/** 待つべきか。false なら自分の間合いで動き出してよい */
export function isWaiting() {
  return state === 'showing'
}

/** 去り始めたら呼ばれる。**戻り値を呼ぶと解除**（useEffect の後始末に渡せる） */
export function onLeave(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** 検査用。画面からは呼ばない */
export function reset() {
  state = 'idle'
  listeners.clear()
}
