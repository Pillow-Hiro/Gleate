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
    } finally {
      setLoading(false)
    }
  }

  if (!open && !todayLog) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border border-border rounded-lg px-5 py-4 text-left text-sm text-ink-soft hover:border-sage/60 hover:text-ink hover:bg-sage-light/30 transition-all duration-150"
      >
        <span className="text-xs text-ink-faint tracking-wider uppercase block mb-0.5">今日の記録</span>
        タップして記録を始める
      </button>
    )
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border bg-stone flex items-center justify-between">
        <span className="text-xs text-ink-soft tracking-wider uppercase">今日の記録</span>
        {!todayLog && (
          <button onClick={() => setOpen(false)} className="text-ink-faint hover:text-ink text-xs">閉じる</button>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">
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

        {aiResponse && (
          <div className="bg-sage-light rounded-lg px-4 py-3.5 text-sm text-forest leading-relaxed">
            {aiResponse}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Home ──────────────────────────────────────────────────────
export default function Home() {
  const [quote, setQuote] = useState('')
  const [logs, setLogs] = useState([])
  const [todayLog, setTodayLog] = useState(null)
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const dateLabel = `${now.getDate()} ${MONTHS_EN[now.getMonth()]}`
  const dateJa = formatDateJa(now)

  async function fetchData() {
    try {
      const [splashRes, logsRes] = await Promise.all([
        fetch(`${API_BASE}/api/splash/content`),
        fetch(`${API_BASE}/api/logs`),
      ])
      const splashData = await splashRes.json()
      const logsData = await logsRes.json()
      setQuote(splashData.quote || '')
      setLogs(logsData)
      setTodayLog(logsData.find(l => l.date === todayStr()) || null)
    } catch {
      // fallback — keep empty state
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // 継続日数（連続）— 今日記録済みなら最低1を保証
  const streak = (() => {
    let count = 0
    const check = new Date()
    const logSet = new Set(logs.map(l => l.date))
    for (let i = 0; i < 365; i++) {
      const d = localDateStr(check)
      if (!logSet.has(d)) break
      count++
      check.setDate(check.getDate() - 1)
    }
    return Math.max(count, todayLog ? 1 : 0)
  })()

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
          {streak > 0 && (
            <span className="text-xs text-amber bg-amber-light border border-amber/20 px-2.5 py-0.5 rounded-full">
              {streak}日連続
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
              const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
              const weekLogs = logs.filter(l => l.date >= localDateStr(weekAgo))
              if (weekLogs.length === 0) return (
                <p className="text-sm text-ink-soft">今週の記録がまだありません。</p>
              )
              const enjoyed = weekLogs.flatMap(l => l.enjoyable ? [l.enjoyable] : [])
              return (
                <div className="text-sm text-forest leading-relaxed space-y-1">
                  <p>今週は{weekLogs.length}日間、記録しました。</p>
                  {enjoyed.length > 0 && (
                    <p className="text-ink-soft">よかったこと：{enjoyed[enjoyed.length - 1]}</p>
                  )}
                </div>
              )
            })()}
          </div>
        </section>
      )}

      {/* 今日の記録 */}
      <section>
        <RecordForm todayLog={todayLog} onSaved={fetchData} />
      </section>
    </div>
  )
}
