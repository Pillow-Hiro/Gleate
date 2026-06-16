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

// ── カレンダー（当月の日付グリッド）─────────────────────────────
function ActivityCalendar({ logs }) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()

  const logSet = new Set(logs.map(l => l.date))
  const today = todayStr()

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ d, dateStr, hasLog: logSet.has(dateStr), isToday: dateStr === today })
  }

  return (
    <div>
      <div className="grid grid-cols-7 mb-1.5">
        {['日','月','火','水','木','金','土'].map(w => (
          <div key={w} className="text-center text-[10px] text-ink-faint tracking-wider py-0.5">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`empty-${i}`} />
          let cls = 'aspect-square rounded flex items-center justify-center text-[11px] transition-colors '
          if (cell.isToday && cell.hasLog) {
            cls += 'bg-forest text-cream font-semibold'
          } else if (cell.isToday) {
            cls += 'ring-2 ring-forest text-forest font-semibold bg-stone'
          } else if (cell.hasLog) {
            cls += 'bg-sage-light text-forest font-medium'
          } else {
            cls += 'bg-stone text-ink-faint'
          }
          return (
            <div key={cell.dateStr} title={`${cell.d}日`} className={cls}>
              {cell.d}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 今日の記録フォーム ────────────────────────────────────────
function RecordForm({ todayLog, onSaved }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    created: todayLog?.created || '',
    enjoyable: todayLog?.enjoyable || '',
    struggled: todayLog?.struggled || '',
    next: todayLog?.next || '',
  })
  const [loading, setLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState(todayLog?.ai_response || '')

  const fields = [
    { key: 'created', label: '今日やったこと' },
    { key: 'enjoyable', label: 'よかったこと・楽しかったこと' },
    { key: 'struggled', label: '詰まったこと・困ったこと' },
    { key: 'next', label: '次にやること' },
  ]

  async function handleSave() {
    setLoading(true)
    setAiResponse('')
    try {
      const res = await fetch(`${API_BASE}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, date: todayStr() }),
      })
      const data = await res.json()
      if (data.ai_response) setAiResponse(data.ai_response)
      if (onSaved) onSaved()
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* トグルヘッダー */}
      <button
        onClick={() => setOpen(o => !o)}
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

      {/* アニメーション展開エリア（CSS grid trick） */}
      <div
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border px-5 py-4 space-y-4">
            {fields.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs text-ink-faint mb-1.5 tracking-wide">{label}</label>
                <textarea
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  rows={2}
                  className="w-full bg-cream border border-border rounded px-3 py-2 text-sm text-ink placeholder-ink-faint resize-none focus:outline-none focus:border-sage/60 transition-colors"
                  placeholder="（任意）"
                />
              </div>
            ))}

            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-forest text-cream text-sm py-2.5 rounded tracking-wide hover:bg-sage transition-colors disabled:opacity-50"
            >
              {loading ? '保存中...' : '記録する'}
            </button>
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
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-ink-faint tracking-[0.18em] uppercase">
            {now.getFullYear()}年{now.getMonth() + 1}月
          </p>
          {thisMonthCount > 0 && (
            <span className="text-xs text-amber bg-amber-light border border-amber/20 px-2.5 py-0.5 rounded-full">
              今月の灯り {thisMonthCount}日
            </span>
          )}
        </div>
        <div className="bg-stone/50 rounded-xl p-4">
          <ActivityCalendar logs={logs} />
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
                    <p className="text-ink-soft text-[13px]">次の実験 — {latestNext}</p>
                  )}
                </div>
              )
            })()}
          </div>
        </section>
      )}

      {/* 今日の記録 */}
      <section>
        <RecordForm todayLog={todayLog} onSaved={refreshData} />
      </section>
    </div>
  )
}
