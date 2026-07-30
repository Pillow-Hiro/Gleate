import { useState } from 'react'
import { dayLabel, truncateTitle } from '../lib/format'
import LogDetail from './LogDetail'

// 一覧の1行。タップで LogDetail を開閉する。
export default function LogItem({ log, onDelete, onUpdate }) {
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
          <span className="text-sm text-ink">{truncateTitle(summary)}</span>
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
          <LogDetail log={log} onDelete={onDelete} onUpdate={onUpdate} />
        </div>
      </div>
    </div>
  )
}
