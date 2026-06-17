import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

function ReviewSection({ title, type, description }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [logCount, setLogCount] = useState(0)

  async function generate() {
    setLoading(true)
    setText('')
    try {
      const res = await fetch(`${API_BASE}/api/review/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      const data = await res.json()
      setText(data.review || '')
      setLogCount(data.log_count || 0)
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
          {loading ? '生成中...' : '振り返る'}
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
          {logCount > 0 && (
            <p className="text-[10px] text-ink-faint tracking-wider uppercase mb-3">
              {logCount}日分の記録をもとに
            </p>
          )}
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
  const [text, setText] = useState('')
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
      const data = await res.json()
      setText(data.strengths || '')
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
          {loading ? '分析中...' : '分析する'}
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
          <p className="text-[10px] text-ink-faint tracking-wider uppercase mb-3">パターンの観察</p>
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

export default function Insights() {
  const [logCount, setLogCount] = useState(0)

  useEffect(() => {
    fetch(`${API_BASE}/api/logs`)
      .then(r => r.json())
      .then(data => setLogCount(data.length))
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
