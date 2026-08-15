// Web では写真を端末に覚えさせない。
//
// ブラウザの保存領域はキャッシュ削除で消えるうえ、
// **ブラウザ自身が同じ URL を覚えている。** 二重に持つ理由がない。
//
// 同梱の地（`lib/splashImage.js`）が出る。
export const isSupported = false

export function loadCached() {
  return null
}

export async function cacheForNextTime() {}
