// 日付・継続日数の共通ロジック
// ローカルタイムゾーン基準。toISOString() はUTC変換で日付がずれるため使わない。

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
export function calcStreak(logs) {
  const logSet = new Set(logs.map(l => l.date))
  const start = new Date()
  if (!logSet.has(todayStr())) start.setDate(start.getDate() - 1)
  let count = 0
  const check = new Date(start)
  for (let i = 0; i < 365; i++) {
    if (!logSet.has(localDateStr(check))) break
    count++
    check.setDate(check.getDate() - 1)
  }
  return count
}
