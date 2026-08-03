import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { authFetch } from '../lib/supabase'
import { localDateStr, monthsAgoStr, findNearestLog } from '../lib/date'
import { PatternCard } from './ReviewSection'
import LogSnapshot from './LogSnapshot'

// 過去との対話。Web版 components/TimelineSection.jsx と同じ仕様。
// 常時は「その頃の記録」と「今日の記録」を並べるだけ（事実の提示）。
// 「振り返る」を押したときだけAIの観察と問いが加わる。
// Insights AI憲法の①記録を並べる ②差分を提示する までで止め、③意味づけはしない。
const PERIODS = [
  { label: '1ヶ月前', months: 1 },
  { label: '3ヶ月前', months: 3 },
  { label: '半年前', months: 6 },
  { label: '1年前', months: 12 },
]

// AIの観察の出典表示用。曜日は不要なので lib/format.js の dateDisplayJa は使わない。
function formatPastDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${y}年${m}月${d}日`
}

export default function TimelineSection({ logs = [] }) {
  const [months, setMonths] = useState(1)
  // AIの観察はどの期間に対するものかを一緒に持つ。
  // 期間を切り替えたら別期間の観察は表示しない（事実とずれるため）。
  // useEffect で消すのではなく描画時に導出することで、余分な再レンダリングを避ける。
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const data = result?.months === months ? result.data : null

  const today = localDateStr()
  const todayLog = logs.find((l) => l.date === today) || null
  const target = monthsAgoStr(months)
  const pastLog = findNearestLog(logs, target)
  const currentLabel = PERIODS.find((p) => p.months === months)?.label

  async function handleReflect() {
    setLoading(true)
    try {
      const res = await authFetch(`/api/timeline-reflection?months_ago=${months}`)
      if (!res.ok) throw new Error(`timeline-reflection returned ${res.status}`)
      setResult({ months, data: await res.json() })
    } catch (e) {
      console.warn('[Timeline] 過去との対話の取得に失敗', e)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-3">
          <Text className="font-display text-base font-light text-ink">過去との対話</Text>
          <Text className="text-xs text-ink-faint mt-0.5">あの頃の自分と、今の自分。</Text>
        </View>
        <Pressable
          onPress={handleReflect}
          disabled={loading}
          className="border border-sage/40 rounded-full px-3.5 py-1.5 disabled:opacity-50"
        >
          <Text className="text-xs text-forest">{loading ? '観察中...' : '振り返る'}</Text>
        </Pressable>
      </View>

      {/* 期間タブ */}
      <View className="flex-row gap-1 border-b border-border">
        {PERIODS.map(({ label, months: m }) => (
          <Pressable
            key={m}
            onPress={() => setMonths(m)}
            className={`px-3 py-1.5 border-b-2 ${months === m ? 'border-accent' : 'border-transparent'}`}
          >
            <Text className={`text-xs ${months === m ? 'text-accent' : 'text-ink-faint'}`}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {/* 常時表示：その頃の記録と今日の記録を並べる */}
      <View className="gap-3">
        <LogSnapshot log={pastLog} dateHint={target} isToday={false} />
        <LogSnapshot log={todayLog} dateHint={today} isToday={true} />
      </View>

      {/* AIの観察 */}
      {loading ? (
        <View className="bg-stone/60 rounded-xl px-5 py-4 gap-2.5">
          <View className="h-3.5 bg-parchment rounded w-3/4" />
          <View className="h-3 bg-parchment rounded w-1/2" />
        </View>
      ) : null}

      {!loading && data !== null && data.past_logs.length === 0 ? (
        <View className="border border-border border-dashed rounded-xl px-5 py-6 items-center">
          <Text className="text-sm text-ink-faint text-center">{currentLabel}の記録はありません。</Text>
        </View>
      ) : null}

      {!loading && data?.reflection ? (
        <View className="gap-1.5">
          {/* 上に並べているのは最も近い1件だが、AIは past_date を含む週の全記録を
              根拠に観察している。画面にない記録に言及しうるため出典を明示する。
              事実の提示のみで、評価や意味づけは含めない。 */}
          {data.past_date ? (
            <Text className="text-[10px] text-ink-faint">
              {formatPastDate(data.past_date)}を含む週の記録から
            </Text>
          ) : null}
          <PatternCard
            observation={data.reflection.observation}
            question={data.reflection.question}
          />
        </View>
      ) : null}
    </View>
  )
}
