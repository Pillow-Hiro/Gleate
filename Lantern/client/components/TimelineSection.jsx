import { useState } from 'react'
import { Pressable, View } from 'react-native'
import Text from './Text'
import UnderlineTabs from './UnderlineTabs'
import { authFetch } from '../lib/supabase'
import { paywallMessage, readMaybePaywall } from '../lib/plan'
import Paywall from './Paywall'
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
  // 断られたときの一文。**null なら断られていない**
  const [paywall, setPaywall] = useState(null)

  const data = result?.months === months ? result.data : null

  const today = localDateStr()
  const todayLog = logs.find((l) => l.date === today) || null
  const target = monthsAgoStr(months)
  const pastLog = findNearestLog(logs, target)
  const currentLabel = PERIODS.find((p) => p.months === months)?.label

  async function handleReflect() {
    setLoading(true)
    setPaywall(null)
    try {
      const res = await authFetch(`/api/timeline-reflection?months_ago=${months}`)
      // **断られたのは失敗ではない。** プランの案内を出す
      const { paidRequired, body } = await readMaybePaywall(res)
      if (paidRequired) {
        setPaywall(paywallMessage(body))
        return
      }
      if (!res.ok || !body) throw new Error(`timeline-reflection returned ${res.status}`)
      setResult({ months, data: body })
    } catch (e) {
      console.warn('[Timeline] 過去との対話の取得に失敗', e)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  // 断られている間は本来の中身を出さない。**2つを同時に見せない**
  if (paywall) {
    return (
      <Paywall
        message={paywall}
        onClose={() => setPaywall(null)}
        onPurchased={() => { setPaywall(null); handleReflect() }}
      />
    )
  }

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-3">
          <Text className="font-display text-body-lg text-on-surface">過去との対話</Text>
          <Text className="text-aux text-outline mt-0.5">あの頃の自分と、今の自分。</Text>
        </View>
        <Pressable
          onPress={handleReflect}
          disabled={loading}
          className="border border-ai-ink/40 rounded-full px-3.5 py-1.5 disabled:opacity-50"
        >
          <Text className="text-aux text-primary">{loading ? '読んでいます...' : '振り返る'}</Text>
        </Pressable>
      </View>

      {/* 期間タブ */}
      <UnderlineTabs
        tabs={PERIODS.map(({ label, months: m }) => ({ id: m, label }))}
        value={months}
        onChange={setMonths}
        itemClassName="px-3 py-1.5"
        textClassName="text-aux"
        gapClassName="gap-1"
      />

      {/* 常時表示：その頃の記録と今日の記録を並べる */}
      <View className="gap-3">
        <LogSnapshot log={pastLog} dateHint={target} isToday={false} />
        <LogSnapshot log={todayLog} dateHint={today} isToday={true} />
      </View>

      {/* AIの観察 */}
      {loading ? (
        <View className="bg-surface-low/60 rounded-lg px-5 py-4 gap-2.5">
          <View className="h-3.5 bg-surface-high rounded-full w-3/4" />
          <View className="h-3 bg-surface-high rounded-full w-1/2" />
        </View>
      ) : null}

      {!loading && data !== null && data.past_logs.length === 0 ? (
        <View className="border border-border border-dashed rounded-lg px-5 py-6 items-center">
          <Text className="text-body text-outline text-center">{currentLabel}の記録はありません。</Text>
        </View>
      ) : null}

      {!loading && data?.reflection ? (
        <View className="gap-1.5">
          {/* 上に並べているのは最も近い1件だが、AIは past_date を含む週の全記録を
              根拠に観察している。画面にない記録に言及しうるため出典を明示する。
              事実の提示のみで、評価や意味づけは含めない。 */}
          {data.past_date ? (
            <Text className="text-[10px] text-outline">
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
