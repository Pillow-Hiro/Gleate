import { useEffect, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Text from '../components/Text'
import Paywall from '../components/Paywall'
import { authFetch } from '../lib/supabase'
import { isAvailable as canPurchase, restore } from '../lib/purchases'

// プラン。**設定から1枚めくったところ**（`account.jsx` と同じ作り）。
//
// ## なぜ別画面なのか
//
// 2026-08-24 まで、購入できる場所は**断られた画面だけ**だった。
// 「設定は道具の手入れをする場所で、売る場所ではない」という考えで、
// それ自体は筋が通っていた。**だが探す人の動線と合っていなかった。**
// Apple の審査（iPad Air M3）が購入の場所を見つけられず、
// Guideline 2.1(b) で差し戻された。買おうと思った人も同じで、
// 断られるまで待たないと行き先が無い。
//
// 最初は設定に「プランを見る」という行を足したが、**プランの行が
// 2つに割れた。**「現在のプラン」と「プランを見る」が縦に並ぶと、
// どちらを押せばよいのかを読んで決めることになる。
//
// **「現在のプラン」自体を入口にした。** 状態を見せる行と、
// 詳しく見る行を分けない。いま何であるかを知りたくて押した人が、
// そのまま変えられる場所に着く。設定の行数も増えない。
//
// ## ここに何を置くか
//
// 無料の人にはプランの一覧（`Paywall`）。有料の人には状態と復元だけ。
// **持っているものをもう一度売らない。**
export default function Plan() {
  const router = useRouter()
  const [paid, setPaid] = useState(null)
  const [tick, setTick] = useState(0)
  const [restoring, setRestoring] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await authFetch('/api/plan')
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setPaid(Boolean(data.paid))
      } catch (e) {
        // 取れなくても画面は開く。**状態の行だけ空にする**
        console.warn('[プラン] 取得に失敗', e)
      }
    })()
    return () => { cancelled = true }
  }, [tick])

  function back() {
    if (router.canGoBack()) router.back()
    else router.replace('/(tabs)/settings')
  }

  // **`ok` ではなく `active` を見る**（`lib/purchases.js` の `restore`）。
  // 復元するものが無くても処理は通るので、`ok` だけを見ると
  // 無料の人に「復元しました」と言ってしまう
  async function handleRestore() {
    setRestoring(true)
    setNotice('')
    const r = await restore()
    setRestoring(false)
    if (r.ok && r.active) {
      setPaid(true)
      setTick((t) => t + 1)
      setNotice('購入を復元しました。')
      return
    }
    setNotice('復元できる購入は見つかりませんでした。')
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center px-5 h-11">
        <Pressable onPress={back} className="min-h-touch justify-center active:opacity-70">
          <Text className="text-body-md text-primary">← 設定</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="px-5 pt-4 pb-10 gap-6 w-full max-w-read self-center">
        <View className="gap-2">
          <Text className="font-display text-headline-lg text-on-surface">プラン</Text>
          {/* 取れるまでは出さない。**「無料」と出してから「有料」に
              変わると、一瞬だけ嘘をついたことになる** */}
          {paid === null ? null : (
            <Text className="text-body-md text-on-surface-variant">
              {paid ? 'Lantern Plus を使っています。' : 'いまは無料で使っています。'}
            </Text>
          )}
        </View>

        {/* 無料の人にだけ売り場を出す */}
        {paid === false && canPurchase() ? (
          <Paywall
            title="Lantern Plus"
            message="有料プランで開くものです。"
            onClose={back}
            onPurchased={() => {
              setPaid(true)
              setTick((t) => t + 1)
            }}
          />
        ) : null}

        {/* 有料の人にも復元は要る（機種変更・再インストール）。
            無料の人の復元は `Paywall` の中にある。**2つ出さない** */}
        {paid === true && canPurchase() ? (
          <View className="gap-3">
            <Pressable
              onPress={restoring ? undefined : handleRestore}
              className="border border-outline-variant rounded-full py-3.5 items-center active:opacity-70"
            >
              <Text className="text-label-md text-primary">
                {restoring ? '復元中...' : '購入を復元'}
              </Text>
            </Pressable>
            <Text className="text-label-md text-outline leading-relaxed">
              解約は「設定 ＞ Apple ID ＞ サブスクリプション」から行えます。
            </Text>
          </View>
        ) : null}

        {notice ? <Text className="text-label-md text-outline">{notice}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  )
}
