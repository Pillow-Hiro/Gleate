import AsyncStorage from '@react-native-async-storage/async-storage'

// 「日記の候補」から選んだもの。**端末の中だけ**（2026-09-06・作者の指示
// 「✨の役割は選んだ項目をカード化して、入力フィールドの上部分に貼り付ける」）。
//
// ## なぜ本文に書かなくなったか
//
// それまでは選んだ一行を**本文へ差し込んでいた**（`lanternInsert`）。
// 作者の報告——「曲だったら、曲名とアーティスト名だけが載る」。
// **書く場所に、自分の言葉ではないものが混ざる。**
//
// 添えるものとして扱えば混ざらない。写真・ファイル・リンクと同じ扱いで、
// **紙の上に置く。**書く場所は書く人のものにしておく。
//
// ## 端末の中だけ
//
// 写真とファイルとリンクと同じ線引き（`lib/photoStore.js`）。
// 中身は短い文字列だが、**何を聴き、どこへ行ったかは、書いた内容と
// 同じくらいその人のことを語る。**サーバーへは送らない。
//
// ## 記録ごとに持つ
//
// 鍵は記録の `id`。日付ではない——1日に複数件置けるので、日付だと
// **同じものがその日の全部の記録に付く**（写真で通った道）。
//
// ## 読みは同期で返す
//
// 画面は描くときに一覧が要る。**一度読んで覚え、以後は覚えから返す。**

const KEY = 'lantern.suggest_v1'

// id → [{ text }]
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
        console.warn('[候補] 読み込みに失敗', e)
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
    console.warn('[候補] 保存に失敗', e)
  })
}

/** その記録に添えた候補。**読み込み前は空** */
export function list(id) {
  if (!cache || !id) return []
  return cache[id] || []
}

/**
 * 1つ足す。**同じ字は二度足さない。**
 *
 * 戻り値は足せたかどうか。
 */
export function add(id, text, kind, sub, art) {
  const body = String(text == null ? '' : text).trim()
  if (!id || !body) return false
  if (!cache) cache = {}

  const current = cache[id] || []
  if (current.some((e) => e.text === body)) return true

  // **種類は Swift が付けてくる**（2026-09-07）。無ければ持たない
  // ——形から推し量るのは受け取る側の仕事（`lib/suggestCard.js`）
  const entry = { text: body }
  if (kind) entry.kind = kind
  if (sub) entry.sub = sub
  // 絵は**端末の中のファイルへの道**（`file://`）。Apple が置いたもので、
  // こちらは道だけ覚える。**中身を持たないので、いつか消えることがある**
  // ——消えていたら記号に戻す（`components/SuggestCards.jsx`）
  if (art) entry.art = art

  cache[id] = [...current, entry]
  persist()
  return true
}

export function remove(id, text) {
  if (!cache || !cache[id]) return
  cache[id] = cache[id].filter((e) => e.text !== text)
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
 * （`lib/linkStore.js` の `forgetAll` と対）。
 */
export function forgetAll() {
  cache = {}
  AsyncStorage.removeItem(KEY).catch((e) => {
    console.warn('[候補] 消去に失敗', e)
  })
}
