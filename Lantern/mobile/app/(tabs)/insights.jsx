import { useEffect, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { authFetch } from '../../lib/supabase'
import { localDateStr, monthsAgoStr, findNearestLog } from '../../lib/date'
import ActivityCalendar from '../../components/ActivityCalendar'
import KeywordSection from '../../components/KeywordSection'

const PERIODS = [
  { label: '1ヶ月前', months: 1 },
  { label: '3ヶ月前', months: 3 },
  { label: '半年前', months: 6 },
  { label: '1年前', months: 12 },
]

const SNAPSHOT_FIELDS = [
  { key: 'created', label: null },
  { key: 'enjoyable', label: 'よかったこと' },
  { key: 'struggled', label: '困ったこと' },
  { key: 'next', label: '次にやること' },
]

function LogSnapshot({ log, dateHint, isToday }) {
  return (
    <View className="bg-stone/40 rounded-xl px-4 py-4 flex-1 gap-2.5">
      <Text className="text-[10px] text-ink-faint tracking-[1px]">{log ? log.date : dateHint}</Text>
      {!log ? (
        <Text className="text-sm text-ink-faint">
          {isToday ? '今日の記録はまだありません。' : 'この時期の記録はありません。'}
        </Text>
      ) : (
        SNAPSHOT_FIELDS.map(({ key, label }) =>
          log[key] ? (
            <View key={key}>
              {label ? <Text className="text-[9px] text-ink-faint mb-0.5">{label}</Text> : null}
              <Text className="text-sm text-ink leading-relaxed">{log[key]}</Text>
            </View>
          ) : null
        )
      )}
    </View>
  )
}

export default function Insights() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await authFetch('/api/logs')
        const data = res.ok ? await res.json() : []
        if (!cancelled) setLogs(data)
      } catch {
        // 取得失敗時は空のままにする
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const today = localDateStr()
  const todayLog = logs.find((l) => l.date === today) || null

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pt-6 pb-10 gap-10">
        <View>
          <Text className="text-[10px] text-ink-faint tracking-[2px] mb-0.5">INSIGHTS</Text>
          <Text className="font-display text-xl font-light text-ink">振り返り</Text>
        </View>

        {/* 記録密度 */}
        <View>
          <Text className="text-[10px] text-ink-faint tracking-[2px] mb-3">記録密度</Text>
          {loading ? (
            <View className="h-36 bg-stone/40 rounded-xl" />
          ) : (
            <View className="bg-stone/40 rounded-xl px-4 py-4">
              {/* 読み取り専用。日付タップでは何も起こさない */}
              <ActivityCalendar logs={logs} selectedDate="" onDateSelect={() => {}} />
            </View>
          )}
        </View>

        {/* 過去との比較 */}
        <View className="gap-6">
          <Text className="text-[10px] text-ink-faint tracking-[2px]">過去との比較</Text>
          {loading ? (
            <View className="gap-4">
              {PERIODS.map((p) => (
                <View key={p.months} className="h-28 bg-stone/40 rounded-xl" />
              ))}
            </View>
          ) : (
            PERIODS.map(({ label, months }) => {
              const target = monthsAgoStr(months)
              const pastLog = findNearestLog(logs, target)
              return (
                <View key={months} className="gap-2">
                  <Text className="text-xs text-ink-soft">{label}</Text>
                  {/* Web版は広い画面で横並びにしていたが、モバイルでは常に縦並びにする */}
                  <View className="gap-3">
                    <LogSnapshot log={pastLog} dateHint={target} isToday={false} />
                    <LogSnapshot log={todayLog} dateHint={today} isToday />
                  </View>
                </View>
              )
            })
          )}
        </View>

        <KeywordSection />
      </ScrollView>
    </SafeAreaView>
  )
}
