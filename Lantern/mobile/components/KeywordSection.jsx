import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { authFetch } from '../lib/supabase'
import { localDateStr } from '../lib/date'

const KEYWORD_PERIODS = [
  { label: '直近1ヶ月', period: '1m' },
  { label: '直近3ヶ月', period: '3m' },
  { label: '直近半年', period: '6m' },
]

// Web版 Insights.jsx の KeywordSection を移植したもの。
// キャッシュキーに当日の日付を含めることで実質1日TTLとする方式は変更していない。
// Insights AI憲法に従い、感情分類はせず語と出現回数のみを表示する。
export default function KeywordSection() {
  const today = localDateStr()
  const [data, setData] = useState({})
  const [fetching, setFetching] = useState({})

  async function handleFetch(period) {
    const cacheKey = `insights_keywords_${period}_${today}`
    try {
      const cached = await AsyncStorage.getItem(cacheKey)
      if (cached) {
        setData((d) => ({ ...d, [period]: JSON.parse(cached) }))
        return
      }
    } catch {
      // キャッシュが壊れていれば取得し直す
    }

    setFetching((f) => ({ ...f, [period]: true }))
    try {
      const res = await authFetch(`/api/insights/keywords?period=${period}`)
      if (!res.ok) return
      const json = await res.json()
      await AsyncStorage.setItem(cacheKey, JSON.stringify(json.keywords))
      setData((d) => ({ ...d, [period]: json.keywords }))
    } catch {
      // 取得失敗時は何も表示しない
    } finally {
      setFetching((f) => ({ ...f, [period]: false }))
    }
  }

  return (
    <View className="gap-5">
      <Text className="text-[10px] text-ink-faint tracking-[2px]">キーワード</Text>

      {KEYWORD_PERIODS.map(({ label, period }) => (
        <View key={period} className="gap-2.5">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-ink-soft">{label}</Text>
            <Pressable
              onPress={() => handleFetch(period)}
              disabled={fetching[period]}
              className="border border-sage/40 rounded-full px-3.5 py-1 disabled:opacity-50"
            >
              <Text className="text-xs text-forest">
                {fetching[period] ? '取得中...' : data[period] ? '再取得' : 'Lanternに聞く'}
              </Text>
            </Pressable>
          </View>

          {data[period] ? (
            <View className="flex-row flex-wrap gap-2">
              {data[period].length === 0 ? (
                <Text className="text-sm text-ink-faint">
                  この期間のキーワードを抽出できませんでした。
                </Text>
              ) : (
                data[period].map(({ word, count }) => (
                  <View
                    key={word}
                    className="flex-row items-baseline gap-1.5 bg-stone/60 rounded-full px-3 py-1"
                  >
                    <Text className="text-xs text-ink-soft">{word}</Text>
                    <Text className="text-[10px] text-ink-faint">{count}</Text>
                  </View>
                ))
              )}
            </View>
          ) : null}
        </View>
      ))}
    </View>
  )
}
