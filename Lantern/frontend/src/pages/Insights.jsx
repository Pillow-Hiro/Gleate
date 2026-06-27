import { useState } from 'react'

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
    try { return JSON.parse(localStorage.getItem(storageKey))?.text || '' } catch { /* localStorage unavailable */ return '' }
  })
  const [logCount, setLogCount] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey))?.logCount || 0 } catch { /* localStorage unavailable */ return 0 }
  })
  const [generatedAt, setGeneratedAt] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey))?.generatedAt || '' } catch { /* localStorage unavailable */ return '' }
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
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          text: data.review || '',
          logCount: data.log_count || 0,
          generatedAt: now,
        }))
      } catch { /* localStorage unavailable */ }
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

export default function Insights() {
  return (
    <div className="space-y-10">
      <div>
        <p className="text-[10px] text-ink-faint tracking-[0.18em] uppercase mb-0.5">Insights</p>
        <h1 className="font-display text-xl font-light text-ink">振り返り</h1>
        <p className="text-sm text-ink-soft mt-2 leading-relaxed">
          記録の積み重ねから、Lanternがパターンと気づきを届けます。
        </p>
      </div>
      <div className="h-px bg-border" />
      <ReviewSection title="今週の振り返り" type="weekly" description="過去7日間の活動から" />
      <div className="h-px bg-border" />
      <ReviewSection title="今月の振り返り" type="monthly" description="今月の活動から" />
    </div>
  )
}
