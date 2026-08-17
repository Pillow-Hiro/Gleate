// Web ではファイルを扱わない。
//
// 置き場所が無い（写真と同じ理由・`photoStore.web.js`）。
// ブラウザの保存領域はキャッシュ削除で消えるので、
// **記録アプリで「いつか消える添付」を受け付けない。**
export function list() {
  return []
}

// Web には端末の中の置き場が無い。**書き出しに同梱するものも無い。**
export function exportEntries() {
  return []
}

export function save() {
  throw new Error('unsupported')
}

export function remove() {}

export function removeAll() {}
