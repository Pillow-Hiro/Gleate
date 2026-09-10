import { authFetch } from './supabase'
import { invalidateLogs } from './logsCache'

// 灯りの受け皿。**画面より長生きする。**
//
// ## なぜ要るのか（2026-08-27）
//
// 作者から「Gleateの回答がすぐに消える」と報告があった。
//
// 記録を保存すると、親が記録を取り直す。取り直すと `RecordForm` の
// `key` が変わる——**その日の記録がまだ無い状態から、有る状態へ移る**ため
// （`key={existingLog ? existingLog.date : 'new-' + targetDate}`）。
// key が変わればフォームは作り直され、`aiResponse` は初期値に戻る。
//
// **その日の1件目でだけ起きる。** 2回目以降は key が変わらないので
// 消えない。だから「ときどき消える」ように見えていた。
//
// さらに悪いことに、`/api/light` の待ちは**作り直される前の画面**が
// 持っていた。返ってきた頃には、その画面はもう居ない。
// 灯りは受け取られず、どこにも残らなかった。
//
// ## どうするか
//
// **待ちも結果も画面の外に置く。** ここは React の外なので、
// フォームが何度作り直されても消えない。
// 作り直された側は、生えた時点でここを見る。
//
// 記録の一覧への反映（`invalidateLogs`）もここから呼ぶ。
// 呼ぶ主体が画面だと、その画面が居なくなった時点で呼ばれなくなる。
//
// ## いまも要る（2026-09-03）
//
// 紙の `key` は日付だけになった（`app/(tabs)/index.jsx`）ので、
// **保存では作り直されなくなった。** 上に書いた元の壊れ方は起きない。
//
// それでもここは残す。灯りは十数秒かかることがあり、その間に
// タブを移られれば紙は消える。**遅れて届くものを画面に持たせない**、
// という理由の方が先にあった。

const lights = new Map()
const waiting = new Set()
const listeners = new Set()
// **来なかった理由**（2026-09-04・作者から「Gleateの回答が
// 表示されない。回数制限がある？」）。
//
// 灯りは十数秒かかるので、**来ないことと遅いことが見分けられない。**
// 待つのをやめてよいと分かるように、理由を一言だけ持つ。
const notes = new Map()

function notify() {
  for (const fn of listeners) {
    try {
      fn()
    } catch (e) {
      console.warn('[灯り] 通知に失敗', e)
    }
  }
}

/** その日の灯り。無ければ空文字 */
export function getLight(date) {
  return lights.get(date) || ''
}

/** 灯りが来なかった理由。無ければ空文字（画面に出す一言） */
export function lightNote(date) {
  return notes.get(date) || ''
}

/** いま作っている最中か */
export function isLighting(date) {
  return waiting.has(date)
}

/** 変化を受け取る。**戻り値を呼ぶと外れる** */
export function subscribeLight(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** 書き直したときなど、前の灯りを捨てる。**理由も一緒に捨てる** */
export function forgetLight(date) {
  const had = lights.delete(date)
  notes.delete(date)
  if (had) notify()
}

/**
 * **ログアウトと退会で必ず呼ぶ。** 灯りは記録から作った文章で、
 * 前の人のものを次の人に見せない（`logsCache.js` の `forgetLogs` と対）。
 */
export function forgetAllLights() {
  lights.clear()
  waiting.clear()
  notes.clear()
  notify()
}

/**
 * 灯りをともす。**待たない。**
 *
 * 同じ日を重ねて頼まない。保存を続けて押しても通信は1本。
 *
 * `id` は**どの記録に付けるか**（2026-09-04）。渡さないとサーバーは
 * 日付で引いて、その日の1件目に付ける。1日に複数件置けるように
 * してから、2件目を書いた人に朝の記録への返事が返っていた。
 *
 * 受け皿の鍵は日付のまま。**画面が出すのは「いま書いたぶんの灯り」**
 * ひとつだけなので、日付で足りる（`components/LightPending.jsx`）。
 */
export function requestLight(date, id = '') {
  if (waiting.has(date)) return
  waiting.add(date)
  notify()

  authFetch('/api/light', { method: 'POST', body: JSON.stringify({ date, id: id || undefined }) })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      if (!j) return
      if (j.ai_response) {
        lights.set(date, j.ai_response)
        // 灯りは記録の一部として保存されている。一覧にも載せる
        invalidateLogs()
        return
      }
      // **来ない理由をサーバーが言ってきた**（`main.py` の `/api/light`）。
      // 待ち続けさせない
      if (j.reason === 'budget') {
        notes.set(date, `今日の灯りはここまでです（1日${j.limit || ''}回）。記録は残っています。`)
      } else if (j.reason === 'failed') {
        notes.set(date, '灯りをともせませんでした。記録は残っています。')
      }
    })
    .catch((e) => {
      // **記録は残っている。**言うのはそれだけ
      console.warn('[記録] 灯りを受け取れなかった', e)
      notes.set(date, '灯りをともせませんでした。記録は残っています。')
    })
    .finally(() => {
      waiting.delete(date)
      notify()
    })
}
