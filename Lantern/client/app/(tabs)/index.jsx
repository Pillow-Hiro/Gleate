import { useCallback, useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { authFetch } from '../../lib/supabase'
import { todayStr, calcStreak } from '../../lib/date'
import RecordForm from '../../components/RecordForm'
import MilestoneBanner from '../../components/MilestoneBanner'
import WeeklyDiscovery from '../../components/WeeklyDiscovery'
import IdeasPanel from '../../components/IdeasPanel'

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
  const [question, setQuestion] = useState('')
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshTick, setRefreshTick] = useState(0)
  // アイデアは 2026-08-08 に「記録」から移した。
  // 思いついた瞬間に置くものなので、書く場所にある方が自然。
  // 「記録」は残したものを見る場所であって、置く場所ではなかった。
  const [writeTab, setWriteTab] = useState('record')

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
        const [logsRes, quoteRes, questionRes] = await Promise.all([
          authFetch('/api/logs'),
          authFetch('/api/daily/quote'),
          authFetch('/api/question'),
        ])
        if (logsRes.ok) {
          const logsData = await logsRes.json()
          if (!cancelled) setLogs(logsData)
        }
        if (quoteRes.ok) {
          const quoteData = await quoteRes.json()
          if (!cancelled) setQuote(quoteData.quote || '')
        }
        if (questionRes.ok) {
          const questionData = await questionRes.json()
          if (!cancelled) setQuestion(questionData.question || '')
        }
      } catch (e) {
        // 取得できなければ空のまま表示する
        console.warn('[Home] 記録・今日の灯りの取得に失敗', e)
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
        contentContainerClassName="px-5 pt-6 pb-10 gap-8 w-full max-w-2xl self-center"
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

        {/* 記録とアイデアのタブ。
            灯りはこの上に置いたまま。その日の入口はどちらにも要る。
            過去日の編集中はタブを出さない（アイデアは日付を持たないため）。 */}
        {!isEditingPast ? (
          <View className="flex-row gap-4 border-b border-border">
            {[
              { id: 'record', label: '記録' },
              { id: 'ideas', label: 'アイデア' },
            ].map(({ id, label }) => (
              <Pressable
                key={id}
                onPress={() => setWriteTab(id)}
                className={`px-1 pb-2.5 border-b-2 ${
                  writeTab === id ? 'border-accent' : 'border-transparent'
                }`}
              >
                <Text className={`text-sm ${writeTab === id ? 'text-accent' : 'text-ink-faint'}`}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* 記録フォーム */}
        <View style={writeTab === 'record' || isEditingPast ? undefined : { display: 'none' }}>
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
            question={question}
            onSaved={() => {
              refreshData()
              if (isEditingPast) router.replace('/')
            }}
          />
        </View>

        {/* アイデア。display で隠すだけにして、入力途中の文字を消さない */}
        <View style={writeTab === 'ideas' && !isEditingPast ? undefined : { display: 'none' }}>
          <IdeasPanel />
        </View>

        {/* 今週の発見は記録タブのときだけ。アイデアを見ているときには要らない */}
        {writeTab === 'record' || isEditingPast ? <WeeklyDiscovery logs={logs} /> : null}
      </ScrollView>
    </SafeAreaView>
  )
}
