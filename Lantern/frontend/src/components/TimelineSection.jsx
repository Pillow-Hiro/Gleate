import { useState, useEffect } from 'react'
import { authFetch } from '../lib/supabase'
import { localDateStr, monthsAgoStr, findNearestLog } from '../lib/date'
import PatternCard from './PatternCard'
import LogSnapshot from './LogSnapshot'

// 過去との対話。
// 常時は「その頃の記録」と「今日の記録」を左右に並べるだけ（事実の提示）。
// 「振り返る」を押したときだけAIの観察と問いが加わる。
// Insights AI憲法の①記録を並べる ②差分を提示する までで止め、③意味づけはしない。
const PERIODS = [
  { label: '1ヶ月前', months: 1 },
  { label: '3ヶ月前', months: 3 },
  { label: '半年前', months: 6 },
  { label: '1年前', months: 12 },
]

export default function TimelineSection({ logs = [] }) {
  const [months, setMonths] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  // 期間を切り替えたらAIの観察は破棄する。別の期間の観察が残ると事実とずれる。
  useEffect(() => { setData(null) }, [months])

  const today = localDateStr()
  const todayLog = logs.find(l => l.date === today) || null
  const target = monthsAgoStr(months)
  const pastLog = findNearestLog(logs, target)

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
        {PERIODS.map(({ label, months: m }) => (
          <button
            key={m}
            onClick={() => setMonths(m)}
            className={`text-xs px-3 py-1.5 transition-colors border-b-2 -mb-px ${
              months === m
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-faint hover:text-ink-soft'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 常時表示：その頃の記録と今日の記録を並べる */}
      <div className="flex flex-col sm:flex-row gap-3">
        <LogSnapshot log={pastLog} dateHint={target} isToday={false} />
        <LogSnapshot log={todayLog} dateHint={today} isToday={true} />
      </div>

      {/* AIの観察 */}
      {loading && (
        <div className="bg-stone/60 rounded-xl px-5 py-4 space-y-2.5 animate-pulse">
          <div className="h-3.5 bg-parchment rounded w-3/4" />
          <div className="h-3 bg-parchment rounded w-1/2" />
        </div>
      )}

      {!loading && data !== null && data.past_logs.length === 0 && (
        <div className="border border-border border-dashed rounded-xl px-5 py-6 text-center">
          <p className="text-sm text-ink-faint">{PERIODS.find(p => p.months === months)?.label}の記録はありません。</p>
        </div>
      )}

      {!loading && data?.reflection && (
        <div className="lantern-fade-in">
          <PatternCard
            observation={data.reflection.observation}
            question={data.reflection.question}
          />
        </div>
      )}
    </section>
  )
}
