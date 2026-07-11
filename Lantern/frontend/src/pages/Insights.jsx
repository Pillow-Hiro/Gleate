import { useState, useEffect } from 'react'
import { authFetch } from '../lib/supabase'

const WEEKDAYS_JA = ['日','月','火','水','木','金','土']

function localDateStr(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function todayStr() {
  return localDateStr()
}

function dateDisplayJa(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
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
      {/* 月ナビゲーション */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <button
          onClick={prevMonth}
          className="p-1 text-ink-faint hover:text-ink transition-colors rounded"
          aria-label="前月"
        >
          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 11 11">
            <path d="M7 2L4 5.5 7 9" />
          </svg>
        </button>

        <span className="text-[10px] text-ink-faint tracking-[0.18em] min-w-[5rem] text-center">
          {viewYear}年{viewMonth + 1}月
        </span>

        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className="p-1 text-ink-faint hover:text-ink transition-colors rounded disabled:opacity-25 disabled:cursor-not-allowed"
          aria-label="翌月"
        >
          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 11 11">
            <path d="M4 2L7 5.5 4 9" />
          </svg>
        </button>

        <button
          onClick={goToday}
          className="text-[10px] text-ink-faint hover:text-ink tracking-wider border border-border rounded px-1.5 py-0.5 transition-colors"
        >
          今日
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 mb-1">
        {['日','月','火','水','木','金','土'].map(w => (
          <div key={w} className="text-center text-[10px] text-ink-faint tracking-wider">{w}</div>
        ))}
      </div>

      {/* グリッド */}
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
              cls += isSelected
                ? 'bg-amber/20 text-amber font-semibold ring-1 ring-amber/70'
                : 'bg-amber-light text-amber font-semibold ring-1 ring-amber/40 hover:bg-amber/20'
            } else if (cell.isToday) {
              cls += isSelected
                ? 'bg-forest/10 text-forest font-semibold ring-1 ring-forest/50'
                : 'ring-1 ring-forest/40 text-forest font-semibold hover:bg-forest/10'
            } else if (cell.hasLog) {
              cls += isSelected
                ? 'bg-amber/20 text-amber ring-1 ring-amber/50'
                : 'bg-amber-light text-amber hover:bg-amber/20'
            } else {
              cls += isSelected
                ? 'bg-stone text-ink ring-1 ring-border'
                : 'text-ink-faint/60 hover:bg-stone hover:text-ink-faint'
            }
          }

          return (
            <div
              key={cell.dateStr}
              title={`${cell.d}日`}
              className={cls}
              onClick={() => !cell.isFuture && onDateSelect(cell.dateStr)}
            >
              {cell.d}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 選択日の記録 ───────────────────────────────────────────────
function LogDetail({ log, dateStr }) {
  const fields = [
    { key: 'created', label: 'やったこと' },
    { key: 'enjoyable', label: 'よかったこと' },
    { key: 'struggled', label: '困ったこと' },
    { key: 'next', label: '次にやること' },
  ]
  return (
    <div className="mt-3 bg-stone/40 rounded-xl px-5 py-4 space-y-3">
      <p className="text-xs text-ink-faint tracking-wide">{dateDisplayJa(dateStr)}</p>
      {fields.map(({ key, label }) =>
        log[key] ? (
          <div key={key}>
            <span className="text-[10px] text-ink-faint tracking-wider uppercase">{label}</span>
            <p className="text-sm text-ink leading-relaxed mt-0.5">{log[key]}</p>
          </div>
        ) : null
      )}
      {log.ai_response && (
        <div className="bg-sage-light rounded-lg px-3.5 py-3">
          <span className="text-[10px] text-sage tracking-wider uppercase block mb-1">Lantern</span>
          <p className="text-sm text-forest leading-relaxed">{log.ai_response}</p>
        </div>
      )}
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

  // null = 未生成、[] = 生成済みだがパターンなし、[...] = パターンあり
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
      await new Promise(r => setTimeout(r, 250))
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
        localStorage.setItem(storageKey, JSON.stringify({
          patterns: newPatterns,
          generatedAt: now,
        }))
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
        <button
          onClick={generate}
          disabled={loading}
          className="text-xs text-forest border border-sage/40 px-3.5 py-1.5 rounded-full hover:bg-sage-light transition-colors disabled:opacity-50 shrink-0"
        >
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
        <div className={`space-y-3 transition-opacity duration-200 ${fading ? 'opacity-0' : 'opacity-100'}`}>
          {generatedAt && (
            <p className="text-[10px] text-ink-faint">{formatAge(generatedAt)}</p>
          )}
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

// ── Insights ──────────────────────────────────────────────────
export default function Insights() {
  const [logs, setLogs] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)

  useEffect(() => {
    authFetch('/api/logs')
      .then(r => r.ok ? r.json() : [])
      .then(data => setLogs(data))
      .catch(() => {})
  }, [])

  const now = new Date()
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const thisMonthCount = logs.filter(l => l.date >= thisMonthStart).length
  const selectedLog = selectedDate ? logs.find(l => l.date === selectedDate) || null : null

  return (
    <div className="space-y-10">
      {/* ヘッダー */}
      <div>
        <p className="text-[10px] text-ink-faint tracking-[0.18em] uppercase mb-0.5">Insights</p>
        <h1 className="font-display text-xl font-light text-ink">振り返り</h1>
        <p className="text-sm text-ink-soft mt-2 leading-relaxed">
          記録の積み重ねから、Lanternがパターンと気づきを届けます。
        </p>
      </div>

      <div className="h-px bg-border" />

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
          <ActivityCalendar
            logs={logs}
            selectedDate={selectedDate || ''}
            onDateSelect={setSelectedDate}
          />
        </div>
        {/* 選択日の記録 */}
        {selectedDate && selectedLog && (
          <LogDetail log={selectedLog} dateStr={selectedDate} />
        )}
        {selectedDate && !selectedLog && (
          <p className="text-xs text-ink-faint text-center mt-3">この日の記録はありません</p>
        )}
      </section>

      <div className="h-px bg-border" />
      <ReviewSection title="今週の振り返り" type="weekly" description="過去7日間の活動から" />
      <div className="h-px bg-border" />
      <ReviewSection title="今月の振り返り" type="monthly" description="今月の活動から" />
    </div>
  )
}
