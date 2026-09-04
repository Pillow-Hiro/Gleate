// 写真を端末の中だけに置く（ネイティブ）。Web版は photoStore.web.js。
//
// ## なぜサーバーに送らないのか
//
// 2026-08-06 に Supabase Storage への保存をやめた。
// 保存されていれば、サーバーの鍵を持つ開発者が中身を見られる。
// 認可の設計では消せない、置き場所そのものの問題だった。
//
// 記録の文章は Supabase に残り、保存時に Anthropic にも渡る。
// 写真だけを端末に閉じたのは、写真の方が写り込む情報が多いため。
// 線引きは REQUIREMENTS.md にある。
//
// ## 引き換えに失ったもの
//
// - 端末を変えると写真は移らない
// - Web では写真を扱えない（ブラウザの保存領域はキャッシュ削除で消えるため、
//   「消えることがある写真」を記録アプリに置かない）
//
// ## 置き場所
//
// documentDirectory の下。cacheDirectory ではない。
// cache は OS が容量不足のときに黙って消す。
// document は消されず、iOS のバックアップにも入る。

import { Directory, File, Paths } from 'expo-file-system'
import { PHOTO_DIR, buildNames, latestByDate, latestById, parsePhotoName, staleNames } from './photoPath'

export const PHOTOS_SUPPORTED = true

function dir() {
  const d = new Directory(Paths.document, PHOTO_DIR)
  // idempotent なので毎回呼んでよい。存在確認との競合も起きない
  d.create({ intermediates: true, idempotent: true })
  return d
}

function names() {
  try {
    return dir().list().map((entry) => entry.name)
  } catch (e) {
    // 一覧できなくても記録そのものは見せたい
    console.warn('[Photo] 写真の一覧に失敗', e)
    return []
  }
}

function uriOf(name) {
  return name ? new File(dir(), name).uri : null
}

/** 日付 → { photo_url, photo_thumb_url } の Map。記録一覧に合流させるために使う。 */
export function loadAll() {
  const found = new Map()
  for (const [date, entry] of latestByDate(names())) {
    found.set(date, {
      photo_url: uriOf(entry.photo),
      photo_thumb_url: uriOf(entry.thumb) || uriOf(entry.photo),
    })
  }
  return found
}

/**
 * 書き出しに同梱する原寸の写真。**縮小版は入れない。**
 *
 * `loadAll()` は画面に出すための URI を返すが、こちらは
 * **ZIP に入れる実体**が要るので、名前と一緒に返す。
 */
/** 記録の id → { photo_url, photo_thumb_url }（2026-09-05） */
export function loadAllById() {
  const found = new Map()
  for (const [id, entry] of latestById(names())) {
    found.set(id, {
      photo_url: uriOf(entry.photo),
      photo_thumb_url: uriOf(entry.thumb) || uriOf(entry.photo),
    })
  }
  return found
}

// 書き出しは日付でまとめる。**中身は全部入れる**ので、
// 記録ごとのものも日付のものも一緒に出す
export function exportEntries() {
  const out = []
  const all = names()
  for (const [date, entry] of latestByDate(all)) {
    if (!entry.photo) continue
    out.push({ date, name: entry.photo, uri: uriOf(entry.photo) })
  }
  for (const [, entry] of latestById(all)) {
    if (!entry.photo) continue
    const parsed = parsePhotoName(entry.photo)
    out.push({ date: parsed.date, name: entry.photo, uri: uriOf(entry.photo) })
  }
  return out
}

const NONE = { photo_url: null, photo_thumb_url: null }

export function load(date) {
  return loadAll().get(date) || NONE
}

/** その記録の写真（2026-09-05・作者の指示で記録ごとに持つ） */
export function loadFor(id) {
  return (id && loadAllById().get(id)) || NONE
}

/**
 * 圧縮済みの2枚を取り込む。取り込み後に古い世代を消す。
 *
 * 先に消してから書くと、途中で失敗したときに写真が無くなる。
 * 新しいものを置いてから古いものを消す順にしている。
 */
export function save(date, photoUri, thumbUri, id = '') {
  const target = dir()
  const { photo, thumb } = buildNames(date, Date.now(), id)

  new File(photoUri).copy(new File(target, photo), { overwrite: true })
  new File(thumbUri).copy(new File(target, thumb), { overwrite: true })

  cleanup()
  return id ? loadFor(id) : load(date)
}

/**
 * 消す。**持ち主のものだけ。**（2026-09-05）
 *
 * 名前の前方一致で消していたので、`id` を足すと**その日の記録ぜんぶの
 * 写真が消える**ようになっていた。名前を読み解いて持ち主を確かめる。
 */
export function remove(date, id = '') {
  const target = dir()
  for (const name of names()) {
    const parsed = parsePhotoName(name)
    if (!parsed) continue
    if (id ? parsed.id !== id : parsed.date !== date || parsed.id) continue
    try {
      new File(target, name).delete()
    } catch (e) {
      console.warn(`[Photo] 削除に失敗 ${name}`, e)
    }
  }
}

/** 採用しなかった世代を消す。失敗しても表示は最新に寄るので、握って進む。 */
function cleanup() {
  const target = dir()
  for (const name of staleNames(names())) {
    try {
      new File(target, name).delete()
    } catch (e) {
      console.warn(`[Photo] 古い世代の削除に失敗 ${name}`, e)
    }
  }
}

/**
 * サーバーから取った記録に、端末の写真を合流させる。
 *
 * **写真しかない日も1件として返す。** 写真を端末に移したことで、
 * 「文章が書けない日でも写真1枚なら残せる」が壊れないようにするため
 * （REQUIREMENTS.md F1）。サーバーはその日を知らないので、ここで補う。
 */
export function attach(logs) {
  const found = loadAll()
  const byId = loadAllById()
  // **記録に紐づいたものが先**（2026-09-05）。無ければ日付のもの——
  // 付け替えていない古い写真は、これまでどおりその日の記録に付く
  const merged = logs.map((log) => ({
    ...log,
    ...((log.id && byId.get(log.id)) || found.get(log.date) || {}),
  }))

  const known = new Set(logs.map((l) => l.date))
  const photoOnly = [...found.entries()]
    .filter(([date]) => !known.has(date))
    .map(([date, urls]) => ({
      date,
      created: '',
      enjoyable: '',
      struggled: '',
      next: '',
      ai_response: '',
      saved_at: '',
      ...urls,
    }))

  return [...merged, ...photoOnly].sort((a, b) => (a.date < b.date ? -1 : 1))
}
