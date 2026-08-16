import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Image, Pressable, ScrollView, View } from 'react-native'
import { BlurView } from 'expo-blur'
import { useRouter } from 'expo-router'
import Text from '../components/Text'
import AuthForm from '../components/AuthForm'
import LanternMark from '../components/LanternMark'
import { supabase } from '../lib/supabase'
import { authErrorMessage } from '../lib/authError'
import { currentSplashBackground } from '../lib/splashBackground'
import { isWaiting, onLeave } from '../lib/splashHandoff'

// **ログインと新規登録を別の画面にしている（2026-08-08）。**
//
// それまでは1画面をモードで切り替えていた。実機で
// 「ログインなのか登録なのか分かりづらい」と指摘された。
// 見出しもボタンも入れ替わるだけなので、途中で切り替わったことに
// 気づかないまま送信してしまう。
//
// **2026-08-16 に起動画面と地を共有した（案 `code.html`）。**
//
// 起動画面が消えてこの画面が出るのではない。
// **写真はそのまま残り、ぼけて沈み、その上にカードが下から上がる。**
// 見えているのは1枚の写真が続いている様子で、実際には
// 起動画面の鮮明な写真が薄れ、ここのぼけた写真が現れている。
// **同じ1枚であることが要る**ので、選び方は `lib/splashBackground.js` に置いた。
//
// 起動画面が去り始めた合図は `lib/splashHandoff.js` から届く。
// 起動画面が出ない起動（1日2回目以降）では待たずに上がる。
//
// **新規登録・パスワード再設定には写真を敷いていない。**
// あの2枚は「ログインと違う形に見せる」ために作りを変えてある
// （`signup.jsx` の冒頭）。同じ地を敷くと、また同じ顔になる。

// カードが上がってくる間合い。**起動画面の側と足し合わせて約1.1秒**
// （`components/SplashScreen.jsx` の冒頭に対の値がある）。
const CARD_DELAY_MS = 380
const CARD_MS = 800
// 起動画面を経ずに開いたとき。待つ相手がいないので、ためらわずに出す
const CARD_SOLO_DELAY_MS = 60
const CARD_SOLO_MS = 500
const CARD_RISE = 30

export default function Login() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // **起動画面と同じ1枚。** 描く前に決めて、そのあと変えない
  const [background] = useState(() => currentSplashBackground())

  // 起動画面が出ているなら待つ。出ていないなら自分の間合いで上がる
  const [waiting, setWaiting] = useState(() => isWaiting())
  // **開いた時点で待っていたか。** あとから `isWaiting()` を見ても、
  // その頃には去り始めていて false に変わっている
  const handedOver = useRef(isWaiting())
  const card = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!waiting) return
    return onLeave(() => setWaiting(false))
  }, [waiting])

  useEffect(() => {
    if (waiting) return
    const anim = Animated.timing(card, {
      toValue: 1,
      duration: handedOver.current ? CARD_MS : CARD_SOLO_MS,
      delay: handedOver.current ? CARD_DELAY_MS : CARD_SOLO_DELAY_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    })
    anim.start(({ finished }) => {
      // **途中で止まったら、その場で出す。**
      // 上がりきらないと opacity 0 のままで、
      // ログインの欄が見えない画面になる。**起動画面と違って逃げ道がない**
      if (!finished) card.setValue(1)
    })
    return () => anim.stop()
  }, [waiting, card])

  async function handleLogin(email, password) {
    setLoading(true)
    setError('')
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) throw err
      // 成功したら _layout.jsx の認証ガードが本画面へ振り替える
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    // 写真が描かれるまでの1フレームぶんの下地。起動画面と同じ濃紺にして、
    // 受け渡しの瞬間に色が飛ばないようにする
    <View className="flex-1 bg-[#16213e]">
      <Image
        source={background}
        resizeMode="cover"
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {/* **ぼかしは動かさない。** ぼけ具合を animate すると毎フレーム
          描き直しになる。起動画面の鮮明な写真が薄れて、ここの
          ぼけた写真が現れる形にすれば、animate するのは不透明度だけで済む。
          Android は expo-blur が効かないことがあるが、そのときは
          下の暗幕だけが残る。**読めなくはならない。** */}
      <BlurView
        intensity={40}
        tint="dark"
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View pointerEvents="none" className="absolute inset-0 bg-black/25" />

      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow justify-center px-5 py-10"
        keyboardShouldPersistTaps="handled"
      >
        {/* className は Animated.View に効かない（NativeWind が包むのは素の View）。
            動きは外、見た目は中の View に置く */}
        <Animated.View
          style={{
            width: '100%',
            maxWidth: 384,
            alignSelf: 'center',
            opacity: card,
            transform: [
              {
                translateY: card.interpolate({
                  inputRange: [0, 1],
                  outputRange: [CARD_RISE, 0],
                }),
              },
            ],
          }}
        >
          <View className="bg-surface/95 rounded-lg shadow-bloom px-6 py-8">
            <View className="items-center mb-8">
              <View className="w-16 h-16 rounded-full bg-surface-lowest items-center justify-center shadow-bloom mb-5">
                <LanternMark size={30} />
              </View>
              <Text className="font-latin text-display text-ink">Lantern</Text>
              {/* この一文は CLAUDE.md の書き出しと食い違って見えるが、
                  2026-08-06 に作者が残すと決めた。直さないこと。 */}
              <Text className="text-body-md text-on-surface-variant mt-2">創作の道を照らす、AI伴走者</Text>
            </View>

            <AuthForm
              mode="login"
              submitLabel="ログイン"
              error={error}
              loading={loading}
              onSubmit={handleLogin}
              belowFields={
                // **パスワードを忘れた場合。** 2026-08-13 まで無く、忘れたら詰んだ
                <Pressable onPress={() => router.push('/forgot')} className="py-1">
                  <Text className="text-label-md text-secondary">パスワードを忘れた場合</Text>
                </Pressable>
              }
            />

            {/* **登録への入口。**
                問いかけと操作を1行にし、操作の側だけを濃く・太くする。
                「はじめての方はこちら」だけでは、押せる場所なのか
                ただの説明なのかが読み取れなかった。

                2026-08-16 にカードの中へ入れた。**外に出すと写真の上に載る。**
                独立して見えることは、区切り線と余白で保っている。 */}
            <View className="border-t border-outline-variant/30 mt-8 pt-5 flex-row justify-center items-center gap-1.5">
              <Text className="text-body-md text-on-surface-variant">アカウントをお持ちでない方は</Text>
              <Pressable
                onPress={() => router.push('/signup')}
                className="min-h-touch justify-center active:opacity-70"
              >
                <Text className="font-strong text-body-md text-primary underline">アカウントを作成</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  )
}
