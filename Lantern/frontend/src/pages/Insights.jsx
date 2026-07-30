import { useState, useEffect } from 'react'
import { authFetch } from '../lib/supabase'
import ActivityCalendar from '../components/ActivityCalendar'
import LogSnapshot from '../components/LogSnapshot'
import KeywordSection from '../components/KeywordSection'
import { localDateStr, monthsAgoStr, findNearestLog } from '../lib/date'

const PERIODS = [
  { label: '1ヶ月前', months: 1 },
  { label: '3ヶ月前', months: 3 },
  { label: '半年前', months: 6 },
  { label: '1年前', months: 12 },
]

export default function Insights() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authFetch('/api/logs')
      .then(r => r.ok ? r.json() : [])
      .then(data => setLogs(data))
      .catch(e => console.warn('[Insights] 記録の取得に失敗', e))
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
