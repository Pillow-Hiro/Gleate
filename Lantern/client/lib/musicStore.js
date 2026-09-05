import AsyncStorage from '@react-native-async-storage/async-storage'
import { musicKey, parseMusicLink } from './musicLink'

// 記録に添えた音楽。**端末の中だけ**（2026-09-05・作者の指示）。
//
// 写真とファイルと同じ線引き（`lib/photoStore.js`）。中身はリンクの
// 文字列だけだが、**何を聴いていたかは、書いた内容と同じくらい
// その人のことを語る。**サーバーへは送らない。
//
// ## なぜ AsyncStorage か
//
// 写真とファイルは実体があるので書類フォルダに置く。こちらは短い文字列。
// ファイルにすると、1曲ごとに1ファイルが増えて掃除の相手が増える。
//
// ## 記録ごとに持つ
//
// 鍵は記録の `id`。日付ではない——1日に複数件置けるので、日付だと
// **同じ曲がその日の全部の記録に付く**（写真で通った道）。
//
// ## 読みは同期で返す
//
// AsyncStorage は非同期だが、画面は描くときに一覧が要る。
// **一度読んで覚えておき、以後は覚えから返す。**
// 最初の一回だけ `ensureLoaded()` を待つ。

const KEY = 'lantern.music_v1'

// id → [{ url, service, serviceLabel, kind, title, label }]
let cache = null
let loading = null

/** 最初の一回だけ読む。**以後は覚えから返す** */
export function ensureLoaded() {
  if (cache) return Promise.resolve()
  if (!loading) {
    loading = AsyncStorage.getItem(KEY)
      .then((raw) => {
        cache = raw ? JSON.parse(raw) : {}
      })
      .catch((e) => {
        // 読めなくても記録は読める。**空として進む**
        console.warn('[音楽] 読み込みに失敗', e)
        cache = {}
      })
      .finally(() => {
        loading = null
      })
  }
  return loading
}

function persist() {
  AsyncStorage.setItem(KEY, JSON.stringify(cache || {})).catch((e) => {
    console.warn('[音楽] 保存に失敗', e)
  })
}

/** その記録に添えた音楽。**読み込み前は空** */
export function list(id) {
  if (!cache || !id) return []
  return cache[id] || []
}

/**
 * 貼られた文から1つ足す。**読めなければ何もしない。**
 *
 * 戻り値は足せたかどうか。呼ぶ側は、偽なら「読めなかった」と伝える。
 */
export function add(id, input) {
  if (!id) return false
  const entry = parseMusicLink(input)
  if (!entry) return false
  if (!cache) cache = {}

  const current = cache[id] || []
  // **同じものを二度足さない。**`?si=` のような付き物は無視して見比べる
  const key = musicKey(entry.url)
  if (current.some((e) => musicKey(e.url) === key)) return true

  cache[id] = [...current, entry]
  persist()
  return true
}

export function remove(id, url) {
  if (!cache || !cache[id]) return
  const key = musicKey(url)
  cache[id] = cache[id].filter((e) => musicKey(e.url) !== key)
  if (cache[id].length === 0) delete cache[id]
  persist()
}

/** 記録を消したときに一緒に消す */
export function removeAll(id) {
  if (!cache || !cache[id]) return
  delete cache[id]
  persist()
}

/**
 * **ログアウトと退会で必ず呼ぶ。** 前の人のものを次の人に見せない
 * （`lib/logsCache.js` の `forgetLogs` と対）。
 */
export function forgetAll() {
  cache = {}
  AsyncStorage.removeItem(KEY).catch((e) => {
    console.warn('[音楽] 消去に失敗', e)
  })
}
