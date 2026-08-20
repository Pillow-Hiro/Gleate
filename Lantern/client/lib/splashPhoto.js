import { Directory, File, Paths } from 'expo-file-system'

// 起動画面の写真を、**端末に覚えさせる。**
//
// ## なぜ
//
// 写真は Unsplash から取っている。届くまでの間は何も出せないので、
// 起動画面は**待つか、別のものを出すか**しかなかった。
// サーバーが眠っていれば数十秒かかる。
//
// **一度取った写真を端末に残しておけば、次からは開いた瞬間に出せる。**
// 通信を待たない。オフラインでも出る。
//
// ## その場では差し替えない
//
// 新しく取れた写真は**次回のために置くだけ**で、いま出ている地は変えない。
// 見ている最中に背景が変わるのは、作者が嫌がった動き。
//
// つまり1日ずれる。**昨日の写真が今日出る。**
// 起動画面の写真は「その日を表すもの」ではないので、ずれても困らない。
//
// ## 初回だけ写真が無い
//
// そのときは同梱の地を使う（`lib/splashImage.js`）。
// 濃紺の無地ではなく、琥珀と夜でできた地が出る。
const NAME = 'splash-photo.jpg'

// 撮影者の名前を、**写真と同じ場所に、同じ時に置く。**
//
// Unsplash の API 利用規約は、写真を出すたびに
// 撮影者と Unsplash への帰属表示を求めている。
//
// **別々に持たない。** 出しているのは「覚えている写真」で、
// 取ってきたばかりの写真ではない（上の「その場では差し替えない」）。
// 名前だけ先に新しくなると、**違う人の名前が出る。**
const CREDIT_NAME = 'splash-photo.credit'

export const isSupported = true

function file() {
  return new File(new Directory(Paths.document), NAME)
}

function creditFile() {
  return new File(new Directory(Paths.document), CREDIT_NAME)
}

/** 覚えている写真の撮影者。無ければ空。**同期で返す**（写真と同じ理由） */
export function loadCachedCredit() {
  try {
    const f = creditFile()
    return f.exists ? (f.textSync() || '') : ''
  } catch (e) {
    console.warn('[Splash] 撮影者の読み込みに失敗', e)
    return ''
  }
}

/** 覚えている写真。無ければ null。**同期で返す**（描く前に決めたいので） */
export function loadCached() {
  try {
    const f = file()
    return f.exists ? f.uri : null
  } catch (e) {
    console.warn('[Splash] 写真の読み込みに失敗', e)
    return null
  }
}

/** 次回のために置く。**いま出ている地は変えない。** */
export async function cacheForNextTime(url, photographer = '') {
  if (!url) return
  try {
    // 先に仮の名前で落としてから差し替える。
    // 直接上書きすると、途中で失敗したときに壊れた画像が残る
    const dir = new Directory(Paths.document)
    const tmp = new File(dir, `${NAME}.downloading`)
    if (tmp.exists) tmp.delete()

    const downloaded = await File.downloadFileAsync(url, tmp)
    const target = file()
    if (target.exists) target.delete()
    downloaded.move(target)

    // **写真を置き替えたあとに名前を書く。** 逆にすると、
    // 落とすのに失敗したとき、古い写真に新しい名前が付く
    const credit = creditFile()
    if (credit.exists) credit.delete()
    credit.create()
    credit.write(String(photographer || ''))
  } catch (e) {
    // 覚えられなくても起動画面は出る
    console.warn('[Splash] 写真を覚えられなかった', e)
  }
}
