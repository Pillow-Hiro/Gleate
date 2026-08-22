import { useCallback, useEffect, useState } from 'react'
import { ScrollView, View } from 'react-native'
import Text from '../../components/Text'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BOTTOM_GAP, useTabBarInset } from '../../lib/tabBar'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { authFetch } from '../../lib/supabase'
import { todayStr, calcStreak } from '../../lib/date'
import AppHeader from '../../components/AppHeader'
import RecordForm from '../../components/RecordForm'
import WriteTabs from '../../components/WriteTabs'
import { TOOLBAR_HEIGHT } from '../../components/EditorToolbar'
import { useKeyboardHeight } from '../../lib/keyboard'
import { keyboardHeadroom } from '../../lib/keyboardMath'

// キーボードが出ているとき、下に余分に空ける高さ。
//
// **装飾の列（52px）だけでは足りなかった**（2026-08-20）。
// `automaticallyAdjustKeyboardInsets` は焦点の当たった欄の
// **下端**をキーボードのすぐ上に合わせる。欄が2〜3行あると、
// 書いている行が画面のいちばん下に貼り付いて読みにくい。
//
// 1行ぶん（32px）＋余白を足して、書いている場所が
// キーボードから離れるようにする。
const KEYBOARD_GAP = TOOLBAR_HEIGHT + 96
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
  // キーボードに隠れないよう、出ている高さを測る
  const keyboardHeight = useKeyboardHeight()
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
      <AppHeader />
      {/* **キーボードのぶんだけ下を空ける**（2026-08-17）。
          それまで避けが1つも無く、「よかったこと」「困ったこと」を開くと
          欄がキーボードの下に入って見えなかった。

          `automaticallyAdjustKeyboardInsets` は iOS が
          キーボードのぶんを自分で空け、焦点の当たった欄まで送ってくれる。
          **ただし装飾の列は知らない**ので、その高さだけこちらで足す
          （`lib/keyboardMath.js`）。 */}
      <ScrollView
        contentContainerClassName="px-5 pt-6 gap-8 w-full max-w-read self-center"
        contentContainerStyle={{
          paddingBottom:
            tabInset + BOTTOM_GAP + (keyboardHeight > 0 ? KEYBOARD_GAP : 0),
        }}
        automaticallyAdjustKeyboardInsets
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
            形と動きの由来は `components/WriteTabs.jsx` に書いてある。 */}
        {!isEditingPast ? <WriteTabs value={writeTab} onChange={setWriteTab} /> : null}

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
