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
import IdeasPanel from '../../components/IdeasPanel'

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
  const [question, setQuestion] = useState('')
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshTick, setRefreshTick] = useState(0)
  // アイデアは 2026-08-08 に「記録」から移した。
  // 思いついた瞬間に置くものなので、書く場所にある方が自然。
  // 「記録」は残したものを見る場所であって、置く場所ではなかった。
  const [writeTab, setWriteTab] = useState('record')

  const now = new Date()
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
        const [logsRes, questionRes] = await Promise.all([
          authFetch('/api/logs'),
          authFetch('/api/question'),
        ])
        if (logsRes.ok) {
          const logsData = await logsRes.json()
          if (!cancelled) setLogs(logsData)
        }
        if (questionRes.ok) {
          const questionData = await questionRes.json()
          if (!cancelled) setQuestion(questionData.question || '')
        }
      } catch (e) {
        // 取得できなければ空のまま表示する
        console.warn('[書く] 記録・問いの取得に失敗', e)
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
        contentContainerClassName="px-5 pt-6 gap-8 w-full max-w-read self-center"
        contentContainerStyle={{ paddingBottom: tabInset + BOTTOM_GAP }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* 日付ヘッダー。
            2026-08-09 まで「8 AUG」を上に重ねていた。
            すぐ下に「2026年8月8日 土曜日」があるので、**同じことを
            2回書いていた**。英字を上に置くと様になって見えるが、
            読む人に何も足していない。 */}
        <View>
          <View className="flex-row items-baseline">
            <Text className="font-display text-headline-md text-ink">{dateJa}</Text>
            {streak >= 2 ? (
              <Text className="text-label-md text-outline ml-2">· {streak}日目</Text>
            ) : null}
          </View>
        </View>

        <MilestoneBanner />

        {/* 記録とアイデアの切り替え。
            今日の灯りは 2026-08-12 に「ホーム」へ移した。ここには無い。
            過去日の編集中は出さない（アイデアは日付を持たないため）。

            **2026-08-14 に下線タブから左右2つの区画に変えた。**
            実機で「どっちを書いているか迷う」と指摘された。
            原因は2つあった。

            1. 「記録」の下線タブが**「記録」タブの中のタブと同じ形**をしていた
            2. **どちらが何なのかがどこにも書いていない**

            形を変え、選んでいる側に説明を1行付けた。
            説明は選択で入れ替わるので、いま何を書いているかが
            画面の言葉として残る。 */}
        {!isEditingPast ? (
          <View className="gap-2.5">
            <View className="flex-row bg-surface-low rounded-full p-1">
              {[
                { id: 'record', label: '記録' },
                { id: 'ideas', label: 'アイデア' },
              ].map(({ id, label }) => (
                <Pressable
                  key={id}
                  onPress={() => setWriteTab(id)}
                  className={`flex-1 rounded-full py-2.5 min-h-touch justify-center items-center ${
                    writeTab === id ? 'bg-lantern-glow' : ''
                  }`}
                >
                  <Text
                    className={`text-body-md ${
                      writeTab === id ? 'font-strong text-on-lantern' : 'text-on-surface-variant'
                    }`}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text className="text-label-md text-outline leading-relaxed">
              {writeTab === 'record'
                ? '今日あったことを残します。1日にひとつ、あとから書き直せます。'
                : '思いついたことを1行で置きます。日付を持たず、いつでも使えます。'}
            </Text>
          </View>
        ) : null}

        {/* 記録フォーム */}
        <View style={writeTab === 'record' || isEditingPast ? undefined : { display: 'none' }}>
          {isEditingPast ? (
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-label-md text-outline">
                {dateDisplayJa(targetDate)}の記録を編集中
              </Text>
              <Text onPress={() => router.replace('/')} className="text-label-md text-primary">
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

      </ScrollView>
    </SafeAreaView>
  )
}
