// キーボードまわりの計算だけ。**`react-native` を読み込まない。**
//
// 分けているのは検査のため。vitest は `react-native` を解決できないので
// （Flow の記法が入っている）、RN を読むファイルは検査から漏れる。
// `lib/imageMath.js` を切り出したのと同じ理由。
//
// 出入りを聞く側は `lib/keyboard.js`。

/**
 * 下にどれだけ空ければ、欄がキーボードにも装飾の列にも隠れないか。
 *
 * **安全域を二重に数えない。** iPhone の下端の余白（ホームバーの帯）は
 * キーボードが出ている間はキーボードに含まれる。両方足すと空けすぎて、
 * 画面が不自然に持ち上がる。
 */
export function keyboardHeadroom({
  keyboardHeight = 0,
  toolbarHeight = 0,
  safeBottom = 0,
} = {}) {
  const k = Number(keyboardHeight) || 0
  // キーボードが出ていないなら、空けるのは安全域だけ
  if (k <= 0) return Math.max(0, Number(safeBottom) || 0)
  return k + (Number(toolbarHeight) || 0)
}

/**
 * 窓（下に貼り付いた紙）の中身に許せる高さ。
 *
 * キーボードが出ると使える縦が減る。減ったぶんを見ずに
 * 「画面の7割」のままにすると、**紙が画面からはみ出す。**
 */
export function sheetMaxHeight({
  windowHeight = 0,
  keyboardHeight = 0,
  toolbarHeight = 0,
  ratio = 0.7,
  // つまみ・日付・閉じるボタンなど、一覧の外側が使う分
  chrome = 140,
} = {}) {
  const h = Number(windowHeight) || 0
  const usable = h - (Number(keyboardHeight) || 0) - (Number(toolbarHeight) || 0) - chrome
  const capped = Math.min(h * ratio, usable)
  // **最低限は残す。** 0 にすると欄が消えて、何も書けない窓になる
  return Math.max(160, capped)
}
