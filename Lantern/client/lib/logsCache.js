import AsyncStorage from '@react-native-async-storage/async-storage'
import { authFetch } from './supabase'

// 記録の取り方を1か所にまとめる。
//
// ## なぜ要るか（2026-08-23）
//
// 作者から「全体的に読み込みが遅い」と報告があった。実装を見ると、
// **5つの画面がそれぞれ別に全記録を取っていた。**
//
//     home / index / journal / dashboard / settings → GET /api/logs
//
// しかも端末に控えていないので、**起動のたびに空から始まる。**
// タブを移るたびにも取り直す（`lib/refreshOnFocus.js`）。
// サーバーは温まっていれば 0.2〜0.8 秒で返すが、
// **それを画面の数だけ、移るたびに待っていた。**
//
// ## どう直すか
//
// 1. **控えを先に出す。** 端末に持っているものを即座に返す。
//    起動した瞬間に前回の記録が並ぶ
// 2. **裏で取り直す。** 新しいものが来たら `onFresh` で知らせる
// 3. **重ねて呼ばれても1回。** 同時に開いた画面が5つあっても
//    通信は1本
// 4. **15秒は取り直さない。** タブを行き来するだけで
//    毎回叩くのを止める
// 5. **2回目からは差分だけ。**（2026-08-27）手元の最終更新時刻を
//    `?since=` で送り、変わったものだけ受け取る
//
// ## 差分にした理由
//
// 3 と 4 で「取りに行く回数」は減ったが、**1回あたりの量は
// 記録の数だけ増え続ける。**39件のいまは軽い。数年ぶんが溜まると、
// 起動のたびに全部を運ぶことになる。
//
// 体感は控えが隠すので、**遅くなっても気づけない種類の遅さ**になる。
// 気づいたときには、直すのに移行が要る大きさになっている。
//
// **穴が1つある。消された記録は差分に現れない。**
// 同じ端末での削除は `replaceLogs` が控えを合わせる。
// 別の端末で消した場合は、`FULL_MS`（1日）ごとの全件取得で揃う。
//
// 画面の作りは変えていない。`authFetch('/api/logs')` を
// `loadLogs()` に置き換えただけ。**審査中なので手術範囲を狭くした。**
//
// ## 消し忘れに注意
//
// **ログアウトと退会で `forgetLogs()` を呼ぶこと。**
// 同じ端末を別の人が使ったとき、前の人の記録が一瞬見える。
// `tests/test_react_patterns.py` 相当の検査は無いので、
// 経路を増やしたら手で確かめる。

// **v2 になった**（2026-08-27）。中身が配列から
// `{ list, fullAt }` に変わったため、鍵ごと変えている。
// 古い鍵を読もうとして形が違えば、全件から取り直せばよいだけ。
const KEY = 'lantern.logs_v2'

// この時間内なら取り直さない。タブの行き来で毎回叩かないため
const FRESH_MS = 15000

// **これだけ経ったら全件を取り直す。**
//
// 差分同期には穴が1つある。**消された記録は差分に現れない。**
// 別の端末で消しても、こちらの控えには残り続ける。
// 同じ端末での削除は `replaceLogs` が控えを合わせるので出ない。
//
// 消えないより、1日ずれる方がまし。時計を戻してでも
// 完全な一致を取りにいくと、通信を減らした意味が無くなる。
const FULL_MS = 24 * 60 * 60 * 1000

let memo = null
let memoAt = 0
let fullAt = 0
let inflight = null

async function fromDisk() {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    const saved = raw ? JSON.parse(raw) : null
    if (!saved || !Array.isArray(saved.list)) return null
    fullAt = saved.fullAt || 0
    return saved.list
  } catch (e) {
    // 壊れた控えは無かったことにする。**画面は出す**
    console.warn('[記録] 控えを読めなかった', e)
    return null
  }
}

function persist(list) {
  AsyncStorage.setItem(KEY, JSON.stringify({ list, fullAt })).catch((e) => {
    console.warn('[記録] 控えを書けなかった', e)
  })
}

/** 手元の最終更新時刻。差分を求めるときに送る */
function latestSavedAt(list) {
  let latest = ''
  for (const l of list) {
    const t = l && l.saved_at
    if (t && t > latest) latest = t
  }
  return latest
}

/**
 * 差分を控えに畳み込む。**日付が同じものは新しい方で置き換える。**
 *
 * 記録は1日1件なので、日付が同一性そのもの。
 * `id` で突き合わせると、同じ日を書き直したときに2件に見える。
 */
function merge(base, changed) {
  if (!changed.length) return base
  const byDate = new Map(base.map((l) => [l.date, l]))
  for (const l of changed) byDate.set(l.date, l)
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

function fromServer() {
  // **重ねて呼ばれても1本。** 5画面が同時に開いても通信は1回
  if (inflight) return inflight
  inflight = (async () => {
    // 控えが無い・古すぎるなら全件。それ以外は前回より後のものだけ
    const stale = Date.now() - fullAt > FULL_MS
    const since = memo && memo.length && !stale ? latestSavedAt(memo) : ''
    try {
      const res = await authFetch(`/api/logs${since ? `?since=${encodeURIComponent(since)}` : ''}`)
      if (!res.ok) return null
      const data = await res.json()
      if (!Array.isArray(data)) return null

      memo = since ? merge(memo, data) : data
      memoAt = Date.now()
      if (!since) fullAt = memoAt
      persist(memo)
      return memo
    } catch (e) {
      // 取れなくても控えで画面は出る。**空にしない**
      console.warn('[記録] 取得に失敗', e)
      return null
    } finally {
      inflight = null
    }
  })()
  return inflight
}

/**
 * 記録を取る。**手元にあるものを先に返す。**
 *
 * `onFresh` は、返したものより新しいものが届いたときだけ呼ばれる。
 * 呼ばれない場合もある（十分に新しい／通信に失敗した）。
 */
export async function loadLogs(onFresh) {
  if (memo && Date.now() - memoAt < FRESH_MS) return memo

  if (memo) {
    fromServer().then((d) => { if (d && onFresh) onFresh(d) })
    return memo
  }

  const disk = await fromDisk()
  if (disk) {
    // **時刻は入れない。** サーバーのもので必ず上書きさせる
    memo = disk
    fromServer().then((d) => { if (d && onFresh) onFresh(d) })
    return disk
  }

  return (await fromServer()) || []
}

/**
 * **手元のものが古いと分かったときに呼ぶ。** 書いた直後がそれ。
 *
 * 2026-08-24 まで無かった。`loadLogs` は 15 秒以内なら控えを返し、
 * **取り直しもしない**（上の 4）。タブを移るだけで毎回叩かないための
 * 決まりだが、**自分で1件足した直後にも同じ扱いをしていた。**
 * 保存してから記録タブへ移ると、その1件が入っていない控えが
 * 最大15秒そのまま出る。「反映が遅い」の正体はこれ。
 *
 * 消したときは `replaceLogs` で中身が分かっている。
 * **書いたときは分からない**（サーバーが id や整形後の値を持つ）ので、
 * ここでは「古い」とだけ印を付けて、取り直しをその場で始める。
 * 移ってくる頃には終わっていることが多い。
 */
export function invalidateLogs() {
  memoAt = 0
  // 待たない。**取りに行かせるだけ。**画面はそのまま控えを出せる
  fromServer()
}

/**
 * 画面の側で1件消したときなど、手元のものを差し替える。
 *
 * **削除はここでしか控えに伝わらない。** 差分同期には
 * 消えた行が現れないため（`FULL_MS` を参照）。
 */
export function replaceLogs(next) {
  if (!Array.isArray(next)) return
  memo = next
  memoAt = Date.now()
  persist(next)
}

/** **ログアウトと退会で必ず呼ぶ。** 前の人の記録を次の人に見せない */
export async function forgetLogs() {
  memo = null
  memoAt = 0
  // **これも戻すこと。** 残すと、次の人の1回目が差分取得になり、
  // 手元が空なのに「前回以降だけ」を頼んでしまう
  fullAt = 0
  inflight = null
  try {
    await AsyncStorage.removeItem(KEY)
  } catch (e) {
    console.warn('[記録] 控えを消せなかった', e)
  }
}
