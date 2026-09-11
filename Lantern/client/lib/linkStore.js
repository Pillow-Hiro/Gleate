import AsyncStorage from '@react-native-async-storage/async-storage'
import { linkKey, parseAttachLink } from './attachLink'
import { recentFrom } from './musicSearch'

// 記録に添えたリンク。**端末の中だけ**（2026-09-05・作者の指示）。
//
// はじめは音楽だけだった。作者から「YouTube や他のリンクも」と言われて
// 広げ、名前も `musicStore` から改めた（`lib/attachLink.js`）。
//
// 写真とファイルと同じ線引き（`lib/photoStore.js`）。中身はリンクの
// 文字列だけだが、**何を見て、何を聴いていたかは、書いた内容と
// 同じくらいその人のことを語る。**サーバーへは送らない。
//
// 覚えの鍵は `lantern.music_v1` のまま。**替えると、いま添えてある
// ものが読めなくなる。**中身の形は変わっていない。
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

// **「前に添えた曲」から伏せたもの**（2026-09-11・作者の指示
// 「添えるで前に添えた曲を消せるようにしたいです」）。
//
// ## 元の記録は消さない
//
// あの一覧は、**過去の記録に添いているものを集めて作っている**
// （`recentSounds`）。そこから消すことを「元を消す」にすると、
// **どの日の記録が変わったのか画面から分からないまま中身が減る。**
//
// なので消すのは**候補に出す／出さない**だけ。記録は触らない。
// 伏せた曲をもう一度添えれば、また出るようになる。
const HIDDEN_KEY = 'lantern.music_hidden_v1'

// id → [{ url, service, serviceLabel, kind, title, label }]
let cache = null
let loading = null
// 伏せた曲の鍵（`linkKey`）の集まり
let hidden = null

/** 最初の一回だけ読む。**以後は覚えから返す** */
export function ensureLoaded() {
  if (cache) return Promise.resolve()
  if (!loading) {
    loading = AsyncStorage.multiGet([KEY, HIDDEN_KEY])
      .then((pairs) => {
        const got = Object.fromEntries(pairs)
        cache = got[KEY] ? JSON.parse(got[KEY]) : {}
        hidden = new Set(got[HIDDEN_KEY] ? JSON.parse(got[HIDDEN_KEY]) : [])
      })
      .catch((e) => {
        // 読めなくても記録は読める。**空として進む**
        console.warn('[リンク] 読み込みに失敗', e)
        cache = {}
        hidden = new Set()
      })
      .finally(() => {
        loading = null
      })
  }
  return loading
}

function persist() {
  AsyncStorage.setItem(KEY, JSON.stringify(cache || {})).catch((e) => {
    console.warn('[リンク] 保存に失敗', e)
  })
}

/** その記録に添えたリンク。**読み込み前は空** */
export function list(id) {
  if (!cache || !id) return []
  return cache[id] || []
}

/**
 * 前に添えた音のものを、新しい順に少しだけ（2026-09-06）。
 *
 * **端末の中だけを見る。**外へは何も聞きに行かない
 * （選び方は `lib/musicSearch.js` の `recentFrom`）。
 */
export function recentSounds(limit) {
  if (!cache) return []
  // **伏せたものを外してから数える。**外したぶん、次のものが繰り上がる
  const skip = hidden || new Set()
  return recentFrom(Object.values(cache), limit, (url) => skip.has(linkKey(url)))
}

/**
 * 「前に添えた曲」から伏せる。**記録からは消さない**（冒頭の節）。
 *
 * 鍵で覚える（`?si=` のような付き物を無視するため）。
 */
export function hideSound(url) {
  if (!hidden) hidden = new Set()
  hidden.add(linkKey(url))
  AsyncStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden])).catch((e) => {
    console.warn('[リンク] 伏せたものの保存に失敗', e)
  })
}

/**
 * 貼られた文から1つ足す。**読めなければ何もしない。**
 *
 * 戻り値は足せたかどうか。呼ぶ側は、偽なら「読めなかった」と伝える。
 *
 * `label` を渡すと、一覧に出す字をそれにする（2026-09-05）。
 * **Apple Music を探して選んだときだけ使う。**道筋から作り直すと
 * `Creep` が `creep` になり、**押した字と違うものが残る**
 * （`lib/musicSearch.js` の `songLabel`）。
 *
 * **貼ったときは渡さない。**貼られた URL の題名は取りに行かない、
 * という決めがある（`lib/attachLink.js`）。
 */
export function add(id, input, label) {
  if (!id) return false
  let entry = parseAttachLink(input)
  if (!entry) return false
  if (label) entry = { ...entry, label }
  if (!cache) cache = {}

  const current = cache[id] || []
  // **同じものを二度足さない。**`?si=` のような付き物は無視して見比べる
  const key = linkKey(entry.url)
  if (current.some((e) => linkKey(e.url) === key)) return true

  cache[id] = [...current, entry]
  persist()
  return true
}

export function remove(id, url) {
  if (!cache || !cache[id]) return
  const key = linkKey(url)
  cache[id] = cache[id].filter((e) => linkKey(e.url) !== key)
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
    console.warn('[リンク] 消去に失敗', e)
  })
}
