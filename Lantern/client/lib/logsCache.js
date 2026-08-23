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

const KEY = 'lantern.logs_v1'

// この時間内なら取り直さない。タブの行き来で毎回叩かないため
const FRESH_MS = 15000

let memo = null
let memoAt = 0
let inflight = null

async function fromDisk() {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    const saved = raw ? JSON.parse(raw) : null
    return Array.isArray(saved) ? saved : null
  } catch (e) {
    // 壊れた控えは無かったことにする。**画面は出す**
    console.warn('[記録] 控えを読めなかった', e)
    return null
  }
}

function persist(list) {
  AsyncStorage.setItem(KEY, JSON.stringify(list)).catch((e) => {
    console.warn('[記録] 控えを書けなかった', e)
  })
}

function fromServer() {
  // **重ねて呼ばれても1本。** 5画面が同時に開いても通信は1回
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const res = await authFetch('/api/logs')
      if (!res.ok) return null
      const data = await res.json()
      if (!Array.isArray(data)) return null
      memo = data
      memoAt = Date.now()
      persist(data)
      return data
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

/** 画面の側で1件消したときなど、手元のものを差し替える */
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
  inflight = null
  try {
    await AsyncStorage.removeItem(KEY)
  } catch (e) {
    console.warn('[記録] 控えを消せなかった', e)
  }
}
