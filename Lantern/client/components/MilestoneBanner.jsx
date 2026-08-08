import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import Text from './Text'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { authFetch } from '../lib/supabase'

// Web版 Home.jsx の節目バナーを移植したもの。
// localStorage を AsyncStorage に置き換えた以外は、判定・キャッシュの方針を変えていない。
// reflection は端末ごとに1回だけ生成し、以降はキャッシュを再利用する。
export default function MilestoneBanner() {
  const [milestone, setMilestone] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const res = await authFetch('/api/milestone')
        if (!res.ok) return
        const data = await res.json()
        if (!data.has_milestone) return

        const { days } = data
        if (await AsyncStorage.getItem(`milestone_seen_${days}`)) return

        const cacheKey = `milestone_reflection_${days}`
        const cached = await AsyncStorage.getItem(cacheKey)
        if (cached) {
          if (!cancelled) setMilestone({ days, reflection: JSON.parse(cached) })
          return
        }

        const rRes = await authFetch(`/api/milestone/reflection?days=${days}`)
        if (!rRes.ok) return
        const rData = await rRes.json()
        if (rData.reflection) {
          await AsyncStorage.setItem(cacheKey, JSON.stringify(rData.reflection))
        }
        if (!cancelled) setMilestone({ days, reflection: rData.reflection })
      } catch (e) {
        // ネットワーク失敗時はバナー非表示のままにする
        console.warn('[Home] 節目の振り返りの取得に失敗', e)
      }
    })()

    return () => { cancelled = true }
  }, [])

  async function handleDismiss() {
    if (milestone) await AsyncStorage.setItem(`milestone_seen_${milestone.days}`, 'true')
    setMilestone(null)
  }

  if (!milestone) return null

  return (
    <View className="bg-forest dark:bg-primary rounded-lg px-4 py-3.5">
      <Pressable
        onPress={() => setOpen((o) => !o)}
        className="flex-row items-center justify-between gap-3"
      >
        <Text className="flex-1 text-body text-cream dark:text-primary-text">
          記録を始めて{milestone.days}日が経ちました。
        </Text>
        <Text className="text-cream/60 text-aux">{open ? '⌃' : '⌄'}</Text>
      </Pressable>

      {open ? (
        <View className="mt-3 gap-3">
          {milestone.reflection ? (
            <View className="bg-white/10 dark:bg-black/20 rounded-lg px-4 py-3.5 gap-2">
              <Text className="text-[10px] text-cream/60 tracking-[2px]">LANTERN</Text>
              <Text className="text-body text-cream dark:text-primary-text leading-relaxed">
                {milestone.reflection.observation}
              </Text>
              <Text className="text-body text-cream/80 dark:text-primary-text/80 italic leading-relaxed">
                {milestone.reflection.question}
              </Text>
            </View>
          ) : null}
          <Pressable onPress={handleDismiss} className="self-end">
            <Text className="text-aux text-cream/60">閉じる</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}
