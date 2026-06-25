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
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await fetch(`${API_BASE}/api/logs/${log.date}`, { method: 'DELETE' })
      if (onDelete) onDelete(log.date)
    } catch {
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
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
      <div className="pt-1 flex justify-end items-center gap-3">
        {confirmDelete ? (
          <>
            <span className="text-xs text-ink-faint">削除しますか？</span>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-ink-faint hover:text-ink transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              {deleting ? '削除中...' : '削除する'}
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs text-ink-faint hover:text-red-500 transition-colors"
          >
            削除
          </button>
        )}
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
        className="w-full text-left py-3.5 flex items-center justify-between gap-3 hover:bg-stone/40 -mx-4 px-4 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <span className="text-xs text-ink-faint mr-2.5 shrink-0">{dayLabel(log.date)}</span>
          <span className="text-sm text-ink truncate">{summary}</span>
        </div>
        <svg
          width="14" height="14"
          fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          viewBox="0 0 14 14"
          className={`shrink-0 text-ink-faint transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2.5 5l4.5 4 4.5-4" />
        </svg>
      </button>
      <div
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <LogDetail log={log} onDelete={onDelete} />
        </div>
      </div>
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

  const q = search.trim().toLowerCase()
  const filtered = q
    ? logs.filter(l =>
        [l.created, l.enjoyable, l.struggled, l.next].some(v =>
          v?.toLowerCase().includes(q)
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
        {!loading && logs.length > 0 && (
          <p className="text-sm text-ink-soft mt-1">{logs.length}日間の記録</p>
        )}
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
          className="w-full bg-stone border border-border rounded-lg pl-8 pr-9 py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-sage/50 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" viewBox="0 0 13 13">
              <line x1="2" y1="2" x2="11" y2="11" />
              <line x1="11" y1="2" x2="2" y2="11" />
            </svg>
          </button>
        )}
      </div>

      {/* ログ一覧 */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-12 bg-stone rounded-lg animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-3xl mb-4 opacity-40">◇</p>
          <p className="text-sm text-ink-soft">まだ記録がありません</p>
          <p className="text-xs text-ink-faint mt-1.5">Homeから今日の記録を始めましょう</p>
        </div>
      ) : monthKeys.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-ink-faint">「{search.trim()}」の記録は見つかりませんでした</p>
        </div>
      ) : (
        <div className="space-y-8">
          {monthKeys.map(month => (
            <section key={month}>
              <div className="flex items-center gap-2.5 mb-3">
                <h2 className="text-xs text-ink-soft tracking-wider font-medium">
                  {monthLabel(groups[month][0].date)}
                </h2>
                <span className="text-[10px] text-ink-faint">{groups[month].length}日</span>
              </div>
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
