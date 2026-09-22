import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import Text from './Text'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { authFetch } from '../lib/supabase'
import { PatternCard } from './ReviewSection'

// Web版 Home.jsx の節目バナーを移植したもの。
// localStorage を AsyncStorage に置き換えた以外は、判定・キャッシュの方針を変えていない。
// reflection は端末ごとに1回だけ生成し、以降はキャッシュを再利用する。
//
// ## 中身を観察から問いに替えた（2026-09-22・作者「節目の文章も直して」）
//
// サーバーは `{question, hint}` を返す（`modules/ai.py` の `generate_milestone_reflection`）。
// **控えの名前を替えた。**前の名前（`milestone_reflection_*`）には、項目名を主語にし、
// 言い換えを「」に入れた古い文が残っている。名前を替えれば、節目のうちに開いた人は
// 新しい問いを受け取り直す。
//
// 作れなかったとき（`reflection` が null）は控えない。次に開いたときにまた頼む。
const cacheKeyFor = (days) => `milestone_question_${days}`
const OLD_CACHE_KEY = (days) => `milestone_reflection_${days}`

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

        const cacheKey = cacheKeyFor(days)
        AsyncStorage.removeItem(OLD_CACHE_KEY(days)).catch(() => {})
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

  const { days, reflection } = milestone
  const heading = (
    <Text className="flex-1 text-body text-on-surface">記録を始めて{days}日が経ちました。</Text>
  )
  const dismiss = (
    <Pressable onPress={handleDismiss} hitSlop={10} className="self-end">
      <Text className="text-aux text-outline">閉じる</Text>
    </Pressable>
  )

  // ## 琥珀の一色塗りをやめた（2026-09-22・作者「色も直そう」）
  //
  // 押せるものと Gleate の言葉の琥珀は 2026-09-11 に硝子と砂色へ直したが、
  // ここだけ残っていた。**ほかのカードと同じ紙に置き、Gleate の言葉だけを
  // 振り返りと同じ砂色の面に出す**（`ReviewSection` の `PatternCard` をそのまま使う
  // ——2つ持つと片方だけ直る）。
  //
  // 見出しの「LANTERN」は改名（2026-09-10）の取りこぼし。面の色で Gleate の
  // 言葉だと分かるので、見出しは置かない（振り返りのカードと同じ）。
  //
  // 問いが無いとき（作れなかった）は、開いても何も無いので、開く印を出さない。
  if (!reflection) {
    return (
      <View className="bg-surface-lowest border border-border rounded-lg px-4 py-3.5 flex-row items-center gap-3">
        {heading}
        {dismiss}
      </View>
    )
  }
  return (
    <View className="bg-surface-lowest border border-border rounded-lg px-4 py-3.5">
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityLabel={open ? '節目の問いをたたむ' : '節目の問いを開く'}
        className="flex-row items-center justify-between gap-3"
      >
        {heading}
        <Text className="text-outline text-aux">{open ? '⌃' : '⌄'}</Text>
      </Pressable>

      {open ? (
        <View className="mt-3 gap-3">
          {/* 主役は問い。**問いを本文に、手がかりを余白の線に置く**
              （`PatternCard` の本文と、その下の線） */}
          <PatternCard observation={reflection.question} question={reflection.hint} />
          {dismiss}
        </View>
      ) : null}
    </View>
  )
}
