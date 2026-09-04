// アカウントの印を決める。**アドレスだけから決まる。**
//
// 同じアドレスなら必ず同じ結果になる。乱数も時刻も使わない。
// 取り違えに気づくための印なので、**日によって変わっては意味がない。**
//
// **色は灯りの色から取る**（2026-09-04・作者の指示
// 「デフォルトで琥珀色なので、灯りの色と連動して変化させたい」）。
//
// それまでは琥珀の3色を直に書いていた。灯りの色を選べるように
// したので（`lib/accent.js`）、**月を選んでも印だけ琥珀のまま**だった。
//
// ここが返すのは**どの組を使うか**だけ。実際の色は `AccountMark` が
// いまの灯りと明暗から引く。この関数は `react-native` も色も知らない
// ——アドレスから決まる、という性質だけを持つ。
//
// 組は3つ。灯りの束の中で、**面と字が対になっているもの**を選んだ。
// 対でないものを混ぜると、選んだ色によって字が読めなくなる。
export const MARK_SLOTS = [
  { surface: 'aiSurface', ink: 'aiInk' },
  { surface: 'glow', ink: 'onGlow' },
  { surface: 'discoverySurface', ink: 'discoveryInk' },
]

function hash(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

export function markFor(email) {
  const address = (email || '').trim()
  // **@ の前の1文字目。** ドメインは人を見分ける材料にならない
  const head = address.split('@')[0] || '?'
  const initial = head.slice(0, 1).toUpperCase()
  const slot = MARK_SLOTS[hash(address.toLowerCase()) % MARK_SLOTS.length]
  return { initial, ...slot }
}
