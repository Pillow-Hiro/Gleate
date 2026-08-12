// 表示用フォーマッタ。
//
// 2026-08-04 に frontend/ を廃止して一本化した。
// 二重保守が消えたため、一致検証テストも削除している。
const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土']

export function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function monthLabel(dateStr) {
  const [y, m] = dateStr.split('-')
  return `${y}年${Number(m)}月`
}

export function dayLabel(dateStr) {
  const d = parseDate(dateStr)
  return `${d.getDate()}日 ${WEEKDAYS_JA[d.getDay()]}`
}

// 一覧に出す日付。**近い日は「今日」「昨日」で出す。**
//
// デザイン案が `Today · 8:42 PM` / `Yesterday · 9:15 AM` と
// 相対で出しているのに合わせた。日付の羅列より、
// **どれが直近なのかが一目で分かる。**
//
// 時刻は出さない。Lantern は1日1件で、時刻を保存していない。
export function relativeDayLabel(dateStr, today = todayStr()) {
  if (dateStr === today) return '今日'
  if (dateStr === shiftDays(today, -1)) return '昨日'
  return dateDisplayJa(dateStr)
}

function todayStr() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function shiftDays(dateStr, days) {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() + days)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function dateDisplayJa(dateStr) {
  const [, m, d] = dateStr.split('-').map(Number)
  const dt = parseDate(dateStr)
  return `${m}月${d}日 ${WEEKDAYS_JA[dt.getDay()]}曜日`
}

export function formatAge(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return '1時間以内'
  if (hours < 24) return `${hours}時間前`
  const days = Math.floor(hours / 24)
  return `${days}日前`
}

export function truncateTitle(text, maxLength = 20) {
  if (!text) return ''
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
}

export function groupByMonth(logs) {
  const groups = {}
  ;[...logs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach((log) => {
      const key = log.date.slice(0, 7)
      if (!groups[key]) groups[key] = []
      groups[key].push(log)
    })
  return groups
}
