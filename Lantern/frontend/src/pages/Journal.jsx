import { useState, useEffect } from 'react'
import { authFetch } from '../lib/supabase'
import ActivityCalendar from '../components/ActivityCalendar'

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

function truncateTitle(text, maxLength = 20) {
  if (!text) return ''
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
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

// ── 記録詳細 ──────────────────────────────────────────────────
function LogDetail({ log, onDelete, onUpdate }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

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

  function handleEditStart() {
    setEditForm({
      created: log.created || '',
      enjoyable: log.enjoyable || '',
      struggled: log.struggled || '',
      next: log.next || '',
    })
    setEditing(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await authFetch('/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: log.date, ...editForm }),
      })
      if (!res.ok) throw new Error('save failed')
      const data = await res.json()
      if (onUpdate) {
        onUpdate({ ...log, ...editForm, ai_response: data.ai_response ?? log.ai_response })
      }
      setEditing(false)
    } catch {
      // エラー時は編集状態を維持
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setEditing(false)
    setEditForm({})
  }

  const displayFields = [
    { key: 'created', label: 'やったこと' },
    { key: 'enjoyable', label: 'よかったこと' },
    { key: 'struggled', label: '困ったこと' },
    { key: 'next', label: '次にやること' },
  ]

  const editFields = [
    { field: 'created', label: 'やったこと', placeholder: '今日やったこと' },
    { field: 'enjoyable', label: 'よかったこと', placeholder: 'よかったこと' },
    { field: 'struggled', label: '困ったこと', placeholder: '詰まったこと' },
    { field: 'next', label: '次にやること', placeholder: '次の一歩' },
  ]

  if (editing) {
    return (
      <div className="mt-3 space-y-3 pb-1">
        {editFields.map(({ field, label, placeholder }) => (
          <div key={field}>
            <label className="text-[10px] text-ink-faint tracking-wider uppercase block mb-1">{label}</label>
            <textarea
              value={editForm[field]}
              onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))}
              placeholder={placeholder}
              rows={3}
              className="w-full bg-stone border border-border rounded-lg px-3 py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-sage/50 transition-colors resize-none"
            />
          </div>
        ))}
        <div className="flex items-center justify-end gap-4 pt-1">
          <button onClick={handleCancel} className="text-xs text-ink-faint hover:text-ink transition-colors">
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs text-forest border border-sage/40 px-3.5 py-1.5 rounded-full hover:bg-sage-light transition-colors disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-2.5 pb-1">
      {displayFields.map(({ key, label }) =>
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
            <button onClick={handleEditStart} className="text-xs text-ink-faint hover:text-forest transition-colors">
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
    <div className="bg-sage-light/60 border border-sage/20 rounded-xl px-5 py-4 space-y-2.5">
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
          {loading ? '生成中...' : '振り返る'}
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

// ── タイムライン振り返り ────────────────────────────────────────
function TimelineSection() {
  const MONTHS_OPTIONS = [1, 3, 6]
  const [months, setMonths] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { setData(null) }, [months])

  async function handleReflect() {
    setLoading(true)
    try {
      const res = await authFetch(`/api/timeline-reflection?months_ago=${months}`)
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  function formatPastDate(dateStr) {
    if (!dateStr) return ''
    const [y, m, d] = dateStr.split('-').map(Number)
    return `${y}年${m}月${d}日`
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-light text-ink">過去との対話</h2>
          <p className="text-xs text-ink-faint mt-0.5">あの頃の自分と、今の自分。</p>
        </div>
        <button
          onClick={handleReflect}
          disabled={loading}
          className="text-xs text-forest border border-sage/40 px-3.5 py-1.5 rounded-full hover:bg-sage-light transition-colors disabled:opacity-50 shrink-0"
        >
          {loading ? '観察中...' : '振り返る'}
        </button>
      </div>

      {/* 期間タブ */}
      <div className="flex gap-1 border-b border-border pb-0">
        {MONTHS_OPTIONS.map(m => (
          <button
            key={m}
            onClick={() => setMonths(m)}
            className={`text-xs px-3 py-1.5 transition-colors border-b-2 -mb-px ${
              months === m
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-faint hover:text-ink-soft'
            }`}
          >
            {m}ヶ月前
          </button>
        ))}
      </div>

      {/* ローディング */}
      {loading && (
        <div className="space-y-3">
          <div className="bg-stone/60 rounded-xl px-5 py-4 space-y-2.5 animate-pulse">
            <div className="h-3.5 bg-parchment rounded w-3/4" />
            <div className="h-3 bg-parchment rounded w-1/2" />
          </div>
        </div>
      )}

      {/* 初期状態 */}
      {!loading && data === null && (
        <div className="border border-border border-dashed rounded-xl px-5 py-6 text-center">
          <p className="text-sm text-ink-faint">「振り返る」を押すと、{months}ヶ月前の記録と今を照らし合わせます</p>
        </div>
      )}

      {/* 過去の記録なし */}
      {!loading && data !== null && data.past_logs.length === 0 && (
        <div className="border border-border border-dashed rounded-xl px-5 py-6 text-center">
          <p className="text-sm text-ink-faint">{months}ヶ月前の記録はありません。</p>
        </div>
      )}

      {/* 過去の記録あり */}
      {!loading && data !== null && data.past_logs.length > 0 && (
        <div className="space-y-3 lantern-fade-in">
          <p className="text-[10px] text-ink-faint tracking-wider">{formatPastDate(data.past_date)}の週</p>
          <div className="space-y-2">
            {data.past_logs.map((log, i) => (
              <div key={i} className="bg-stone/40 rounded-lg px-4 py-3 space-y-1">
                <p className="text-[10px] text-ink-faint">{log.date}</p>
                <p className="text-sm text-ink leading-relaxed">{log.created || '（記録あり）'}</p>
                {log.enjoyable && <p className="text-xs text-ink-soft">よかったこと：{log.enjoyable}</p>}
                {log.struggled && <p className="text-xs text-ink-soft">詰まったこと：{log.struggled}</p>}
              </div>
            ))}
          </div>

          {/* AIの観察 */}
          {data.reflection && (
            <PatternCard
              observation={data.reflection.observation}
              question={data.reflection.question}
            />
          )}
        </div>
      )}
    </section>
  )
}

// ── リストアイテム ─────────────────────────────────────────────
function LogItem({ log, onDelete, onUpdate }) {
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

// ── Journal ───────────────────────────────────────────────────
export default function Journal() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState(null)
  const [activeTab, setActiveTab] = useState('record')
  const [modalDate, setModalDate] = useState(null)
  const [modalForm, setModalForm] = useState({ created: '', enjoyable: '', struggled: '', next: '' })
  const [modalSaving, setModalSaving] = useState(false)

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

  function handleUpdate(updatedLog) {
    setLogs(prev => prev.map(l => l.date === updatedLog.date ? updatedLog : l))
  }

  function handleDateClick(date) {
    const existingLog = logs.find(l => l.date === date)
    if (existingLog) {
      setSelectedDate(date)
    } else {
      setSelectedDate(null)
      setModalDate(date)
      setModalForm({ created: '', enjoyable: '', struggled: '', next: '' })
    }
  }

  async function handleModalSave() {
    if (!modalForm.created.trim()) return
    setModalSaving(true)
    try {
      const res = await authFetch('/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: modalDate, ...modalForm }),
      })
      if (!res.ok) throw new Error('save failed')
      const data = await res.json()
      const newLog = { date: modalDate, ...modalForm, ai_response: data.ai_response }
      setLogs(prev => [...prev, newLog])
      setSelectedDate(modalDate)
      setModalDate(null)
    } catch {
      // エラー時はモーダルを維持
    } finally {
      setModalSaving(false)
    }
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

  function TabButton({ id, label }) {
    const isActive = activeTab === id
    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`text-sm px-1 pb-2.5 border-b-2 -mb-px transition-colors ${
          isActive
            ? 'text-accent border-accent'
            : 'text-ink-faint border-transparent hover:text-ink'
        }`}
      >
        {label}
      </button>
    )
  }

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

      {/* タブ */}
      <div className="flex gap-4 border-b border-border">
        <TabButton id="record" label="記録" />
        <TabButton id="review" label="振り返り" />
      </div>

      {/* 記録タブ */}
      {activeTab === 'record' && (
        <div className="space-y-8">
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
              <ActivityCalendar logs={logs} selectedDate={selectedDate || ''} onDateSelect={handleDateClick} />
              {!loading && logs.length === 0 && (
                <p className="text-[11px] text-ink-faint text-center mt-3">
                  日付をタップして記録を始めましょう
                </p>
              )}
            </div>
            {selectedDate && selectedLog && (
              <div className="mt-3 bg-stone/40 rounded-xl px-5 py-4">
                <p className="text-xs text-ink-faint tracking-wide mb-2">{dateDisplayJa(selectedDate)}</p>
                <LogDetail log={selectedLog} onDelete={handleDelete} onUpdate={handleUpdate} />
              </div>
            )}
            {selectedDate && !selectedLog && (
              <p className="text-xs text-ink-faint text-center mt-3">この日の記録はありません</p>
            )}
          </section>

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
                      <LogItem key={log.date} log={log} onDelete={handleDelete} onUpdate={handleUpdate} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 振り返りタブ */}
      {activeTab === 'review' && (
        <div className="space-y-8">
          <ReviewSection title="今週の振り返り" type="weekly" description="過去7日間の活動から" />
          <ReviewSection title="今月の振り返り" type="monthly" description="今月の活動から" />
          <TimelineSection />
        </div>
      )}

      {/* 記録モーダル */}
      {modalDate && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center sm:px-4"
          onClick={() => setModalDate(null)}
        >
          <div
            className="bg-cream w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl px-5 pt-5 pb-8 sm:py-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-ink-faint tracking-wider">{dateDisplayJa(modalDate)}</p>
              <button
                onClick={() => setModalDate(null)}
                className="text-ink-faint hover:text-ink transition-colors p-1 -mr-1"
                aria-label="閉じる"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" viewBox="0 0 14 14">
                  <line x1="2" y1="2" x2="12" y2="12" />
                  <line x1="12" y1="2" x2="2" y2="12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              {[
                { field: 'created',   label: 'やったこと',   placeholder: '今日やったこと', rows: 3 },
                { field: 'enjoyable', label: 'よかったこと', placeholder: 'よかったこと（任意）', rows: 2 },
                { field: 'struggled', label: '困ったこと',   placeholder: '詰まったこと（任意）', rows: 2 },
                { field: 'next',      label: '次にやること', placeholder: '次の一歩（任意）', rows: 2 },
              ].map(({ field, label, placeholder, rows }) => (
                <div key={field}>
                  <label className="text-[10px] text-ink-faint tracking-wider uppercase block mb-1">{label}</label>
                  <textarea
                    value={modalForm[field]}
                    onChange={e => setModalForm(f => ({ ...f, [field]: e.target.value }))}
                    placeholder={placeholder}
                    rows={rows}
                    className="w-full bg-stone border border-border rounded-lg px-3 py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-sage/50 transition-colors resize-none"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-4 pt-1">
              <button onClick={() => setModalDate(null)} className="text-xs text-ink-faint hover:text-ink transition-colors">
                キャンセル
              </button>
              <button
                onClick={handleModalSave}
                disabled={modalSaving || !modalForm.created.trim()}
                className="text-xs text-forest border border-sage/40 px-3.5 py-1.5 rounded-full hover:bg-sage-light transition-colors disabled:opacity-50"
              >
                {modalSaving ? '保存中...' : '記録する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
