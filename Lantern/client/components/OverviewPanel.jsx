import { useCallback, useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import Text from './Text'
import { authFetch } from '../lib/supabase'
import { PLATFORMS, emptyState, formatCount } from '../lib/platforms'

// つないでいる場所を**横に並べて見る画面**（2026-08-16）。
//
// それまでは YouTube と Twitch が別々のタブにあり、
// 見比べるにはタブを往復するしかなかった。
//
// ## ここで何をしないか
//
// - **AIの観察を出さない。** 有料の機能なので、無料の人には
//   ペイウォールしか映らない画面になる。観察は各タブに置いたままにする
// - **合計を出さない。** 登録者とフォロワーを足した数には意味がない。
//   場所ごとに別のものを数えている
// - **増減率を出さない。** 「+12%」は評価そのもの
//   （`REQUIREMENTS.md`「やらないこと」）
//
// ## 足すとき
//
// `lib/platforms.js` の配列に1つ足すだけ。この画面は触らない。

function Stat({ label, value }) {
  return (
    <View className="flex-1">
      <Text className="text-label-sm text-outline mb-1">{label}</Text>
      <Text className="font-strong text-headline-md text-on-surface">{formatCount(value)}</Text>
    </View>
  )
}

function PlatformCard({ state, onOpen }) {
  const { label, loading, connected, name, stats, failed } = state

  return (
    <Pressable
      onPress={() => onOpen(state.id)}
      className="bg-surface-lowest rounded-lg px-4 py-4 shadow-bloom active:opacity-70"
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1 pr-3">
          <Text className="font-strong text-body-md text-on-surface">{label}</Text>
          {name ? (
            <Text className="text-label-md text-outline mt-0.5" numberOfLines={1}>
              {name}
            </Text>
          ) : null}
        </View>
        <Text className="text-label-md text-outline">›</Text>
      </View>

      {/* 4つの状態を混ぜない。取得中・失敗・未連携・連携済みは別物 */}
      {loading ? (
        <View className="h-10 bg-surface-low rounded" />
      ) : failed ? (
        <Text className="text-label-md text-outline">
          いまは数字を取れませんでした。
        </Text>
      ) : !connected ? (
        <Text className="text-label-md text-outline">
          つないでいません。押すと連携できます。
        </Text>
      ) : (
        <View className="flex-row gap-3">
          {stats.map((s) => (
            <Stat key={s.label} label={s.label} value={s.value} />
          ))}
        </View>
      )}
    </Pressable>
  )
}

export default function OverviewPanel({ onOpen }) {
  const [states, setStates] = useState(() => PLATFORMS.map(emptyState))

  const load = useCallback(async () => {
    // **場所ごとに独立して取る。** 1つが落ちても他は出す。
    // まとめて await すると、Twitch の失敗で YouTube の数字まで消える
    const next = await Promise.all(
      PLATFORMS.map(async (p) => {
        const base = { ...emptyState(p), loading: false }
        try {
          const statusRes = await authFetch(p.statusPath)
          if (!statusRes.ok) return { ...base, failed: true }
          const status = await statusRes.json()
          if (!status.connected) {
            return { ...base, connected: false, name: p.nameOf(status) }
          }

          // 連携している場所だけ数字を取りに行く。
          // 未連携でも叩くと、外部APIを無駄に1往復する
          const sumRes = await authFetch(p.summaryPath)
          if (!sumRes.ok) {
            // つながってはいる。数字だけ取れなかった
            return { ...base, connected: true, name: p.nameOf(status), failed: true }
          }
          const summary = await sumRes.json()
          return {
            ...base,
            connected: true,
            name: p.nameOf(summary) || p.nameOf(status),
            stats: p.statsOf(summary),
          }
        } catch (e) {
          console.warn(`[まとめ] ${p.label} の取得に失敗`, e)
          return { ...base, failed: true }
        }
      })
    )
    setStates(next)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const before = PLATFORMS.map(emptyState)
      if (!cancelled) setStates(before)
      await load()
    })()
    return () => { cancelled = true }
  }, [load])

  return (
    <View className="gap-3">
      {states.map((s) => (
        <PlatformCard key={s.id} state={s} onOpen={onOpen} />
      ))}

      {/* **これから増える場所の席を空けておく。**
          いま2つしかないことを、足りないのではなく
          「まだつないでいない」として見せる */}
      <Text className="text-label-md text-outline leading-relaxed px-1">
        ほかの場所は、つなげるようになったらここに並びます。
      </Text>
    </View>
  )
}
