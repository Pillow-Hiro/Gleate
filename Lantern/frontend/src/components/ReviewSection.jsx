import { useState } from 'react'
import { authFetch } from '../lib/supabase'
import PatternCard from './PatternCard'

// 生成からの経過時間。ReviewSection でしか使わないためここに置く。
function formatAge(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return '1時間以内'
  if (hours < 24) return `${hours}時間前`
  const days = Math.floor(hours / 24)
  return `${days}日前`
}

// 今週・今月の振り返り。結果は localStorage に持たせて開き直しても残るようにしている。
export default function ReviewSection({ title, type, description }) {
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
      if (!res.ok) throw new Error(`review/generate returned ${res.status}`)
      const data = await res.json()
      const now = new Date().toISOString()
      const newPatterns = data.patterns || []
      setPatterns(newPatterns)
      setGeneratedAt(now)
      try {
        localStorage.setItem(storageKey, JSON.stringify({ patterns: newPatterns, generatedAt: now }))
      } catch (e) {
        console.warn('[Review] 振り返りのキャッシュ保存に失敗', e)
      }
    } catch (e) {
      console.warn(`[Review] ${type} の生成に失敗`, e)
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
