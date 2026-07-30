import { useState, useEffect } from 'react'
import { authFetch } from '../lib/supabase'
import PatternCard from './PatternCard'

// 過去との対話。Journal.jsx から切り出したもので、挙動は変えていない。
export default function TimelineSection() {
  const MONTHS_OPTIONS = [1, 3, 6]
  const [months, setMonths] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { setData(null) }, [months])

  async function handleReflect() {
    setLoading(true)
    try {
      const res = await authFetch(`/api/timeline-reflection?months_ago=${months}`)
      if (!res.ok) throw new Error(`timeline-reflection returned ${res.status}`)
      setData(await res.json())
    } catch (e) {
      console.warn('[Timeline] 過去との対話の取得に失敗', e)
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
