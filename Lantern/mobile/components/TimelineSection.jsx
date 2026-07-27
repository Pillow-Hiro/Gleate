import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { authFetch } from '../lib/supabase'
import { PatternCard } from './ReviewSection'

const MONTHS_OPTIONS = [1, 3, 6]

function formatPastDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${y}年${m}月${d}日`
}

// Web版 Journal.jsx の TimelineSection（過去との対話）を移植したもの。
// 期間を切り替えたら結果をリセットする挙動も維持している。
export default function TimelineSection() {
  const [months, setMonths] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { setData(null) }, [months])

  async function handleReflect() {
    setLoading(true)
    try {
      const res = await authFetch(`/api/timeline-reflection?months_ago=${months}`)
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      setData(null)
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

      <View className="flex-row gap-1 border-b border-border">
        {MONTHS_OPTIONS.map((m) => (
          <Pressable
            key={m}
            onPress={() => setMonths(m)}
            className={`px-3 py-1.5 border-b-2 ${months === m ? 'border-accent' : 'border-transparent'}`}
          >
            <Text className={`text-xs ${months === m ? 'text-accent' : 'text-ink-faint'}`}>{m}ヶ月前</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View className="bg-stone/60 rounded-xl px-5 py-4 gap-2.5">
          <View className="h-3.5 bg-parchment rounded w-3/4" />
          <View className="h-3 bg-parchment rounded w-1/2" />
        </View>
      ) : null}

      {!loading && data === null ? (
        <View className="border border-border border-dashed rounded-xl px-5 py-6 items-center">
          <Text className="text-sm text-ink-faint text-center">
            「振り返る」を押すと、{months}ヶ月前の記録と今を照らし合わせます
          </Text>
        </View>
      ) : null}

      {!loading && data !== null && data.past_logs.length === 0 ? (
        <View className="border border-border border-dashed rounded-xl px-5 py-6 items-center">
          <Text className="text-sm text-ink-faint text-center">{months}ヶ月前の記録はありません。</Text>
        </View>
      ) : null}

      {!loading && data !== null && data.past_logs.length > 0 ? (
        <View className="gap-3">
          <Text className="text-[10px] text-ink-faint">{formatPastDate(data.past_date)}の週</Text>
          <View className="gap-2">
            {data.past_logs.map((log, i) => (
              <View key={i} className="bg-stone/40 rounded-lg px-4 py-3 gap-1">
                <Text className="text-[10px] text-ink-faint">{log.date}</Text>
                <Text className="text-sm text-ink leading-relaxed">{log.created || '（記録あり）'}</Text>
                {log.enjoyable ? (
                  <Text className="text-xs text-ink-soft">よかったこと：{log.enjoyable}</Text>
                ) : null}
                {log.struggled ? (
                  <Text className="text-xs text-ink-soft">詰まったこと：{log.struggled}</Text>
                ) : null}
              </View>
            ))}
          </View>

          {data.reflection ? (
            <PatternCard
              observation={data.reflection.observation}
              question={data.reflection.question}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  )
}
