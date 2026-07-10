import { useState } from 'react'
import { authFetch } from '../lib/supabase'

function formatAge(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return '1時間以内'
  if (hours < 24) return `${hours}時間前`
  const days = Math.floor(hours / 24)
  return `${days}日前`
}

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
    // 既存パターンがあればフェードアウトしてから開始
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

      {/* ローディング：パターンカード型スケルトン */}
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

      {/* パターンカード */}
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

      {/* 未生成 */}
      {!loading && patterns === null && (
        <div className="border border-border border-dashed rounded-xl px-5 py-6 text-center">
          <p className="text-sm text-ink-faint">「振り返る」を押すと、Lanternが記録から気づきを届けます</p>
        </div>
      )}

      {/* 生成済みだがパターンなし */}
      {!loading && isEmpty && (
        <div className="border border-border border-dashed rounded-xl px-5 py-6 text-center">
          <p className="text-sm text-ink-faint">記録が増えると、パターンが見えてきます。</p>
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
