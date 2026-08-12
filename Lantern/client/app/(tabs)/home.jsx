import { useCallback, useEffect, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import Text from '../../components/Text'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { BOTTOM_GAP, useTabBarInset } from '../../lib/tabBar'
import { authFetch } from '../../lib/supabase'
import LogList from '../../components/LogList'
import WriteFab from '../../components/WriteFab'

// **直近の記録を眺める場所（2026-08-12 に新設）。**
//
// 「記録」との違いは、探すか眺めるか。
// ここは検索もカレンダーも持たない。**開いて上から下へ読むだけ。**
//
// **記録が少ないうちは「記録」と似て見える。** 18件の現在はほぼ同じものが
// 並ぶ。分かれるのは記録が増えてから。承知のうえで置いている。
//
// 挨拶（Good Evening）はデザイン案にあるが入れていない。
// 時間帯で言葉を変えると、評価や勧誘に寄りやすい。
const RECENT_LIMIT = 12

export default function Home() {
  const tabInset = useTabBarInset()
  const router = useRouter()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await authFetch('/api/logs')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!cancelled) setLogs(data)
      } catch (e) {
        console.warn('[Home] 記録の取得に失敗', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [tick])

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <ScrollView
        contentContainerClassName="px-5 pt-6 gap-6 w-full max-w-read self-center"
        contentContainerStyle={{ paddingBottom: tabInset + BOTTOM_GAP }}
      >
        <Text className="font-display text-headline-md text-ink">ホーム</Text>

        {loading ? (
          <View className="gap-3">
            {[1, 2, 3].map((i) => (
              <View key={i} className="h-16 bg-stone rounded-lg" />
            ))}
          </View>
        ) : logs.length === 0 ? (
          <View className="items-center py-16">
            <Text className="text-3xl mb-4 opacity-40 text-ink">◇</Text>
            <Text className="text-body-md text-on-surface-variant">まだ記録がありません</Text>
            <Text className="text-label-md text-outline mt-1.5">「書く」から残せます</Text>
          </View>
        ) : (
          <LogList logs={logs} limit={RECENT_LIMIT} onDelete={refresh} onUpdate={refresh} />
        )}

        {/* 12件より前は「記録」で探す。ここに「もっと見る」を置いて
            延々と伸ばすと、探すための画面と役割が重なる。 */}
        {!loading && logs.length > RECENT_LIMIT ? (
          <Pressable onPress={() => router.push('/journal')} className="items-center pt-2">
            <Text className="text-label-md text-primary">これより前は「記録」から</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <WriteFab />
    </SafeAreaView>
  )
}
