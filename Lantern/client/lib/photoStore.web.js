// Web では写真を扱わない。
//
// 2026-08-06 に写真を端末内だけに置く方針へ変えた（理由は photoStore.js）。
// ブラウザには、その方針で使える保存領域が無い。
// IndexedDB は容量の逼迫やキャッシュ削除で消える。
// **記録アプリで「いつか消える写真」を受け付けるのは、
// 「後で振り返れる」を壊すので採らない。**
//
// 中途半端に置けるようにするより、置けないと分かる方がよい。
// PhotoPicker は PHOTOS_SUPPORTED を見て、Web では何も描かない。

export const PHOTOS_SUPPORTED = false

export function loadAll() {
  return new Map()
}

// Web には端末の中の置き場が無い。**書き出しに同梱するものも無い。**
export function exportEntries() {
  return []
}

export function loadAllById() {
  return new Map()
}

// **口だけ合わせる。** 呼ぶ側が Web かどうかを見なくて済む
export function loadFor() {
  return { photo_url: null, photo_thumb_url: null }
}

export function load() {
  return { photo_url: null, photo_thumb_url: null }
}

export function save() {
  throw new Error('Web では写真を保存しません')
}

export function remove() {}

// 記録一覧はそのまま通す。合流させる写真が無いだけで、記録は変わらない。
export function attach(logs) {
  return logs
}
