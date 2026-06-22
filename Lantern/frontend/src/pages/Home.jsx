import { useState, useEffect } from 'react'

const MONTHS_EN = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
const WEEKDAYS_JA = ['日','月','火','水','木','金','土']
const API_BASE = import.meta.env.VITE_API_URL || ''

// UTCではなくローカル日付を使う（UTC+9で日付ずれを防ぐ）
function localDateStr(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function todayStr() {
  return localDateStr()
}

function formatDateJa(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAYS_JA[date.getDay()]}曜日`
}

// ── カレンダー（月ナビ・クリックで記録表示）──────────────────────
function ActivityCalendar({ logs, onEditToday }) {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState(null)

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const logSet = new Set(logs.map(l => l.date))
  const today = todayStr()
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth()

  function prevMonth() {
    setSelectedDate(null)
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (isCurrentMonth) return
    setSelectedDate(null)
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ d, dateStr, hasLog: logSet.has(dateStr), isToday: dateStr === today })
  }

  const selectedLog = selectedDate ? logs.find(l => l.date === selectedDate) : null

  return (
    <div>
      {/* 月ナビゲーション: < 2026年6月 > */}
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
          if (cell.hasLog) cls += 'cursor-pointer '
          if (cell.isToday && cell.hasLog) {
            cls += isSelected
              ? 'bg-forest/80 text-cream font-semibold ring-1 ring-forest/60'
              : 'bg-forest text-cream font-semibold'
          } else if (cell.isToday) {
            cls += 'ring-1 ring-forest text-forest font-semibold bg-stone'
          } else if (cell.hasLog) {
            cls += isSelected
              ? 'bg-sage/80 text-cream font-medium ring-1 ring-sage/60'
              : 'bg-sage text-cream font-medium'
          } else {
            cls += 'bg-stone text-ink-faint'
          }
          return (
            <div
              key={cell.dateStr}
              title={`${cell.d}日`}
              className={cls}
              onClick={() => {
                if (!cell.hasLog) return
                setSelectedDate(d => d === cell.dateStr ? null : cell.dateStr)
              }}
            >
              {cell.d}
            </div>
          )
        })}
      </div>

      {/* 記録詳細パネル */}
      {selectedLog && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[10px] text-ink-faint tracking-wider">
              {selectedDate.replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, m, d) => `${y}年${+m}月${+d}日`)}
            </p>
            {selectedDate === today ? (
              <button
                onClick={() => { setSelectedDate(null); onEditToday?.() }}
                className="text-[10px] text-sage hover:text-forest transition-colors"
              >
                編集する
              </button>
            ) : (
              <span className="text-[10px] text-ink-faint">閲覧のみ</span>
            )}
          </div>
          <div className="space-y-2.5">
            {selectedLog.created && (
              <div>
                <p className="text-[10px] text-ink-faint mb-0.5">やったこと</p>
                <p className="text-xs text-ink leading-relaxed">{selectedLog.created}</p>
              </div>
            )}
            {selectedLog.enjoyable && (
              <div>
                <p className="text-[10px] text-ink-faint mb-0.5">よかったこと</p>
                <p className="text-xs text-ink leading-relaxed">{selectedLog.enjoyable}</p>
              </div>
            )}
            {selectedLog.struggled && (
              <div>
                <p className="text-[10px] text-ink-faint mb-0.5">詰まったこと</p>
                <p className="text-xs text-ink leading-relaxed">{selectedLog.struggled}</p>
              </div>
            )}
            {selectedLog.next && (
              <div>
                <p className="text-[10px] text-ink-faint mb-0.5">次にやること</p>
                <p className="text-xs text-ink leading-relaxed">{selectedLog.next}</p>
              </div>
            )}
            {selectedLog.ai_response && (
              <div className="pt-2 border-t border-sage/20">
                <p className="text-xs text-forest leading-relaxed">{selectedLog.ai_response}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 今日の記録フォーム ────────────────────────────────────────
function RecordForm({ todayLog, onSaved, open, onOpenChange }) {
  const [form, setForm] = useState({
    created: todayLog?.created || '',
    enjoyable: todayLog?.enjoyable || '',
    struggled: todayLog?.struggled || '',
    next: todayLog?.next || '',
  })
  const [detailOpen, setDetailOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState(todayLog?.ai_response || '')
  const [saveError, setSaveError] = useState('')

  async function handleSave() {
    setLoading(true)
    setAiResponse('')
    setSaveError('')
    try {
      const res = await fetch(`${API_BASE}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, date: todayStr() }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.ai_response) setAiResponse(data.ai_response)
      if (onSaved) onSaved()
      onOpenChange(false)
    } catch {
      setSaveError('保存に失敗しました。接続を確認してください。')
    } finally {
      setLoading(false)
    }
  }

  function field(key, label, rows = 2, placeholder = '（任意）') {
    return (
      <div>
        <label className="block text-xs text-ink-faint mb-1.5 tracking-wide">{label}</label>
        <textarea
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          rows={rows}
          className="w-full bg-cream border border-border rounded px-3 py-2 text-sm text-ink placeholder-ink-faint resize-none focus:outline-none focus:border-sage/60 transition-colors"
          placeholder={placeholder}
        />
      </div>
    )
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* 外側トグル */}
      <button
        onClick={() => onOpenChange(o => !o)}
        className="w-full px-5 py-4 flex items-center justify-between text-left transition-colors hover:bg-stone/50"
      >
        <div className="flex items-center gap-2.5">
          {todayLog ? (
            <>
              <span className="text-forest text-base leading-none">✓</span>
              <span className="text-sm text-ink-soft">今日の記録を編集する</span>
            </>
          ) : (
            <span className="text-sm text-ink-soft">今日を記録する</span>
          )}
        </div>
        <svg
          width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          viewBox="0 0 14 14"
          className={`text-ink-faint shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2.5 5l4.5 4 4.5-4" />
        </svg>
      </button>

      {/* 展開エリア */}
      <div
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border px-5 py-4 space-y-4">

            {/* メイン項目 */}
            {field('created', '今日のこと', 5, '今日どんなことをしましたか？')}
            {field('next', '次にやること', 2)}

            {/* 詳細折りたたみ */}
            <button
              type="button"
              onClick={() => setDetailOpen(o => !o)}
              className="flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink-soft transition-colors"
            >
              <svg
                width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.75"
                strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 11 11"
                className={`transition-transform duration-200 ${detailOpen ? 'rotate-90' : ''}`}
              >
                <path d="M3 2l4.5 3.5L3 9" />
              </svg>
              {detailOpen ? 'もっと詳しく書く（閉じる）' : 'もっと詳しく書く'}
            </button>

            <div
              className="grid transition-all duration-300 ease-out"
              style={{ gridTemplateRows: detailOpen ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <div className="space-y-4 pt-1">
                  {field('enjoyable', 'よかったこと・楽しかったこと')}
                  {field('struggled', '詰まったこと・困ったこと')}
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-forest text-cream text-sm py-2.5 rounded tracking-wide hover:bg-sage transition-colors disabled:opacity-50"
            >
              {loading ? '保存中...' : '記録する'}
            </button>
            {saveError && (
              <p className="text-xs text-red-500 text-center">{saveError}</p>
            )}
          </div>
        </div>
      </div>

      {/* AI応答（折りたたみ後も表示） */}
      {aiResponse && (
        <div className="border-t border-sage/20 bg-sage-light/50 px-5 py-4">
          <p className="text-sm text-forest leading-relaxed">{aiResponse}</p>
        </div>
      )}
    </div>
  )
}

// ── Home ──────────────────────────────────────────────────────
export default function Home() {
  const [quote, setQuote] = useState('')
  const [logs, setLogs] = useState([])
  const [todayLog, setTodayLog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshTick, setRefreshTick] = useState(0)
  const [formOpen, setFormOpen] = useState(false)

  const now = new Date()
  const dateLabel = `${now.getDate()} ${MONTHS_EN[now.getMonth()]}`
  const dateJa = formatDateJa(now)

  function refreshData() { setRefreshTick(t => t + 1) }

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const logsRes = await fetch(`${API_BASE}/api/logs`)
        const logsData = await logsRes.json()
        setLogs(logsData)
        setTodayLog(logsData.find(l => l.date === todayStr()) || null)

        const quoteRes = await fetch(`${API_BASE}/api/daily/quote`)
        const quoteData = await quoteRes.json()
        setQuote(quoteData.quote || '')
      } catch {
        // fallback — keep empty state
      } finally {
        setLoading(false)
      }
    })()
  }, [refreshTick])

  // 今月の記録日数
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const thisMonthCount = logs.filter(l => l.date >= thisMonthStart).length

  return (
    <div className="space-y-8">
      {/* 日付ヘッダー */}
      <div>
        <p className="text-xs text-ink-faint tracking-[0.2em] uppercase mb-0.5">{dateLabel}</p>
        <h1 className="font-display text-xl font-light text-ink tracking-wide">{dateJa}</h1>
      </div>

      {/* 今日の灯り */}
      <section>
        <p className="text-[10px] text-ink-faint tracking-[0.18em] uppercase mb-3">今日の灯り</p>
        <div className="bg-forest rounded-xl px-6 py-7 min-h-[88px] flex items-center">
          {loading ? (
            <div className="w-32 h-4 bg-white/10 rounded animate-pulse" />
          ) : (
            <p className="font-display text-cream/90 text-base font-light leading-relaxed tracking-wide">
              {quote || '今日も記録することが、すでに答えだ。'}
            </p>
          )}
        </div>
      </section>

      {/* 継続バッジ + カレンダー */}
      <section>
        {thisMonthCount > 0 && (
          <div className="flex justify-end mb-3">
            <span className="text-xs text-amber bg-amber-light border border-amber/20 px-2.5 py-0.5 rounded-full">
              今月の灯り {thisMonthCount}日
            </span>
          </div>
        )}
        <div className="bg-stone/50 rounded-xl p-4">
          <ActivityCalendar logs={logs} onEditToday={() => setFormOpen(true)} />
        </div>
      </section>

      {/* 今週の発見 */}
      {logs.length > 0 && (
        <section>
          <p className="text-[10px] text-ink-faint tracking-[0.18em] uppercase mb-3">今週の発見</p>
          <div className="bg-sage-light/60 border border-sage/20 rounded-xl px-5 py-4">
            {(() => {
              const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6)
              const weekLogs = logs.filter(l => l.date >= localDateStr(weekAgo))
                .sort((a, b) => b.date.localeCompare(a.date))
              if (weekLogs.length === 0) return (
                <p className="text-sm text-ink-soft">今週の記録がまだありません。</p>
              )
              const enjoyedCount = weekLogs.filter(l => l.enjoyable).length
              const struggledCount = weekLogs.filter(l => l.struggled).length
              const latestNext = weekLogs.find(l => l.next)?.next
              const half = Math.ceil(weekLogs.length / 2)
              let observation
              if (enjoyedCount >= half) {
                observation = '今週は楽しかったことが多く記録されています。'
              } else if (struggledCount >= half) {
                observation = '今週は試行錯誤の場面が多く記録されています。'
              } else if (latestNext) {
                observation = '今週は次のステップが具体的に記録されています。'
              } else {
                observation = `今週は${weekLogs.length}日間、活動が続いています。`
              }
              return (
                <div className="text-sm text-forest leading-relaxed space-y-2">
                  <p>{observation}</p>
                  {latestNext && (
                    <p className="text-ink-soft text-[13px]">「{latestNext}」が次にやることとして記録されています。</p>
                  )}
                </div>
              )
            })()}
          </div>
        </section>
      )}

      {/* 今日の記録 */}
      <section>
        <RecordForm todayLog={todayLog} onSaved={refreshData} open={formOpen} onOpenChange={setFormOpen} />
      </section>
    </div>
  )
}
