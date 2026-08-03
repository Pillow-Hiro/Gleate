// 日付・継続日数の共通ロジック
// ローカルタイムゾーン基準。toISOString() はUTC変換で日付がずれるため使わない。
//
// frontend/src/lib/date.js と mobile/lib/date.js は同一内容を保つこと。
// （Vercelの配信元をExpo Web出力へ切り替えた時点で frontend 側を廃止し一本化する）
// frontend/src/lib/date.test.js が2ファイルの一致を検証している。

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
