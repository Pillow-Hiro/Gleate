import { useEffect, useRef, useState } from 'react'
import { Animated, Image, Pressable, View } from 'react-native'
import Text from './Text'
import { localDateStr } from '../lib/date'

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
  const [photoUrl, setPhotoUrl] = useState(null)

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
        setPhotoUrl(data.photo_url || `https://picsum.photos/seed/${localDateStr()}/800/1400`)
      } catch (e) {
        // 取得失敗時はグラデーション背景とフォールバック文言のままにする
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

  // **形を変えない**（2026-08-16）。
  //
  // それまでは写真が無い間ただの `View` を返し、届いたら
  // `ImageBackground` で包んで返していた。
  // **返す形が変わると React は中身を作り直す。**
  // 作り直された `content` は最初から出直すので、
  // 日付もロゴも一文も**もう一度フェードインする。**
  // 実機では「起動画面が2回出て、2回目にだけ写真が出る」ように見えていた。
  //
  // 写真は**包まず、後ろに敷く**。中身の位置は変わらないので作り直されない。
  // 地の色は外側に置く。写真が来るまでの間と、失敗したときの背景になる。
  return (
    <View className="absolute inset-0 z-50 bg-[#16213e]">
      {/* 写真は**中身の後ろに敷くだけ**。包まない。
          包むと、届いた瞬間に中身が包み直されて作り直される */}
      {/* **写真は淡く出さない**（2026-08-16）。
          `Animated` で 0 → 1 にしてみたが、**この構成では値が style に
          反映されず、写真が一度も出なかった**（ブラウザで確かめた。
          `complete: true` なのに親の opacity が 0 のまま）。
          `onLoad` 待ち・配列 style・素のオブジェクトのどれでも動かない。

          淡く出るのは飾りで、**写真が出ることの方が大事。**
          中身は作り直されないので、地が変わるだけの静かな切り替わりになる。 */}
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          resizeMode="cover"
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : null}
      {content}
    </View>
  )
}
