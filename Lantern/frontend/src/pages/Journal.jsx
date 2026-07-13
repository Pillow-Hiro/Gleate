import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authFetch } from '../lib/supabase'

const WEEKDAYS_JA = ['日','月','火','水','木','金','土']

function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function localDateStr(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function todayStr() { return localDateStr() }

function monthLabel(dateStr) {
  const [y, m] = dateStr.split('-')
  return `${y}年${Number(m)}月`
}

function dayLabel(dateStr) {
  const d = parseDate(dateStr)
  return `${d.getDate()}日 ${WEEKDAYS_JA[d.getDay()]}`
}

function dateDisplayJa(dateStr) {
  const [, m, d] = dateStr.split('-').map(Number)
  const dt = parseDate(dateStr)
  return `${m}月${d}日 ${WEEKDAYS_JA[dt.getDay()]}曜日`
}

function formatAge(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return '1時間以内'
  if (hours < 24) return `${hours}時間前`
  const days = Math.floor(hours / 24)
  return `${days}日前`
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

// ── カレンダー ────────────────────────────────────────────────
function ActivityCalendar({ logs, selectedDate, onDateSelect }) {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const logSet = new Set(logs.map(l => l.date))
  const today = todayStr()
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth()

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (isCurrentMonth) return
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }
  function goToday() {
    setViewYear(now.getFullYear())
    setViewMonth(now.getMonth())
    onDateSelect(today)
  }

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const isFuture = dateStr > today
    cells.push({ d, dateStr, hasLog: logSet.has(dateStr), isToday: dateStr === today, isFuture })
  }

  return (
    <div>
      <div className="flex items-center justify-center gap-2 mb-2">
        <button onClick={prevMonth} className="p-1 text-ink-faint hover:text-ink transition-colors rounded" aria-label="前月">
          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 11 11">
            <path d="M7 2L4 5.5 7 9" />
          </svg>
        </button>
        <span className="text-[10px] text-ink-faint tracking-[0.18em] min-w-[5rem] text-center">
          {viewYear}年{viewMonth + 1}月
        </span>
        <button onClick={nextMonth} disabled={isCurrentMonth} className="p-1 text-ink-faint hover:text-ink transition-colors rounded disabled:opacity-25 disabled:cursor-not-allowed" aria-label="翌月">
          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 11 11">
            <path d="M4 2L7 5.5 4 9" />
          </svg>
        </button>
        <button onClick={goToday} className="text-[10px] text-ink-faint hover:text-ink tracking-wider border border-border rounded px-1.5 py-0.5 transition-colors">
          今日
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {['日','月','火','水','木','金','土'].map(w => (
          <div key={w} className="text-center text-[10px] text-ink-faint tracking-wider">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`empty-${i}`} className="w-6 h-6" />
          const isSelected = selectedDate === cell.dateStr
          let cls = 'w-6 h-6 rounded flex items-center justify-center text-[9px] transition-colors '
          if (cell.isFuture) {
            cls += 'text-ink-faint/30 cursor-not-allowed'
          } else {
            cls += 'cursor-pointer '
            if (cell.isToday && cell.hasLog) {
              cls += isSelected ? 'bg-amber/20 text-amber font-semibold ring-1 ring-amber/70' : 'bg-amber-light text-amber font-semibold ring-1 ring-amber/40 hover:bg-amber/20'
            } else if (cell.isToday) {
              cls += isSelected ? 'bg-accent/10 text-accent font-semibold ring-1 ring-accent/60' : 'ring-1 ring-accent/50 text-accent font-semibold hover:bg-accent/10'
            } else if (cell.hasLog) {
              cls += isSelected ? 'bg-amber/20 text-amber ring-1 ring-amber/50' : 'bg-amber-light text-amber hover:bg-amber/20'
            } else {
              cls += isSelected ? 'bg-stone text-ink ring-1 ring-border' : 'text-ink-faint/60 hover:bg-stone hover:text-ink-faint'
            }
          }
          return (
            <div key={cell.dateStr} title={`${cell.d}日`} className={cls} onClick={() => !cell.isFuture && onDateSelect(cell.dateStr)}>
              {cell.d}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 記録詳細 ──────────────────────────────────────────────────
function LogDetail({ log, onDelete }) {
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await authFetch(`/api/logs/${log.date}`, { method: 'DELETE' })
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
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-ink-faint hover:text-ink transition-colors">
              キャンセル
            </button>
            <button onClick={handleDelete} disabled={deleting} className="text-xs text-red-500 hover:text-red-600 transition-colors disabled:opacity-50">
              {deleting ? '削除中...' : '削除する'}
            </button>
          </>
        ) : (
          <>
            <button onClick={() => navigate(`/?date=${log.date}`)} className="text-xs text-ink-faint hover:text-forest transition-colors">
              編集
            </button>
            <button onClick={() => setConfirmDelete(true)} className="text-xs text-ink-faint hover:text-red-500 transition-colors">
              削除
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── 振り返りセクション ─────────────────────────────────────────
function PatternCard({ observation, question }) {
  return (
    <div className="bg-stone/60 rounded-xl px-5 py-4 space-y-2.5">
      <p className="text-sm text-ink leading-relaxed">{observation}</p>
      <p className="text-sm text-ink-soft italic leading-relaxed">{question}</p>
    </div>
  )
}

function ReviewSection({ title, type, description }) {
  const storageKey = `lantern-review-${type}`
  const [patterns, setPatterns] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey))
      return stored?.patterns ?? null
    } catch { return null }
  })
  const [generatedAt, setGeneratedAt] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey))?.generatedAt || '' } catch { return '' }
  })
  const [loading, setLoading] = useState(false)
  const [fading, setFading] = useState(false)

  async function generate() {
    if (patterns !== null && patterns.length > 0) {
      setFading(true)
      await new Promise(r => setTimeout(r, 350))
      setFading(false)
    }
    setLoading(true)
    setPatterns([])
    try {
      const res = await authFetch('/api/review/generate', {
        method: 'POST',
        body: JSON.stringify({ type }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const now = new Date().toISOString()
      const newPatterns = data.patterns || []
      setPatterns(newPatterns)
      setGeneratedAt(now)
      try {
        localStorage.setItem(storageKey, JSON.stringify({ patterns: newPatterns, generatedAt: now }))
      } catch { /* localStorage unavailable */ }
    } catch {
      setPatterns([])
    } finally {
      setLoading(false)
    }
  }

  const hasPatterns = patterns !== null && patterns.length > 0
  const isEmpty = patterns !== null && patterns.length === 0

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-light text-ink">{title}</h2>
          <p className="text-xs text-ink-faint mt-0.5">{description}</p>
        </div>
        <button onClick={generate} disabled={loading} className="text-xs text-forest border border-sage/40 px-3.5 py-1.5 rounded-full hover:bg-sage-light transition-colors disabled:opacity-50 shrink-0">
          {loading ? '生成中...' : patterns !== null ? '再生成' : '振り返る'}
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-stone/60 rounded-xl px-5 py-4 space-y-2.5 animate-pulse">
              <div className="h-3.5 bg-parchment rounded w-full" />
              <div className="h-3.5 bg-parchment rounded w-4/5" />
              <div className="h-3 bg-parchment rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {!loading && hasPatterns && (
        <div className={fading ? 'space-y-3 opacity-0 transition-opacity duration-300' : 'space-y-3 lantern-fade-in'}>
          {generatedAt && <p className="text-[10px] text-ink-faint">{formatAge(generatedAt)}</p>}
          {patterns.map((p, i) => (
            <PatternCard key={i} observation={p.observation} question={p.question} />
          ))}
        </div>
      )}

      {!loading && patterns === null && (
        <div className="border border-border border-dashed rounded-xl px-5 py-6 text-center">
          <p className="text-sm text-ink-faint">「振り返る」を押すと、Lanternが記録から気づきを届けます</p>
        </div>
      )}

      {!loading && isEmpty && (
        <div className="border border-border border-dashed rounded-xl px-5 py-6 text-center">
          <p className="text-sm text-ink-faint">記録が増えると、パターンが見えてきます。</p>
        </div>
      )}
    </section>
  )
}

// ── リストアイテム ─────────────────────────────────────────────
function LogItem({ log, onDelete }) {
  const [open, setOpen] = useState(false)
  const summary = log.created || log.enjoyable || log.struggled || log.next || '（記録あり）'

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
          width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          viewBox="0 0 14 14"
          className={`shrink-0 text-ink-faint transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2.5 5l4.5 4 4.5-4" />
        </svg>
      </button>
      <div className="grid transition-all duration-300 ease-out" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
        <div className="overflow-hidden">
          <LogDetail log={log} onDelete={onDelete} />
        </div>
      </div>
    </div>
  )
}

// ── Journal ───────────────────────────────────────────────────
export default function Journal() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState(null)

  useEffect(() => {
    authFetch('/api/logs')
      .then(r => r.json())
      .then(data => setLogs(data))
      .finally(() => setLoading(false))
  }, [])

  function handleDelete(date) {
    setLogs(prev => prev.filter(l => l.date !== date))
    if (selectedDate === date) setSelectedDate(null)
  }

  const now = new Date()
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const thisMonthCount = logs.filter(l => l.date >= thisMonthStart).length
  const selectedLog = selectedDate ? logs.find(l => l.date === selectedDate) || null : null

  const q = search.trim().toLowerCase()
  const filtered = q
    ? logs.filter(l =>
        [l.created, l.enjoyable, l.struggled, l.next].some(v => v?.toLowerCase().includes(q))
      )
    : logs

  const groups = groupByMonth(filtered)
  const monthKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div>
        <p className="text-[10px] text-ink-faint tracking-[0.18em] uppercase mb-0.5">Journal</p>
        <h1 className="font-display text-xl font-light text-ink">記録</h1>
        {!loading && logs.length > 0 && (
          <p className="text-sm text-ink-soft mt-1">{logs.length}日間の記録</p>
        )}
      </div>

      {/* 今月の灯りバッジ + カレンダー */}
      <section>
        {thisMonthCount > 0 && (
          <div className="flex justify-end mb-3">
            <span className="text-xs text-amber bg-amber-light border border-amber/20 px-2.5 py-0.5 rounded-full">
              今月の灯り {thisMonthCount}日
            </span>
          </div>
        )}
        <div className="bg-stone/50 rounded-xl p-4">
          <ActivityCalendar logs={logs} selectedDate={selectedDate || ''} onDateSelect={setSelectedDate} />
          {!loading && logs.length === 0 && (
            <p className="text-[11px] text-ink-faint text-center mt-3">
              日付をタップして記録を始めましょう
            </p>
          )}
        </div>
        {selectedDate && selectedLog && (
          <div className="mt-3 bg-stone/40 rounded-xl px-5 py-4">
            <p className="text-xs text-ink-faint tracking-wide mb-2">{dateDisplayJa(selectedDate)}</p>
            <LogDetail log={selectedLog} onDelete={handleDelete} />
          </div>
        )}
        {selectedDate && !selectedLog && (
          <p className="text-xs text-ink-faint text-center mt-3">この日の記録はありません</p>
        )}
      </section>

      <div className="h-px bg-border" />

      <ReviewSection title="今週の振り返り" type="weekly" description="過去7日間の活動から" />

      <div className="h-px bg-border" />

      <ReviewSection title="今月の振り返り" type="monthly" description="今月の活動から" />

      <div className="h-px bg-border" />

      {/* 検索 */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" viewBox="0 0 14 14">
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
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors">
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
