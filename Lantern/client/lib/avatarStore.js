import { Directory, File, Paths } from 'expo-file-system'

// アカウントの画像。**端末の中だけに置く。**
//
// 写真・添付と同じ判断（2026-08-06 / 08-15）。
// サーバーに置けば、鍵を持つ開発者が顔写真を見られる。
// **アカウントの画像は、記録の写真よりも本人に近い。**
//
// 引き換えに、
// - 端末を変えると移らない
// - Web では設定できない（`avatarStore.web.js` が「使えない」を返す）
//
// 1枚だけ。名前は固定なので、選び直すと上書きされる。
const NAME = 'avatar.jpg'

function file() {
  return new File(new Directory(Paths.document), NAME)
}

export const isSupported = true

/** 端末に画像があればその場所を返す。無ければ null */
export function load() {
  try {
    const f = file()
    // **URL に印を付ける。** 同じ場所を上書きするので、
    // 付けないと選び直しても古い絵が出たままになる（`Image` の覚え）
    return f.exists ? `${f.uri}?v=${f.modificationTime ?? Date.now()}` : null
  } catch (e) {
    console.warn('[Avatar] 読み込みに失敗', e)
    return null
  }
}

/** 選ばれた画像を端末の中へ複製する */
export function save(sourceUri) {
  const target = file()
  if (target.exists) target.delete()
  new File(sourceUri).copy(target)
  return load()
}

export function remove() {
  try {
    const f = file()
    if (f.exists) f.delete()
  } catch (e) {
    console.warn('[Avatar] 削除に失敗', e)
  }
}
