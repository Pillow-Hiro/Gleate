import { useCallback, useEffect, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import Text from '../../components/Text'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { BOTTOM_GAP, useTabBarInset } from '../../lib/tabBar'
import { authFetch } from '../../lib/supabase'
import LogList from '../../components/LogList'

// **直近の記録を眺める場所（2026-08-12 に新設）。**
//
// 「記録」との違いは、探すか眺めるか。
// ここは検索もカレンダーも持たない。**開いて上から下へ読むだけ。**
//
// **記録が少ないうちは「記録」と似て見える。** 18件の現在はほぼ同じものが
// 並ぶ。分かれるのは記録が増えてから。承知のうえで置いている。
//
// **上に今日の灯りを置く。**
// デザイン案の Home は「小さなラベル＋大きな一行」で始まる。
// Lantern でそこに当たるのは今日の灯り。
// 2026-08-12 に実機で「今日の灯りカードがない」と指摘された。
//
// **「書く」からは外した。** 同じものを2画面に置くと、
// どちらが本体なのか分からなくなる。
//
// 時間帯の挨拶（Good Evening）は入れない。
// 時間帯で言葉を変えると、評価や勧誘に寄りやすい。
const RECENT_LIMIT = 12

export default function Home() {
  const tabInset = useTabBarInset()
  const router = useRouter()
  const [logs, setLogs] = useState([])
  const [quote, setQuote] = useState('')
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

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
          const data = await logsRes.json()
          if (!cancelled) setLogs(data)
        }
        if (quoteRes.ok) {
          const q = await quoteRes.json()
          if (!cancelled) setQuote(q.quote || '')
        }
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
        {/* 今日の灯り。**囲まない。** 左に2pxの線だけ引く。
            いちばん静かに置きたい一文が、いちばん目立つ箱になっていた */}
        <View>
          <Text className="font-strong text-label-md text-primary mb-2.5">今日の灯り</Text>
          <View className="border-l-2 border-lantern-glow pl-4 py-1 min-h-[64px] justify-center">
            {loading ? (
              <View className="w-40 h-4 bg-surface-high rounded-full" />
            ) : (
              <Text className="text-body-lg text-ink">
                {quote || '今日の記録が、ここに残る。'}
              </Text>
            )}
          </View>
        </View>

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

        {/* デザイン案の「Older entries」。
            12件より前は「記録」で探す。ここに「もっと見る」を置いて
            延々と伸ばすと、探すための画面と役割が重なる。 */}
        {!loading && logs.length > RECENT_LIMIT ? (
          <Pressable
            onPress={() => router.navigate('/journal')}
            className="self-center border border-border rounded-full px-4 min-h-touch justify-center active:opacity-70"
          >
            <Text className="text-label-md text-primary">これより前の記録</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}
