import { useEffect, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Text from '../components/Text'
import { PatternCard } from '../components/ReviewSection'
import DeepenResult from '../components/DeepenResult'
import Paywall from '../components/Paywall'
import GlassPressable from '../components/GlassPressable'
import { authFetch } from '../lib/supabase'
import { paywallMessage, readMaybePaywall } from '../lib/plan'
import { chooseReading } from '../lib/readingChoiceStore'

// 深掘りの全画面（2026-09-13・作者の指示「全画面にして、閉じたらカードのすぐ下に開く形」）。
//
// ## どの観察を深掘りするか
//
// 振り返りの控え（`lantern-review-${type}`、`ReviewSection` と同じ鍵）から
// 先頭の観察を読む。**文をパラメータで渡さない**——長い文を URL に載せず、
// 画面に出ている観察と必ず同じものを深掘りする。
//
// ## 閉じたらカードの下に残す
//
// 結果を控えの観察に `deepen` として書き足す。`ReviewSection` は戻ってきたときに
// 控えを読み直し、カードのすぐ下に同じ `DeepenResult` を出す。
//
// **一度深掘りしたものは読み直さない。**開くたびに有料の枠を使わせない。
//
// ## 読めなかったと、見つからなかったを分ける
//
// サーバーは読めなかったとき 503 を返す。**失敗を「同じ話が無い」に見せない。**

export default function DeepenScreen() {
  const router = useRouter()
  const { type } = useLocalSearchParams()
  const storageKey = `lantern-review-${type === 'monthly' ? 'monthly' : 'weekly'}`
  const [pattern, setPattern] = useState(null)
  const [restored, setRestored] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [paywall, setPaywall] = useState(null)

  async function run(target) {
    if (!target) return
    setLoading(true)
    setFailed(false)
    setPaywall(null)
    try {
      const res = await authFetch('/api/review/deepen', {
        method: 'POST',
        body: JSON.stringify({ observation: target.observation, question: target.question || null }),
      })
      // **断られたのは失敗ではない。**プランの案内を出す
      const { paidRequired, body } = await readMaybePaywall(res)
      if (paidRequired) {
        setPaywall(paywallMessage(body))
        return
      }
      if (!res.ok || !body) throw new Error(String(res.status))
      setResult(body)

      // 閉じたあとカードの下に残すため、控えに書き足す
      const raw = await AsyncStorage.getItem(storageKey)
      const stored = raw ? JSON.parse(raw) : null
      if (stored?.patterns?.[0]) {
        stored.patterns[0].deepen = body
        await AsyncStorage.setItem(storageKey, JSON.stringify(stored))
      }
    } catch (e) {
      console.warn('[深掘り] 読めなかった', e)
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey)
        const first = raw ? JSON.parse(raw)?.patterns?.[0] : null
        if (cancelled || !first) return
        setPattern(first)
        if (first.deepen) setResult(first.deepen)
        else run(first)
      } catch (e) {
        console.warn('[深掘り] 控えを読めなかった', e)
      } finally {
        if (!cancelled) setRestored(true)
      }
    })()
    return () => { cancelled = true }
  }, [storageKey])

  // 根拠の記録を開く。**無料**——自分の記録への道に料金をかけない
  function openRecord(date) {
    router.navigate({ pathname: '/journal', params: { date } })
  }

  // 見立てを選ぶ（2026-09-22・作者の判断）。**選んだ事実を残すだけ**——
  // 読み直さないので、料金も待ち時間も増えない（`lib/readingChoice.js`）
  const [chosen, setChosen] = useState(null)
  useEffect(() => {
    const mark = pattern?.deepen?.chosen
    setChosen(typeof mark === 'number' ? mark : null)
  }, [pattern])

  async function choose(index, reading) {
    setChosen(index)
    await chooseReading({ storageKey, index, reading, observation: pattern?.observation })
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-5 py-2">
        <Text className="font-strong text-body-md text-on-surface">深掘り</Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="閉じる"
          hitSlop={12}
          className="min-w-touch min-h-touch items-end justify-center"
        >
          <Text className="text-body-md text-outline">閉じる</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 16 }}>
        {pattern ? <PatternCard observation={pattern.observation} question={pattern.question} /> : null}

        {paywall ? (
          <Paywall
            message={paywall}
            onClose={() => router.back()}
            onPurchased={() => { setPaywall(null); run(pattern) }}
          />
        ) : null}

        {loading ? (
          <View className="bg-surface-low/60 rounded-lg px-5 py-5 gap-2.5">
            <Text className="text-label-md text-outline">3か月分の記録を読んでいます...</Text>
            <View className="h-3.5 bg-surface-high rounded-full w-full" />
            <View className="h-3.5 bg-surface-high rounded-full w-4/5" />
          </View>
        ) : null}

        {!loading && failed ? (
          <View className="border border-border border-dashed rounded-lg px-5 py-5 gap-3 items-start">
            <Text className="text-body text-outline leading-relaxed">
              うまく読めませんでした。少し待ってから、もう一度押せます。
            </Text>
            <GlassPressable
              onPress={() => run(pattern)}
              className="rounded-full px-4 py-2 min-h-touch justify-center"
            >
              <Text className="font-strong text-label-md text-on-lantern">もう一度読む</Text>
            </GlassPressable>
          </View>
        ) : null}

        {!loading && result ? (
          <DeepenResult
            result={result}
            onOpenRecord={openRecord}
            chosen={chosen}
            onChoose={choose}
          />
        ) : null}

        {restored && !pattern ? (
          <Text className="text-body text-outline">深掘りする観察がありません。</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}
