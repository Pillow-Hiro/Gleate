// 端末内に置く写真のファイル名を組み立てる／読み解く。
//
// 純粋関数だけを置く。ファイルシステムに触る処理は photoStore.js にある
// （vitest は lib/ の純粋関数だけを対象にしているため、分けておく）。
//
// ## 名前に時刻を入れている理由
//
// 同じ日の写真を選び直したとき、同じパスに上書きすると
// React Native の Image が古い画像をキャッシュから出し続ける。
// URI が変わらないので更新に気づけない。
// 保存のたびに新しい名前にして、古いファイルを消す。
//
//   2026-08-04__1754460000000.jpg
//   2026-08-04__1754460000000.thumb.jpg
//
// 日付を先頭に置いているので、ディレクトリを一覧するだけで
// 「どの日に写真があるか」が分かる。索引を別に持たない。

export const PHOTO_DIR = 'photos'

const SEP = '__'
const THUMB_SUFFIX = '.thumb.jpg'
const PHOTO_SUFFIX = '.jpg'

// サーバー側 modules/photos.py と同じ考え方で YYYY-MM-DD だけに固定する。
// Date のパースに任せると 20260801 のような表記も通り、
// 同じ日の写真が別名で二重に残る。
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isValidDate(date) {
  if (typeof date !== 'string' || !DATE_RE.test(date)) return false
  // 形式が合っていても 2026-02-30 のような日は受け付けない
  const d = new Date(`${date}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date
}

export function buildNames(date, stamp) {
  if (!isValidDate(date)) throw new Error(`不正な日付: ${date}`)
  if (!Number.isInteger(stamp) || stamp < 0) throw new Error(`不正な stamp: ${stamp}`)
  const base = `${date}${SEP}${stamp}`
  return { photo: `${base}${PHOTO_SUFFIX}`, thumb: `${base}${THUMB_SUFFIX}` }
}

// 一覧したファイル名から日付を取り出す。読めない名前は null を返して呼び出し側で捨てる。
// 想定外のファイルが混ざっても一覧全体を落とさないため、例外にしない。
export function parsePhotoName(name) {
  if (typeof name !== 'string') return null

  const isThumb = name.endsWith(THUMB_SUFFIX)
  const suffix = isThumb ? THUMB_SUFFIX : PHOTO_SUFFIX
  if (!name.endsWith(suffix)) return null

  const base = name.slice(0, -suffix.length)
  const at = base.indexOf(SEP)
  if (at < 0) return null

  const date = base.slice(0, at)
  const stamp = Number(base.slice(at + SEP.length))
  if (!isValidDate(date) || !Number.isInteger(stamp)) return null

  return { date, stamp, isThumb }
}

// 同じ日に複数の世代が残っていたら、いちばん新しいものを採る。
// 削除に失敗して古い世代が残った場合でも、表示は最新に寄る。
export function latestByDate(names) {
  const best = new Map()
  for (const name of names) {
    const parsed = parsePhotoName(name)
    if (!parsed) continue
    const cur = best.get(parsed.date)
    if (!cur || parsed.stamp > cur.stamp) {
      best.set(parsed.date, { stamp: parsed.stamp, photo: null, thumb: null })
    }
  }
  // 採用した世代のファイル名を割り当てる
  for (const name of names) {
    const parsed = parsePhotoName(name)
    if (!parsed) continue
    const entry = best.get(parsed.date)
    if (!entry || entry.stamp !== parsed.stamp) continue
    if (parsed.isThumb) entry.thumb = name
    else entry.photo = name
  }
  return best
}

// 採用しなかった世代。保存後の掃除に使う。
export function staleNames(names) {
  const best = latestByDate(names)
  return names.filter((name) => {
    const parsed = parsePhotoName(name)
    if (!parsed) return false
    return best.get(parsed.date).stamp !== parsed.stamp
  })
}
