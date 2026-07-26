import { useState, useEffect } from 'react'
import { authFetch } from '../lib/supabase'
import ActivityCalendar from '../components/ActivityCalendar'
import { localDateStr } from '../lib/date'

function monthsAgoStr(months) {
  const now = new Date()
  const day = now.getDate()
  const target = new Date(now.getFullYear(), now.getMonth() - months, day)
  // 月末日オーバーフロー対応（例：3月31日 - 1ヶ月 → 2月31日 → 2月28日）
  if (target.getDate() !== day) target.setDate(0)
  return localDateStr(target)
}

function findNearestLog(logs, targetStr, rangeInDays = 3) {
  let best = null
  let bestDiff = Infinity
  for (const log of logs) {
    const diff = Math.abs(
      (new Date(log.date) - new Date(targetStr)) / (1000 * 60 * 60 * 24)
    )
    if (diff <= rangeInDays && diff < bestDiff) {
      best = log
      bestDiff = diff
    }
  }
  return best
}

function LogSnapshot({ log, dateHint, isToday }) {
  const fields = [
    { key: 'created', label: null },
    { key: 'enjoyable', label: 'よかったこと' },
    { key: 'struggled', label: '困ったこと' },
    { key: 'next', label: '次にやること' },
  ]

  return (
    <div className="bg-stone/40 rounded-xl px-4 py-4 flex-1 space-y-2.5 min-w-0">
      <p className="text-[10px] text-ink-faint tracking-[0.15em]">
        {log ? log.date : dateHint}
      </p>
      {!log ? (
        <p className="text-sm text-ink-faint">
          {isToday ? '今日の記録はまだありません。' : 'この時期の記録はありません。'}
        </p>
      ) : (
        fields.map(({ key, label }) =>
          log[key] ? (
            <div key={key}>
              {label && (
                <p className="text-[9px] text-ink-faint tracking-wider uppercase mb-0.5">{label}</p>
              )}
              <p className="text-sm text-ink leading-relaxed">{log[key]}</p>
            </div>
          ) : null
        )
      )}
    </div>
  )
}

const PERIODS = [
  { label: '1ヶ月前', months: 1 },
  { label: '3ヶ月前', months: 3 },
  { label: '半年前', months: 6 },
  { label: '1年前', months: 12 },
]

const KEYWORD_PERIODS = [
  { label: '直近1ヶ月', period: '1m' },
  { label: '直近3ヶ月', period: '3m' },
  { label: '直近半年', period: '6m' },
]

function KeywordSection() {
  const today = localDateStr()
  const [data, setData] = useState({})
  const [fetching, setFetching] = useState({})

  async function handleFetch(period) {
    const cacheKey = `insights_keywords_${period}_${today}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try {
        setData(d => ({ ...d, [period]: JSON.parse(cached) }))
        return
      } catch {}
    }
    setFetching(f => ({ ...f, [period]: true }))
    try {
      const res = await authFetch(`/api/insights/keywords?period=${period}`)
      if (!res.ok) return
      const json = await res.json()
      localStorage.setItem(cacheKey, JSON.stringify(json.keywords))
      setData(d => ({ ...d, [period]: json.keywords }))
    } catch {}
    finally {
      setFetching(f => ({ ...f, [period]: false }))
    }
  }

  return (
    <section className="space-y-5">
      <p className="text-[10px] text-ink-faint tracking-[0.18em] uppercase">キーワード</p>
      {KEYWORD_PERIODS.map(({ label, period }) => (
        <div key={period} className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-ink-soft">{label}</p>
            <button
              onClick={() => handleFetch(period)}
              disabled={fetching[period]}
              className="text-xs text-forest border border-sage/40 px-3.5 py-1 rounded-full hover:bg-sage-light/60 transition-colors disabled:opacity-50"
            >
              {fetching[period] ? '取得中...' : data[period] ? '再取得' : 'Lanternに聞く'}
            </button>
          </div>
          {data[period] && (
            <div className="flex flex-wrap gap-2">
              {data[period].length === 0 ? (
                <p className="text-sm text-ink-faint">この期間のキーワードを抽出できませんでした。</p>
              ) : (
                data[period].map(({ word, count }) => (
                  <span key={word} className="inline-flex items-baseline gap-1.5 text-xs bg-stone/60 text-ink-soft px-3 py-1 rounded-full">
                    {word}
                    <span className="text-[10px] text-ink-faint">{count}</span>
                  </span>
                ))
              )}
            </div>
          )}
        </div>
      ))}
    </section>
  )
}

export default function Insights() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authFetch('/api/logs')
      .then(r => r.ok ? r.json() : [])
      .then(data => setLogs(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const today = localDateStr()
  const todayLog = logs.find(l => l.date === today) || null

  return (
    <div className="space-y-10">
      <div>
        <p className="text-[10px] text-ink-faint tracking-[0.18em] uppercase mb-0.5">Insights</p>
        <h1 className="font-display text-xl font-light text-ink">振り返り</h1>
      </div>

      {/* 記録密度 */}
      <section>
        <p className="text-[10px] text-ink-faint tracking-[0.18em] uppercase mb-3">記録密度</p>
        {loading ? (
          <div className="h-36 bg-stone/40 rounded-xl animate-pulse" />
        ) : (
          <div className="bg-stone/40 rounded-xl px-4 py-4">
            <ActivityCalendar
              logs={logs}
              selectedDate=""
              onDateSelect={() => {}}
            />
          </div>
        )}
      </section>

      {/* 過去との比較 */}
      <section className="space-y-6">
        <p className="text-[10px] text-ink-faint tracking-[0.18em] uppercase">過去との比較</p>
        {loading ? (
          <div className="space-y-4">
            {PERIODS.map(p => (
              <div key={p.months} className="h-28 bg-stone/40 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          PERIODS.map(({ label, months }) => {
            const target = monthsAgoStr(months)
            const pastLog = findNearestLog(logs, target)
            return (
              <div key={months} className="space-y-2">
                <p className="text-xs text-ink-soft tracking-wide">{label}</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <LogSnapshot log={pastLog} dateHint={target} isToday={false} />
                  <LogSnapshot log={todayLog} dateHint={today} isToday={true} />
                </div>
              </div>
            )
          })
        )}
      </section>

      {/* キーワード */}
      <KeywordSection />
    </div>
  )
}
