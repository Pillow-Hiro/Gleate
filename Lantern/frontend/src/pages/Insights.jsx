import { useState, useEffect } from 'react'
import { authFetch } from '../lib/supabase'
import ActivityCalendar from '../components/ActivityCalendar'

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

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] text-ink-faint tracking-[0.18em] uppercase mb-0.5">Insights</p>
        <h1 className="font-display text-xl font-light text-ink">振り返り</h1>
      </div>

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
    </div>
  )
}
