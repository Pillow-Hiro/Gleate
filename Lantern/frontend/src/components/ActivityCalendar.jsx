import { useState } from 'react'
import { todayStr } from '../lib/date'

export default function ActivityCalendar({ logs, selectedDate, onDateSelect }) {
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
              cls += isSelected
                ? 'bg-amber/20 text-amber font-semibold ring-1 ring-amber/70'
                : 'bg-amber-light text-amber font-semibold ring-1 ring-amber/40 hover:bg-amber/20'
            } else if (cell.isToday) {
              cls += isSelected
                ? 'bg-accent/10 text-accent font-semibold ring-1 ring-accent/60'
                : 'ring-1 ring-accent/50 text-accent font-semibold hover:bg-accent/10'
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
