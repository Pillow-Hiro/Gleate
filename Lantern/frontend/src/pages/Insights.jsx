import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

function formatAge(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return '1時間以内'
  if (hours < 24) return `${hours}時間前`
  const days = Math.floor(hours / 24)
  return `${days}日前`
}

function ReviewSection({ title, type, description }) {
  const storageKey = `lantern-review-${type}`

  const [text, setText] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey))?.text || '' } catch { return '' }
  })
  const [logCount, setLogCount] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey))?.logCount || 0 } catch { return 0 }
  })
  const [generatedAt, setGeneratedAt] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey))?.generatedAt || '' } catch { return '' }
  })
  const [loading, setLoading] = useState(false)

  async function generate() {
    setLoading(true)
    setText('')
    try {
      const res = await fetch(`${API_BASE}/api/review/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const now = new Date().toISOString()
      setText(data.review || '')
      setLogCount(data.log_count || 0)
      setGeneratedAt(now)
      localStorage.setItem(storageKey, JSON.stringify({
        text: data.review || '',
        logCount: data.log_count || 0,
        generatedAt: now,
      }))
    } catch {
      setText('振り返りの生成に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

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
          {loading ? '生成中...' : text ? '再生成' : '振り返る'}
        </button>
      </div>

      {loading && (
        <div className="space-y-2 pt-1">
          <div className="h-3.5 bg-stone rounded animate-pulse w-full" />
          <div className="h-3.5 bg-stone rounded animate-pulse w-4/5" />
          <div className="h-3.5 bg-stone rounded animate-pulse w-3/5" />
        </div>
      )}

      {text && !loading && (
        <div className="bg-stone/60 rounded-xl px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            {logCount > 0 && (
              <p className="text-[10px] text-ink-faint tracking-wider uppercase">
                {logCount}日分の記録をもとに
              </p>
            )}
            {generatedAt && (
              <p className="text-[10px] text-ink-faint">{formatAge(generatedAt)}</p>
            )}
          </div>
          <p className="text-sm text-ink leading-[1.9]">{text}</p>
        </div>
      )}

      {!text && !loading && (
        <div className="border border-border border-dashed rounded-xl px-5 py-6 text-center">
          <p className="text-sm text-ink-faint">「振り返る」を押すと、Lanternが記録から気づきを届けます</p>
        </div>
      )}
    </section>
  )
}

const STRENGTHS_UNLOCK_DAYS = 7

function StrengthsSection({ logCount }) {
  const storageKey = 'lantern-strengths'

  const [text, setText] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey))?.text || '' } catch { return '' }
  })
  const [generatedAt, setGeneratedAt] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey))?.generatedAt || '' } catch { return '' }
  })
  const [loading, setLoading] = useState(false)
  const unlocked = logCount >= STRENGTHS_UNLOCK_DAYS

  async function generate() {
    setLoading(true)
    setText('')
    try {
      const res = await fetch(`${API_BASE}/api/strengths/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const now = new Date().toISOString()
      setText(data.strengths || '')
      setGeneratedAt(now)
      localStorage.setItem(storageKey, JSON.stringify({
        text: data.strengths || '',
        generatedAt: now,
      }))
    } catch {
      setText('分析の生成に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  if (!unlocked) {
    const progress = Math.min((logCount / STRENGTHS_UNLOCK_DAYS) * 100, 100)
    return (
      <section className="space-y-3">
        <div>
          <h2 className="font-display text-base font-light text-ink">強みの言語化</h2>
          <p className="text-xs text-ink-faint mt-0.5">7日以上の記録で解放されます</p>
        </div>
        <div className="border border-border border-dashed rounded-xl px-5 py-5">
          <div className="mb-3">
            <div className="h-1 bg-stone rounded-full overflow-hidden">
              <div
                className="h-full bg-sage/50 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] text-ink-faint mt-1.5">{logCount} / {STRENGTHS_UNLOCK_DAYS}日</p>
          </div>
          <p className="text-sm text-ink-faint">続けることで見えてくる、あなただけのパターン</p>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-light text-ink">強みの言語化</h2>
          <p className="text-xs text-ink-faint mt-0.5">{logCount}日間の記録から</p>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="text-xs text-forest border border-sage/40 px-3.5 py-1.5 rounded-full hover:bg-sage-light transition-colors disabled:opacity-50 shrink-0"
        >
          {loading ? '分析中...' : text ? '再分析' : '分析する'}
        </button>
      </div>

      {loading && (
        <div className="space-y-2 pt-1">
          <div className="h-3.5 bg-stone rounded animate-pulse w-full" />
          <div className="h-3.5 bg-stone rounded animate-pulse w-4/5" />
          <div className="h-3.5 bg-stone rounded animate-pulse w-3/5" />
        </div>
      )}

      {text && !loading && (
        <div className="bg-stone/60 rounded-xl px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-ink-faint tracking-wider uppercase">パターンの観察</p>
            {generatedAt && (
              <p className="text-[10px] text-ink-faint">{formatAge(generatedAt)}</p>
            )}
          </div>
          <p className="text-sm text-ink leading-[1.9]">{text}</p>
        </div>
      )}

      {!text && !loading && (
        <div className="border border-border border-dashed rounded-xl px-5 py-6 text-center">
          <p className="text-sm text-ink-faint">「分析する」を押すと、Lanternが記録からパターンを届けます</p>
        </div>
      )}
    </section>
  )
}

function WeeklyChangeSection({ lastWeekCount, thisWeekCount }) {
  const storageKey = 'lantern-weekly-change'
  const unlocked = lastWeekCount >= 1 && thisWeekCount >= 1

  const [text, setText] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey))?.text || '' } catch { return '' }
  })
  const [generatedAt, setGeneratedAt] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey))?.generatedAt || '' } catch { return '' }
  })
  const [loading, setLoading] = useState(false)

  async function generate() {
    setLoading(true)
    setText('')
    try {
      const res = await fetch(`${API_BASE}/api/weekly-change`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      const now = new Date().toISOString()
      setText(data.change || '')
      setGeneratedAt(now)
      localStorage.setItem(storageKey, JSON.stringify({
        text: data.change || '',
        generatedAt: now,
      }))
    } catch {
      setText('変化の言語化に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-light text-ink">先週からの変化</h2>
          <p className="text-xs text-ink-faint mt-0.5">先週と今週の記録から</p>
        </div>
        {unlocked && (
          <button
            onClick={generate}
            disabled={loading}
            className="text-xs text-forest border border-sage/40 px-3.5 py-1.5 rounded-full hover:bg-sage-light transition-colors disabled:opacity-50 shrink-0"
          >
            {loading ? '生成中...' : text ? '再生成' : '変化を見る'}
          </button>
        )}
      </div>

      {!unlocked && (
        <div className="border border-border border-dashed rounded-xl px-5 py-6 text-center">
          <p className="text-sm text-ink-faint">先週と今週の記録が揃うと、変化が見えてきます。</p>
        </div>
      )}

      {unlocked && loading && (
        <div className="space-y-2 pt-1">
          <div className="h-3.5 bg-stone rounded animate-pulse w-full" />
          <div className="h-3.5 bg-stone rounded animate-pulse w-4/5" />
          <div className="h-3.5 bg-stone rounded animate-pulse w-3/5" />
        </div>
      )}

      {unlocked && text && !loading && (
        <div className="bg-stone/60 rounded-xl px-5 py-4">
          {generatedAt && (
            <p className="text-[10px] text-ink-faint mb-3">{formatAge(generatedAt)}</p>
          )}
          <p className="text-sm text-ink leading-[1.9]">{text}</p>
        </div>
      )}

      {unlocked && !text && !loading && (
        <div className="border border-border border-dashed rounded-xl px-5 py-6 text-center">
          <p className="text-sm text-ink-faint">「変化を見る」を押すと、Lanternが先週との違いを届けます</p>
        </div>
      )}
    </section>
  )
}

export default function Insights() {
  const [logCount, setLogCount] = useState(0)
  const [lastWeekCount, setLastWeekCount] = useState(0)
  const [thisWeekCount, setThisWeekCount] = useState(0)

  useEffect(() => {
    fetch(`${API_BASE}/api/logs`)
      .then(r => r.json())
      .then(data => {
        setLogCount(data.length)

        const today = new Date()
        const daysSinceMonday = (today.getDay() + 6) % 7
        const thisMonday = new Date(today)
        thisMonday.setDate(today.getDate() - daysSinceMonday)
        const lastMonday = new Date(thisMonday)
        lastMonday.setDate(thisMonday.getDate() - 7)
        const lastSunday = new Date(thisMonday)
        lastSunday.setDate(thisMonday.getDate() - 1)

        function lds(d) {
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        }
        const thisMondayStr = lds(thisMonday)
        const todayStr = lds(today)
        const lastMondayStr = lds(lastMonday)
        const lastSundayStr = lds(lastSunday)

        setThisWeekCount(data.filter(l => l.date >= thisMondayStr && l.date <= todayStr).length)
        setLastWeekCount(data.filter(l => l.date >= lastMondayStr && l.date <= lastSundayStr).length)
      })
      .catch(() => {})
  }, [])

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

      <ReviewSection
        title="今週の振り返り"
        type="weekly"
        description="過去7日間の活動から"
      />

      <div className="h-px bg-border" />

      <WeeklyChangeSection lastWeekCount={lastWeekCount} thisWeekCount={thisWeekCount} />

      <div className="h-px bg-border" />

      <ReviewSection
        title="今月の振り返り"
        type="monthly"
        description="今月の活動から"
      />

      <div className="h-px bg-border" />

      <StrengthsSection logCount={logCount} />
    </div>
  )
}
