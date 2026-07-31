import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { authFetch } from '../lib/supabase'
import { formatAge } from '../lib/format'

export function PatternCard({ observation, question }) {
  return (
    <View className="bg-sage-light/60 border border-sage/20 rounded-xl px-5 py-4 gap-2.5">
      <Text className="text-sm text-ink leading-relaxed">{observation}</Text>
      <Text className="text-sm text-ink-soft italic leading-relaxed">{question}</Text>
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
    try {
      const res = await authFetch('/api/review/generate', {
        method: 'POST',
        body: JSON.stringify({ type }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
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

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-3">
          <Text className="font-display text-base font-light text-ink">{title}</Text>
          <Text className="text-xs text-ink-faint mt-0.5">{description}</Text>
        </View>
        <Pressable
          onPress={generate}
          disabled={loading}
          className="border border-sage/40 rounded-full px-3.5 py-1.5 disabled:opacity-50"
        >
          <Text className="text-xs text-forest">{loading ? '生成中...' : '振り返る'}</Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="gap-3">
          {[1, 2].map((i) => (
            <View key={i} className="bg-stone/60 rounded-xl px-5 py-4 gap-2.5">
              <View className="h-3.5 bg-parchment rounded w-full" />
              <View className="h-3.5 bg-parchment rounded w-4/5" />
              <View className="h-3 bg-parchment rounded w-2/3" />
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

      {!loading && restored && patterns === null ? (
        <View className="border border-border border-dashed rounded-xl px-5 py-6 items-center">
          <Text className="text-sm text-ink-faint text-center">
            「振り返る」を押すと、Lanternが記録から気づきを届けます
          </Text>
        </View>
      ) : null}

      {!loading && isEmpty ? (
        <View className="border border-border border-dashed rounded-xl px-5 py-6 items-center">
          <Text className="text-sm text-ink-faint text-center">記録が増えると、パターンが見えてきます。</Text>
        </View>
      ) : null}
    </View>
  )
}
