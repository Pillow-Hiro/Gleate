import { useCallback, useEffect, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { authFetch } from '../../lib/supabase'
import { todayStr, calcStreak } from '../../lib/date'
import RecordForm from '../../components/RecordForm'
import MilestoneBanner from '../../components/MilestoneBanner'
import WeeklyDiscovery from '../../components/WeeklyDiscovery'

const MONTHS_EN = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
const WEEKDAYS_JA = ['日','月','火','水','木','金','土']

function formatDateJa(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAYS_JA[date.getDay()]}曜日`
}

function dateDisplayJa(dateStr) {
  const [, m, d] = dateStr.split('-')
  return `${Number(m)}月${Number(d)}日`
}

export default function Home() {
  const params = useLocalSearchParams()
  const router = useRouter()
  const [quote, setQuote] = useState('')
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshTick, setRefreshTick] = useState(0)

  const now = new Date()
  const dateLabel = `${now.getDate()} ${MONTHS_EN[now.getMonth()]}`
  const dateJa = formatDateJa(now)

  const dateParam = typeof params.date === 'string' ? params.date : null
  const targetDate = dateParam && dateParam <= todayStr() ? dateParam : todayStr()
  const isEditingPast = targetDate !== todayStr()

  const refreshData = useCallback(() => setRefreshTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      setLoading(true)
      try {
        const [logsRes, quoteRes] = await Promise.all([
          authFetch('/api/logs'),
          authFetch('/api/daily/quote'),
        ])
        if (logsRes.ok) {
          const logsData = await logsRes.json()
          if (!cancelled) setLogs(logsData)
        }
        if (quoteRes.ok) {
          const quoteData = await quoteRes.json()
          if (!cancelled) setQuote(quoteData.quote || '')
        }
      } catch {
        // fallback — 空のまま表示する
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [refreshTick])

  const existingLog = logs.find((l) => l.date === targetDate) || null
  const streak = calcStreak(logs)

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <ScrollView
        contentContainerClassName="px-5 pt-6 pb-10 gap-8"
        keyboardShouldPersistTaps="handled"
      >
        {/* 日付ヘッダー */}
        <View>
          <Text className="text-xs text-ink-faint tracking-[2px] mb-0.5">{dateLabel}</Text>
          <View className="flex-row items-baseline">
            <Text className="font-display text-xl font-light text-ink">{dateJa}</Text>
            {streak >= 2 ? (
              <Text className="text-xs text-ink-faint ml-2">· {streak}日目</Text>
            ) : null}
          </View>
        </View>

        <MilestoneBanner />

        {/* 今日の灯り */}
        <View>
          <Text className="text-[10px] text-ink-faint tracking-[2px] mb-3">今日の灯り</Text>
          <View className="bg-forest dark:bg-primary rounded-xl px-5 py-5 min-h-[88px] justify-center">
            {loading ? (
              <View className="w-32 h-4 bg-white/20 rounded" />
            ) : (
              <Text className="font-display text-cream dark:text-primary-text text-base font-light leading-relaxed">
                {quote || '今日の記録が、ここに残る。'}
              </Text>
            )}
          </View>
        </View>

        {/* 記録フォーム */}
        <View>
          {isEditingPast ? (
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xs text-ink-faint">
                {dateDisplayJa(targetDate)}の記録を編集中
              </Text>
              <Text onPress={() => router.replace('/')} className="text-xs text-ink-faint">
                ← 今日に戻る
              </Text>
            </View>
          ) : null}
          <RecordForm
            key={existingLog ? existingLog.date : `new-${targetDate}`}
            existingLog={existingLog}
            targetDate={targetDate}
            onSaved={() => {
              refreshData()
              if (isEditingPast) router.replace('/')
            }}
          />
        </View>

        <WeeklyDiscovery logs={logs} />
      </ScrollView>
    </SafeAreaView>
  )
}
