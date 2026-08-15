import { useEffect, useRef, useState } from 'react'
import { Animated, Image, Pressable, View } from 'react-native'
import Text from './Text'
import { localDateStr } from '../lib/date'
import { splashImageFor } from '../lib/splashImage'
import { cacheForNextTime, loadCached } from '../lib/splashPhoto'

const MONTHS_EN = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
const API_BASE = process.env.EXPO_PUBLIC_API_URL || ''

// Web版と同一。AI憲法準拠の文言。
const FALLBACKS = [
  'あなたの記録が、あなたの灯りになる。',
  '書いた言葉は、ここに残っている。',
  '灯りは、外から来るのではない。',
  '自分の言葉で、自分の道を照らす。',
  '今日のことが、言葉になる。',
]

function useFadeIn(delay) {
  const value = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const anim = Animated.timing(value, {
      toValue: 1,
      duration: 700,
      delay,
      useNativeDriver: true,
    })
    anim.start()
    return () => anim.stop()
  }, [value, delay])
  return value
}

export default function SplashScreen({ onClose }) {
  const now = new Date()
  const dateLabel = `${now.getDate()} ${MONTHS_EN[now.getMonth()]}`

  const [quote, setQuote] = useState(
    () => FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)]
  )
  // 地は**描く前に1つ決めて、そのあと変えない**（2026-08-16）。
  //
  // 前回までに覚えた写真があればそれを、無ければ同梱の地を使う。
  // どちらも端末の中にあるので、**開いた瞬間に出る。**
  //
  // `useState` の初期値で決めているのは、描いている最中に変えないため。
  // 見ている最中に背景が差し替わるのは、作者が嫌がった動き。
  const [background] = useState(() => {
    const cached = loadCached()
    return cached ? { uri: cached } : splashImageFor(localDateStr())
  })

  const dateOpacity = useFadeIn(100)
  const logoOpacity = useFadeIn(250)
  const quoteOpacity = useFadeIn(500)
  const hintOpacity = useFadeIn(900)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/splash/content`)
        const data = await res.json()
        if (cancelled) return
        if (data.quote) setQuote(data.quote)
        // **次回のために置くだけ。** いま出ている地は変えない。
        // 1日ずれる（前に取った写真が今日出る）が、起動画面の写真は
        // その日を表すものではないので困らない
        if (data.photo_url) cacheForNextTime(data.photo_url)
      } catch (e) {
        // 取れなければ、こちらが持っている一文のままにする
        console.warn('[Splash] 起動画面コンテンツの取得に失敗', e)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const content = (
    <Pressable className="flex-1 items-center justify-center" onPress={onClose}>
      {/* グラデーションオーバーレイの代わりに一様な暗幕を敷く（RNに線形グラデーションがないため）。
          pointerEvents を切らないと暗幕がタップを奪い、画面を閉じられなくなる。 */}
      <View pointerEvents="none" className="absolute inset-0 bg-black/40" />

      {/* className は Animated.Text には効かない（NativeWind がラップするのは素の Text）。
          効かないと色もサイズも既定値に落ち、写真の上に黒い小さな文字が出る。
          opacity のアニメーションは Animated.View に持たせ、見た目は Text に置く。 */}
      <View className="px-10 w-full max-w-sm items-center">
        <Animated.View style={{ opacity: dateOpacity }}>
          <Text className="text-white/80 tracking-[4px] mb-5 text-aux">{dateLabel}</Text>
        </Animated.View>

        <Animated.View style={{ opacity: logoOpacity }}>
          <Text className="font-latin text-display text-white mb-7">
            Lantern
          </Text>
        </Animated.View>

        <Animated.View style={{ opacity: quoteOpacity }}>
          <Text className="text-white/90 text-body leading-loose text-center">
            {quote}
          </Text>
        </Animated.View>
      </View>

      {/* ここも className は効かないので位置指定は style で持つ（bottom-14 = 56px） */}
      <Animated.View style={{ opacity: hintOpacity, position: 'absolute', bottom: 56 }}>
        <Text className="text-aux text-white/40">タップして続ける</Text>
      </Animated.View>
    </Pressable>
  )

  // **地はアプリの中に持つ**（2026-08-16）。開いた瞬間から出る。
  //
  // それまでは Unsplash から取っていた。届くまでの数秒（サーバーが眠って
  // いれば数十秒）は濃紺で、**写真は遅れて現れていた。**
  //
  // しかも、写真が無い間は `View`、届いたら `ImageBackground` で包む、と
  // **返す形を変えていた。** 形が変わると React は中身を作り直すので、
  // 日付もロゴも一文ももう一度フェードインする。
  // それが「起動画面が2回出る」の正体だった。
  //
  // いまは差し替わるものが無いので、そもそも作り直されない。
  // 外側の濃紺は、画像が描かれるまでの1フレームぶんの下地。
  return (
    <View className="absolute inset-0 z-50 bg-[#16213e]">
      <Image
        source={background}
        resizeMode="cover"
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {content}
    </View>
  )
}
