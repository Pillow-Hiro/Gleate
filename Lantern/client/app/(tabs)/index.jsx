import { useCallback, useEffect, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import Text from '../../components/Text'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BOTTOM_GAP, useTabBarInset } from '../../lib/tabBar'
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
  // すりガラスのタブバーは内容の上に浮くので、その分だけ下を空ける
  const tabInset = useTabBarInset()
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

  // Home だけ地を沈める。CLAUDE.md「Home画面のみの特例」。
  // 「本当に暗闇に灯りが1つだけある」感覚を強めるため。
  return (
    <SafeAreaView className="flex-1 bg-home-bg" edges={['top']}>
      <ScrollView
        contentContainerClassName="px-5 pt-6 gap-8 w-full max-w-2xl self-center"
        contentContainerStyle={{ paddingBottom: tabInset + BOTTOM_GAP }}
        keyboardShouldPersistTaps="handled"
      >
        {/* 日付ヘッダー */}
        <View>
          {/* 英数字だけの行なので Inter。和文フォントの英数字より字幅が揃う */}
          <Text className="font-mono text-aux text-text-secondary tracking-[2px] mb-0.5">{dateLabel}</Text>
          <View className="flex-row items-baseline">
            <Text className="font-display text-xl text-ink">{dateJa}</Text>
            {streak >= 2 ? (
              <Text className="text-aux text-ink-faint ml-2">· {streak}日目</Text>
            ) : null}
          </View>
        </View>

        <MilestoneBanner />

        {/* 今日の灯り */}
        <View>
          {/* ラベルの灯り色は home-warm。他画面の accent より一段落とす。
              Home の地が沈んでいるぶん、同じ強さだと灯りが強く見えるため */}
          <Text className="text-[10px] text-home-warm tracking-[2px] mb-3">今日の灯り</Text>
          <View className="bg-brand-green rounded-xl px-5 py-5 min-h-[88px] justify-center">
            {loading ? (
              <View className="w-32 h-4 bg-white/20 rounded" />
            ) : (
              <Text className="font-display text-primary-text text-quote">
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
                <Text className={`text-body ${writeTab === id ? 'text-accent' : 'text-ink-faint'}`}>
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
              <Text className="text-aux text-ink-faint">
                {dateDisplayJa(targetDate)}の記録を編集中
              </Text>
              <Text onPress={() => router.replace('/')} className="text-aux text-ink-faint">
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
