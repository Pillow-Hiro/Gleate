import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import Text from './Text'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { authFetch } from '../lib/supabase'
import { paywallMessage, readMaybePaywall } from '../lib/plan'
import Paywall from './Paywall'
import { formatAge } from '../lib/format'

export function PatternCard({ observation, question }) {
  return (
    <View className="bg-sage-light/60 border border-sage/20 rounded-lg px-5 py-4 gap-2.5">
      <Text className="text-body text-ink leading-relaxed">{observation}</Text>
      <Text className="text-body text-ink-soft italic leading-relaxed">{question}</Text>
    </View>
  )
}

// Web版 Journal.jsx の ReviewSection を移植したもの。
// localStorage は同期的に初期値を読めたが AsyncStorage は非同期なので、
// 初期値は null 固定にして useEffect で復元する。
export default function ReviewSection({ title, type, description }) {
  const storageKey = `lantern-review-${type}`
  const [patterns, setPatterns] = useState(null)
  const [generatedAt, setGeneratedAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [restored, setRestored] = useState(false)
  // 断られたときの一文。**null なら断られていない**
  const [paywall, setPaywall] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey)
        if (raw && !cancelled) {
          const stored = JSON.parse(raw)
          setPatterns(stored?.patterns ?? null)
          setGeneratedAt(stored?.generatedAt || '')
        }
      } catch (e) {
        // キャッシュが壊れていても初期状態として扱う
        console.warn('[Review] 振り返りキャッシュの読み込みに失敗', e)
      } finally {
        if (!cancelled) setRestored(true)
      }
    })()
    return () => { cancelled = true }
  }, [storageKey])

  async function generate() {
    setLoading(true)
    setPatterns([])
    setPaywall(null)
    try {
      const res = await authFetch('/api/review/generate', {
        method: 'POST',
        body: JSON.stringify({ type }),
      })
      // **断られたのは失敗ではない。** プランの案内を出す
      const { paidRequired, body: data } = await readMaybePaywall(res)
      if (paidRequired) {
        setPaywall(paywallMessage(data))
        return
      }
      if (!res.ok || !data) throw new Error()
      const now = new Date().toISOString()
      const newPatterns = data.patterns || []
      setPatterns(newPatterns)
      setGeneratedAt(now)
      await AsyncStorage.setItem(storageKey, JSON.stringify({ patterns: newPatterns, generatedAt: now }))
    } catch (e) {
      console.warn(`[Review] ${type} の生成に失敗`, e)
      setPatterns([])
    } finally {
      setLoading(false)
    }
  }

  const hasPatterns = patterns !== null && patterns.length > 0
  const isEmpty = patterns !== null && patterns.length === 0

  // 断られている間は本来の中身を出さない。**2つを同時に見せない**
  if (paywall) {
    return (
      <View className="gap-3">
        <Paywall
          message={paywall}
          onClose={() => setPaywall(null)}
          onPurchased={() => { setPaywall(null); generate() }}
        />
      </View>
    )
  }

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-3">
          <Text className="font-display text-body-lg text-ink">{title}</Text>
          <Text className="text-aux text-ink-faint mt-0.5">{description}</Text>
        </View>
        <Pressable
          onPress={generate}
          disabled={loading}
          className="border border-sage/40 rounded-full px-3.5 py-1.5 disabled:opacity-50"
        >
          <Text className="text-aux text-forest">{loading ? '読んでいます...' : '振り返る'}</Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="gap-3">
          {[1, 2].map((i) => (
            <View key={i} className="bg-stone/60 rounded-lg px-5 py-4 gap-2.5">
              <View className="h-3.5 bg-parchment rounded-full w-full" />
              <View className="h-3.5 bg-parchment rounded-full w-4/5" />
              <View className="h-3 bg-parchment rounded-full w-2/3" />
            </View>
          ))}
        </View>
      ) : null}

      {!loading && hasPatterns ? (
        <View className="gap-3">
          {generatedAt ? <Text className="text-[10px] text-ink-faint">{formatAge(generatedAt)}</Text> : null}
          {patterns.map((p, i) => (
            <PatternCard key={i} observation={p.observation} question={p.question} />
          ))}
        </View>
      ) : null}

      {/* **「気づきを届けます」と言わない**（2026-08-18）。
          気づきは利用者のもので、Lantern が届けるのは並べ直した記録まで。
          AI憲法の中核原則は「①並べる ②差分を出す」までを AI の仕事とし、
          **③意味づけはユーザーだけが行う**と定めている。
          プロンプト側は「観察」で通っていたのに、
          ボタンの説明だけが③に踏み込んでいた。 */}
      {!loading && restored && patterns === null ? (
        <View className="border border-border border-dashed rounded-lg px-5 py-6 items-center">
          <Text className="text-body text-ink-faint text-center">
            「振り返る」を押すと、Lanternが記録を並べます。
          </Text>
        </View>
      ) : null}

      {/* **未来を約束しない**（2026-08-18）。
          「記録が増えると、パターンが見えてきます。」と書いていた。
          禁止ワードの「きっと〇〇できます」と同じ形で、
          **空の画面が「もっと書け」と押していた。**
          いま無いという事実だけを言う。 */}
      {!loading && isEmpty ? (
        <View className="border border-border border-dashed rounded-lg px-5 py-6 items-center">
          <Text className="text-body text-ink-faint text-center">まだ並べられるほどの記録がありません。</Text>
        </View>
      ) : null}
    </View>
  )
}
