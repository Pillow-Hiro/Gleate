// Web では写真を扱わないため、何も描かない。
//
// 写真は端末の中だけに置く（2026-08-06〜）。ブラウザには、その方針で
// 使える保存領域が無い。詳しい理由は lib/photoStore.web.js にある。
//
// **null を返すだけのファイルを別に置いているのは、バンドルのため。**
// 1つのファイルの中で分岐すると、expo-image-picker と写真まわりの文言が
// Web にも乗る。呼び出し側は分岐を持たず、Metro がこちらを選ぶ。
export default function PhotoPicker() {
  // `onReady` を呼ばないので、キーボードの上の列にも写真は出ない。
  // Web には置き場所が無い（`lib/photoStore.web.js`）
  return null
}
