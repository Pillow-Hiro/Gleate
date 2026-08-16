import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'
import Text from './Text'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { authFetch } from '../lib/supabase'
import { paywallMessage, readMaybePaywall } from '../lib/plan'
import Paywall from './Paywall'
import { localDateStr } from '../lib/date'

// 頻出キーワード。
//
// Insights AI憲法に従い、**語と出現回数だけ**を出す。
// 感情の分類も、増えた減ったの評価もしない。
//
// **2026-08-14 に期間の選択をやめた。**
// 直近1ヶ月・3ヶ月・半年を並べ、それぞれに取得ボタンを置いていた。
// 3つ並ぶと**見比べる画面**になる。「1ヶ月では出ていた語が半年では無い」は
// 変化の観察に見えて、実際には母数の違いでしかない。
// 期間は3ヶ月ひとつに固定した。
//
// **ボタンもやめた。** 抽出は機械的な頻度処理で、AIを呼んでいない。
// 「Lanternに聞く」という文言は、AIに尋ねているように読めた。
// 開いたら出ている方が、押してから待つより短い。
//
// **語には `#` を付け、押すとその語で絞った一覧へ移る**（2026-08-14）。
// 頻出語を見ても、いつ書いたのかが分からないままだった。
// 行き先は同じ「記録」タブの検索。**専用の画面を作らない。**
// 探した結果を見る場所が2つあると、片方だけ直る。
//
// `#` はタグではない。**この語で分類しているわけではない。**
// 押せることを示す印として付けている（記録にタグは持たせない）。
//
// キャッシュキーに当日の日付を含めることで実質1日TTLとする方式は変えていない。
const PERIOD = '3m'

export default function KeywordSection() {
  const router = useRouter()
  const today = localDateStr()
  const [keywords, setKeywords] = useState(null)
  const [loading, setLoading] = useState(true)
  // 断られたときの一文。**null なら断られていない**
  const [paywall, setPaywall] = useState(null)

  useEffect(() => {
    let cancelled = false
    const cacheKey = `insights_keywords_${PERIOD}_${today}`

    ;(async () => {
      try {
        const cached = await AsyncStorage.getItem(cacheKey)
        if (cached) {
          if (!cancelled) {
            setKeywords(JSON.parse(cached))
            setLoading(false)
          }
          return
        }
      } catch (e) {
        // 壊れたキャッシュは捨てて取得し直す。残すと同じ日付キーで失敗し続ける。
        console.warn('[Insights] キーワードキャッシュの解析に失敗', e)
        try {
          await AsyncStorage.removeItem(cacheKey)
        } catch (removeError) {
          console.warn('[Insights] 壊れたキャッシュの削除に失敗', removeError)
        }
      }

      try {
        const res = await authFetch(`/api/insights/keywords?period=${PERIOD}`)
        // **断られたのは失敗ではない。** プランの案内を出す
        const { paidRequired, body: json } = await readMaybePaywall(res)
        if (paidRequired) {
          if (!cancelled) setPaywall(paywallMessage(json))
          return
        }
        if (!res.ok || !json) {
          console.warn(`[Insights] キーワード取得が ${res.status} を返した`)
          return
        }
        await AsyncStorage.setItem(cacheKey, JSON.stringify(json.keywords))
        if (!cancelled) setKeywords(json.keywords)
      } catch (e) {
        // 画面には何も出さない（AI憲法：必要以上に話さない）。原因追跡のためログだけ残す。
        console.warn('[Insights] キーワード取得に失敗', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [today])

  // 断られている間は本来の中身を出さない。**2つを同時に見せない**
  if (paywall) {
    return <Paywall message={paywall} onClose={() => setPaywall(null)} />
  }

  return (
    <View className="gap-2.5">
      <Text className="font-strong text-label-md text-primary">頻出キーワード</Text>

      {loading ? (
        <View className="flex-row gap-2">
          {[1, 2, 3].map((i) => (
            <View key={i} className="w-16 h-7 bg-surface-high rounded-full" />
          ))}
        </View>
      ) : keywords && keywords.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {keywords.map(({ word, count }) => (
            <Pressable
              key={word}
              onPress={() => router.push(`/journal?q=${encodeURIComponent(word)}`)}
              accessibilityLabel={`${word} を含む記録を見る`}
              className="flex-row items-baseline gap-1.5 bg-surface-low rounded-full px-3 py-2 min-h-touch justify-center active:opacity-70"
            >
              <Text className="text-label-md text-primary">#{word}</Text>
              <Text className="text-label-sm text-outline">{count}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text className="text-body-md text-outline">まだ抽出できる言葉がありません。</Text>
      )}
    </View>
  )
}
