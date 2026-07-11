import { useState, useEffect } from 'react'
import { authFetch } from '../lib/supabase'

const MONTHS_EN = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
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

function formatDateJa(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAYS_JA[date.getDay()]}曜日`
}

function dateDisplayJa(dateStr) {
  const [, m, d] = dateStr.split('-')
  return `${Number(m)}月${Number(d)}日`
}

// ── カレンダー ────────────────────────────────────────────────
function ActivityCalendar({ logs, selectedFormDate, onDateSelect }) {
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

          const isSelected = selectedFormDate === cell.dateStr
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

// ── 記録フォーム ──────────────────────────────────────────────
function RecordForm({ existingLog, targetDate, onSaved }) {
  const isToday = targetDate === todayStr()
  const [form, setForm] = useState({
    created: existingLog?.created || '',
    enjoyable: existingLog?.enjoyable || '',
    struggled: existingLog?.struggled || '',
    next: existingLog?.next || '',
  })
  const [detailOpen, setDetailOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState(existingLog?.ai_response || '')
  const [saveError, setSaveError] = useState('')

  async function handleSave() {
    setLoading(true)
    setAiResponse('')
    setSaveError('')
    try {
      const res = await authFetch('/save', {
        method: 'POST',
        body: JSON.stringify({ ...form, date: targetDate }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.ai_response) setAiResponse(data.ai_response)
      if (onSaved) onSaved()
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
    <div className="border border-border rounded-lg px-5 py-4 space-y-4">
      {existingLog && (
        <p className="text-xs text-forest flex items-center gap-1.5">
          <span className="text-sm leading-none">✓</span>
          今日の記録を編集する
        </p>
      )}

      {field('created', `${isToday ? '今日' : 'この日'}のこと`, 5, `${isToday ? '今日' : 'この日'}どんなことをしましたか？`)}
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

      {aiResponse && (
        <div className="border-t border-sage/20 -mx-5 px-5 pt-4">
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
        const [logsRes, quoteRes] = await Promise.all([
          authFetch('/api/logs'),
          authFetch('/api/daily/quote'),
        ])
        let logsData = []
        if (logsRes.ok) {
          logsData = await logsRes.json()
          setLogs(logsData)
        }
        if (quoteRes.ok) {
          const quoteData = await quoteRes.json()
          setQuote(quoteData.quote || '')
        }
      } catch {
        // fallback — keep empty state
      } finally {
        setLoading(false)
      }
    })()
  }, [refreshTick])

  const existingLog = logs.find(l => l.date === todayStr()) || null

  const streak = (() => {
    const logSet = new Set(logs.map(l => l.date))
    // 今日に記録があればそこから、なければ昨日から遡る
    const start = new Date()
    if (!logSet.has(todayStr())) start.setDate(start.getDate() - 1)
    let count = 0
    const check = new Date(start)
    for (let i = 0; i < 365; i++) {
      if (!logSet.has(localDateStr(check))) break
      count++
      check.setDate(check.getDate() - 1)
    }
    return count
  })()

  return (
    <div className="space-y-8">
      {/* 日付ヘッダー */}
      <div>
        <p className="text-xs text-ink-faint tracking-[0.2em] uppercase mb-0.5">{dateLabel}</p>
        <h1 className="font-display text-xl font-light text-ink tracking-wide">
          {dateJa}
          {streak >= 2 && (
            <span className="text-[11px] text-ink-faint font-normal tracking-normal ml-2">· {streak}日目</span>
          )}
        </h1>
      </div>

      {/* 今日の灯り */}
      <section>
        <p className="text-[10px] text-ink-faint tracking-[0.18em] uppercase mb-3">今日の灯り</p>
        <div className="bg-forest dark:bg-parchment rounded-xl px-6 py-7 min-h-[88px] flex items-center">
          {loading ? (
            <div className="w-32 h-4 bg-white/10 dark:bg-ink/10 rounded animate-pulse" />
          ) : (
            <p className="font-display text-cream/90 dark:text-lantern text-base font-light leading-relaxed tracking-wide">
              {quote || '今日も記録することが、すでに答えだ。'}
            </p>
          )}
        </div>
      </section>

      {/* 記録フォーム */}
      <section>
        <RecordForm
          existingLog={existingLog}
          targetDate={todayStr()}
          onSaved={refreshData}
        />
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

              function snip(text, max = 24) {
                return text.length > max ? text.slice(0, max) + '…' : text
              }

              const observations = []
              const latestEnjoyable = weekLogs.find(l => l.enjoyable)?.enjoyable
              if (latestEnjoyable) observations.push(`「${snip(latestEnjoyable)}」が楽しかったこととして残っています。何がそうさせているのか、少し深めてみると見えてくるものがありそうです。`)

              const latestNext = weekLogs.find(l => l.next)?.next
              if (latestNext) observations.push(`「${snip(latestNext)}」が次の実験として残っています。そこから何かが動き始めるかもしれません。`)

              const latestStruggled = weekLogs.find(l => l.struggled)?.struggled
              if (latestStruggled && !latestEnjoyable) observations.push(`「${snip(latestStruggled)}」が今週の記録に残っています。何が難しくさせているのか、視点を変えてみると見えてくることがあるかもしれません。`)

              const eveningCount = weekLogs.filter(l => {
                if (!l.saved_at) return false
                const h = new Date(l.saved_at).getHours()
                return h >= 20 || h < 5
              }).length
              if (eveningCount >= 2) observations.push('夜の時間帯に記録が続いています。朝に書くとどう変わるか、試してみるのも面白いかもしれません。')

              if (observations.length === 0) {
                const latestCreated = weekLogs[0]?.created
                observations.push(latestCreated
                  ? `「${snip(latestCreated)}」が記録されています。この先どんな変化があるか、少し意識してみると面白いかもしれません。`
                  : '記録が続いています。この流れの中でひとつ実験してみると、新しい気づきが生まれるかもしれません。')
              }

              return (
                <div className="text-sm text-forest leading-relaxed space-y-2">
                  {observations.slice(0, 2).map((obs, i) => <p key={i}>{obs}</p>)}
                </div>
              )
            })()}
          </div>
        </section>
      )}
    </div>
  )
}
