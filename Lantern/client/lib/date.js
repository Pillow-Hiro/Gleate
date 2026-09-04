// 日付・継続日数の共通ロジック
// ローカルタイムゾーン基準。toISOString() はUTC変換で日付がずれるため使わない。
//
// 2026-08-04 に frontend/ を廃止して一本化した。
// 二重保守が消えたため、一致検証テストも削除している。

export function localDateStr(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayStr() {
  return localDateStr()
}

// 連続記録日数。今日にまだ記録がなければ昨日を起点にするため、
// 未記録の当日が「継続が途切れた」扱いにならない。
// now はテストのための注入点。呼び出し側は logs だけを渡す。
export function calcStreak(logs, now = new Date()) {
  const logSet = new Set(logs.map(l => l.date))
  const start = new Date(now)
  if (!logSet.has(localDateStr(now))) start.setDate(start.getDate() - 1)
  let count = 0
  const check = new Date(start)
  for (let i = 0; i < 365; i++) {
    if (!logSet.has(localDateStr(check))) break
    count++
    check.setDate(check.getDate() - 1)
  }
  return count
}

// 「Nヶ月前の同じ日」。Insights の過去比較の起点。
// now はテストのための注入点。呼び出し側は months だけを渡す。
export function monthsAgoStr(months, now = new Date()) {
  const day = now.getDate()
  const target = new Date(now.getFullYear(), now.getMonth() - months, day)
  // 月末日オーバーフロー対応（例：3月31日 - 1ヶ月 → 2月31日 → 2月28日）
  if (target.getDate() !== day) target.setDate(0)
  return localDateStr(target)
}

// 1日に残せる記録の数。**`main.py` の `MAX_RECORDS_PER_DAY` と同じ数。**
// 止めているのはサーバー（超えると 409）。ここにあるのは、
// 書く前に「あと置けるかどうか」を言うためだけ。
export const MAX_RECORDS_PER_DAY = 3

// その日の記録。**1日に複数ありうる**（2026-09-02）。
// 保存した順（`saved_at` の昇順）に並べる。
//
// `saved_at` の無い古い記録は前に置く。並べ直す材料が無いので、
// 「先にあったもの」として扱うほかない。
export function logsOfDay(logs, date) {
  return logs
    .filter((l) => l.date === date)
    .sort((a, b) => {
      const x = a.saved_at || ''
      const y = b.saved_at || ''
      return x < y ? -1 : x > y ? 1 : 0
    })
}

// その日のいちばん新しい記録。無ければ null。
//
// **手がかりが指す先**でもある（`components/RecordForm.jsx`）。
// 書く紙はいつでも白紙なので、「いま何の話か」はここでしか分からない。
export function latestLogOf(logs, date) {
  const day = logsOfDay(logs, date)
  return day[day.length - 1] || null
}

/**
 * その日はもう書けないか。**書くボタンを出すかどうかの判定**
 * （2026-09-04・作者の指示でホーム・記録にも同じ扱いを広げた）。
 *
 * **数えるのは本物の記録だけ。** 写真だけの日にも札が立つが
 * （`lib/photoStore.js` の `attach`）、あれは `id` を持たず、
 * 行としては存在しない。混ぜるとサーバーの数え方（`main.py` の
 * `MAX_RECORDS_PER_DAY`）とずれて、**まだ置けるのにボタンが消える。**
 *
 * ホームと記録は写真を合流させた一覧を持っているので、ここを通さないと
 * 画面ごとに違う数を数えることになる。**判定はここ1か所。**
 */
export function isDayFull(logs, date) {
  return logsOfDay(logs, date).filter((l) => l.id).length >= MAX_RECORDS_PER_DAY
}

// 記録した**日数**。件数ではない（2026-09-03）。
// 1日に複数件置けるようにしてから、`logs.length` は日数と一致しない。
export function countDays(logs) {
  return new Set(logs.map((l) => l.date)).size
}

// 目標日から rangeInDays 日以内で最も近い記録を返す。該当なしなら null。
export function findNearestLog(logs, targetStr, rangeInDays = 3) {
  let best = null
  let bestDiff = Infinity
  for (const log of logs) {
    const diff = Math.abs((new Date(log.date) - new Date(targetStr)) / (1000 * 60 * 60 * 24))
    if (diff <= rangeInDays && diff < bestDiff) {
      best = log
      bestDiff = diff
    }
  }
  return best
}
