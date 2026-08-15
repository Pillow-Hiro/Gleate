// Web にはアカウントの画像を置かない。
//
// 端末の中だけに置くと決めており（`avatarStore.js`）、
// ブラウザの保存領域はキャッシュ削除で消える。
// **消える置き場所に顔写真を預からせない。**
export const isSupported = false

export function load() {
  return null
}

export function save() {
  throw new Error('unsupported')
}

export function remove() {}
