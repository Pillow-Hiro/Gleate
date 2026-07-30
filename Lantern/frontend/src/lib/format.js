// 表示用フォーマッタ。
//
// frontend/src/lib/format.js と mobile/lib/format.js は同一内容を保つこと。
// （Vercelの配信元をExpo Web出力へ切り替えた時点で frontend 側を廃止し一本化する）
// frontend/src/lib/format.test.js が2ファイルの一致を検証している。
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
