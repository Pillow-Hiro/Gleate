// アカウントの印を決める。**アドレスだけから決まる。**
//
// 同じアドレスなら必ず同じ結果になる。乱数も時刻も使わない。
// 取り違えに気づくための印なので、**日によって変わっては意味がない。**
//
// 色は琥珀の周りの3色だけ。世界観の外の色を混ぜない。
const PALETTE = [
  { background: '#FFF0DB', ink: '#6C4500' }, // 砂
  { background: '#FBB03B', ink: '#1D1D1F' }, // 灯り
  { background: '#F2E6D6', ink: '#514535' }, // 生成り
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
  const color = PALETTE[hash(address.toLowerCase()) % PALETTE.length]
  return { initial, ...color }
}
