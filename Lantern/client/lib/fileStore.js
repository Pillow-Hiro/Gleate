import { Directory, File, Paths } from 'expo-file-system'

// 記録に添えるファイル。**端末の中だけに置く。**
//
// 写真と同じ判断（2026-08-06）。サーバーに置けば、
// **鍵を持つ開発者が中身を見られる。** 認可の設計では消せない、
// 置き場所そのものの問題だった。ファイルも同じ。
//
// 引き換えに、
// - **端末を変えると移らない**
// - Web では扱えない（`fileStore.web.js` が空を返す）
// - エクスポート（JSON）には入らない。記録の文章だけが出る
//
// 中身はアプリの書類フォルダに複製する。**選んだ元の場所は当てにしない。**
// 「ファイル」アプリの中身は、あとから消えたり動いたりする。
const DIR = 'attachments'

function dir() {
  const d = new Directory(Paths.document, DIR)
  if (!d.exists) d.create({ intermediates: true })
  return d
}

// `2026-08-15__1723699200__notes.pdf`（日付のもの）
// `2026-09-05__@3f9a__1757000000__notes.pdf`（記録ごと・2026-09-05）
//
// **記録ごとに持つ**（作者の指示）。1日に複数件置けるようにしてから、
// 日付で持つと**同じファイルがその日の全部の記録に付いた。**
//
// id の段には `@` を付ける。元の名前に `__` が入ることがあるので、
// **数字か否かで見分けると危うい。** 印があれば確実に分かれる。
//
// **古い名前は読めるまま残す。** 端末の中にしか無いものを、
// 付け替えの途中で失う危険を取らない（`lib/photoPath.js` と同じ判断）。
const ID_MARK = '@'

function nameFor(date, original, id = '') {
  const safe = original.replace(/[^\w.\-ぁ-んァ-ヶ一-龠]/g, '_')
  const owner = id ? `${ID_MARK}${id}__` : ''
  return `${date}__${owner}${Date.now()}__${safe}`
}

function parse(filename) {
  const parts = filename.split('__')
  if (parts.length < 3) return null
  const [date, second, ...rest] = parts
  if (second.startsWith(ID_MARK)) {
    if (rest.length < 2) return null
    const [stamp, ...name] = rest
    return { date, id: second.slice(1), stamp: Number(stamp), name: name.join('__') }
  }
  return { date, id: '', stamp: Number(second), name: rest.join('__') }
}

/**
 * 添えたファイルの一覧。
 *
 * `id` を渡すとその記録のもの、渡さなければ**日付のもの**（古い分）。
 * 混ぜない——混ぜると、記録ごとのファイルがその日の全部にも並ぶ。
 */
export function list(date, id = '') {
  try {
    return dir()
      .list()
      .map((f) => {
        const meta = parse(f.name)
        if (!meta) return null
        if (id ? meta.id !== id : meta.date !== date || meta.id) return null
        return { uri: f.uri, name: meta.name, size: f.size ?? 0, stamp: meta.stamp }
      })
      .filter(Boolean)
      .sort((a, b) => a.stamp - b.stamp)
  } catch (e) {
    console.warn('[File] 一覧の取得に失敗', e)
    return []
  }
}

/**
 * 書き出しに同梱する添付。**全部の日をまとめて返す。**
 *
 * `list(date)` は1日ぶんだが、ZIP には全部要る。
 * `stored` は端末の中の名前（日付と時刻が付いていて重複しない）、
 * `name` は利用者に見せる元の名前。
 */
export function exportEntries() {
  try {
    return dir()
      .list()
      .map((f) => {
        const meta = parse(f.name)
        if (!meta) return null
        return { date: meta.date, name: meta.name, stored: f.name, uri: f.uri }
      })
      .filter(Boolean)
  } catch (e) {
    console.warn('[File] 書き出し用の一覧に失敗', e)
    return []
  }
}

/** 選ばれたファイルを端末の中へ複製する */
export function save(date, sourceUri, originalName, id = '') {
  const target = new File(dir(), nameFor(date, originalName, id))
  new File(sourceUri).copy(target)
  return { uri: target.uri, name: originalName, size: target.size ?? 0 }
}

export function remove(uri) {
  try {
    const f = new File(uri)
    if (f.exists) f.delete()
  } catch (e) {
    console.warn('[File] 削除に失敗', e)
  }
}

/** 記録ごと消すとき（アカウント削除・記録の削除）に使う */
export function removeAll(date, id = '') {
  for (const f of list(date, id)) remove(f.uri)
}
