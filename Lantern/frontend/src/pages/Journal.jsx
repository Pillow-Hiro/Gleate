import { useState, useEffect } from 'react'

const WEEKDAYS_JA = ['日','月','火','水','木','金','土']
const API_BASE = import.meta.env.VITE_API_URL || ''

function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function monthLabel(dateStr) {
  const [y, m] = dateStr.split('-')
  return `${y}年${Number(m)}月`
}

function dayLabel(dateStr) {
  const d = parseDate(dateStr)
  return `${d.getDate()}日 ${WEEKDAYS_JA[d.getDay()]}`
}

function groupByMonth(logs) {
  const groups = {}
  ;[...logs].sort((a, b) => b.date.localeCompare(a.date)).forEach(log => {
    const key = log.date.slice(0, 7)
    if (!groups[key]) groups[key] = []
    groups[key].push(log)
  })
  return groups
}

function LogDetail({ log, onDelete }) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm('この記録を削除しますか？')) return
    setDeleting(true)
    await fetch(`${API_BASE}/api/logs/${log.date}`, { method: 'DELETE' })
    if (onDelete) onDelete(log.date)
  }

  const fields = [
    { key: 'created', label: 'やったこと' },
    { key: 'enjoyable', label: 'よかったこと' },
    { key: 'struggled', label: '困ったこと' },
    { key: 'next', label: '次にやること' },
  ]

  return (
    <div className="mt-3 space-y-2.5 pb-1">
      {fields.map(({ key, label }) =>
        log[key] ? (
          <div key={key}>
            <span className="text-[10px] text-ink-faint tracking-wider uppercase">{label}</span>
            <p className="text-sm text-ink leading-relaxed mt-0.5">{log[key]}</p>
          </div>
        ) : null
      )}
      {log.ai_response && (
        <div className="bg-sage-light rounded-lg px-3.5 py-3 mt-3">
          <span className="text-[10px] text-sage tracking-wider uppercase block mb-1">Lantern</span>
          <p className="text-sm text-forest leading-relaxed">{log.ai_response}</p>
        </div>
      )}
      <div className="pt-1 flex justify-end">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-ink-faint hover:text-red-500 transition-colors"
        >
          {deleting ? '削除中...' : '削除'}
        </button>
      </div>
    </div>
  )
}

function LogItem({ log, onDelete }) {
  const [open, setOpen] = useState(false)
  const summary = log.created || log.enjoyable || '（記録あり）'

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left py-3.5 flex items-start justify-between gap-3 hover:bg-stone/40 -mx-4 px-4 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <span className="text-xs text-ink-faint mr-2.5 shrink-0">{dayLabel(log.date)}</span>
          <span className="text-sm text-ink truncate">{summary}</span>
        </div>
        <svg
          width="14" height="14"
          fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          viewBox="0 0 14 14"
          className={`shrink-0 mt-0.5 text-ink-faint transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2.5 5l4.5 4 4.5-4" />
        </svg>
      </button>
      {open && <LogDetail log={log} onDelete={onDelete} />}
    </div>
  )
}

export default function Journal() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch(`${API_BASE}/api/logs`)
      .then(r => r.json())
      .then(data => setLogs(data))
      .finally(() => setLoading(false))
  }, [])

  function handleDelete(date) {
    setLogs(prev => prev.filter(l => l.date !== date))
  }

  const filtered = search
    ? logs.filter(l =>
        [l.created, l.enjoyable, l.struggled, l.next].some(v =>
          v?.includes(search)
        )
      )
    : logs

  const groups = groupByMonth(filtered)
  const monthKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <p className="text-[10px] text-ink-faint tracking-[0.18em] uppercase mb-0.5">Journal</p>
        <h1 className="font-display text-xl font-light text-ink">記録</h1>
      </div>

      {/* 検索 */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
          width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" viewBox="0 0 14 14"
        >
          <circle cx="5.5" cy="5.5" r="4" />
          <line x1="9" y1="9" x2="13" y2="13" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="記録を検索"
          className="w-full bg-stone border border-border rounded-lg pl-8 pr-4 py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-sage/50 transition-colors"
        />
      </div>

      {/* ログ一覧 */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-12 bg-stone rounded-lg animate-pulse" />
          ))}
        </div>
      ) : monthKeys.length === 0 ? (
        <div className="text-center py-16 text-ink-faint">
          <p className="text-sm">まだ記録がありません</p>
          <p className="text-xs mt-1">今日から記録を始めましょう</p>
        </div>
      ) : (
        <div className="space-y-8">
          {monthKeys.map(month => (
            <section key={month}>
              <h2 className="text-xs text-ink-soft tracking-wider mb-3 font-medium">
                {monthLabel(groups[month][0].date)}
              </h2>
              <div className="bg-stone/40 rounded-xl px-4">
                {groups[month].map(log => (
                  <LogItem key={log.date} log={log} onDelete={handleDelete} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
