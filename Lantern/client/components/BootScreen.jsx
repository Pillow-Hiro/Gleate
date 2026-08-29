import { useEffect, useRef } from 'react'
import { AccessibilityInfo, Animated, Easing, Image, View } from 'react-native'
import { useThemeContext } from '../lib/theme'

// 判定が終わるまでの画面。**OS の起動画面と地続きに見せる。**
//
// ## なぜ要るのか（2026-08-28）
//
// 認証と起動画面の判定が済むまで、ここは無地の `View` だった。
// **OS の起動画面の裏なので、ふつうは見えない。**
// だが電波が悪い日や初回起動では判定が伸び、そのあいだ
// `expo-splash-screen` の画面が固まったまま出続ける。
// 作者から「読み込み画面が表示されている」と報告があったのはこれ。
//
// ## 何を足して、何を足さないか
//
// **読み込み中の丸を出さない。** 出した瞬間、起動が
// 「OS の起動画面 → 読み込み → Lantern の起動画面」の3段に見える。
// 2026-08-14 に一度その形になり、直した経緯がある（`app/_layout.jsx`）。
//
// だから**静止時は OS の起動画面と見分けがつかない**ようにする。
// 地の色も、絵も、大きさも同じものを使う（`app.json` の
// `expo-splash-screen` の設定と対）。**片方を変えたら、もう片方も変える。**
//
// 待ちが伸びたときだけ、灯りがゆっくり息をする。
// **文字を置かない。** 何語で出すかを決めずに済み、
// 「読み込み中」と言わずに、動いていることだけが伝わる。

// `app.json` の `expo-splash-screen` と同じ値。**揃えること。**
const LIGHT_BG = '#faf9f7'
const DARK_BG = '#1c1c1e'
const ICON_WIDTH = 160

// これだけ待っても終わらないときに息を始める。
// **短い起動では一度も動かない。** ふつうに開けた人には、
// OS の起動画面がそのまま出ていたようにしか見えない
const BREATH_DELAY_MS = 900
const BREATH_MS = 1600
const BREATH_LOW = 0.55

export default function BootScreen() {
  const { isDark } = useThemeContext()
  const glow = useRef(new Animated.Value(1)).current

  useEffect(() => {
    let loop = null
    let cancelled = false

    const timer = setTimeout(async () => {
      if (cancelled) return
      // **動きを減らす設定を尊重する。** 息をしないだけで、画面は出る
      try {
        if (await AccessibilityInfo.isReduceMotionEnabled()) return
      } catch (e) {
        // 取れなければ動かす。ここで止めると、待っている合図が消える
        console.warn('[起動] 動きの設定を読めなかった', e)
      }
      if (cancelled) return

      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glow, {
            toValue: BREATH_LOW,
            duration: BREATH_MS / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 1,
            duration: BREATH_MS / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      )
      loop.start()
    }, BREATH_DELAY_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
      loop?.stop()
    }
  }, [glow])

  return (
    <View
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: isDark ? DARK_BG : LIGHT_BG }}
    >
      <Animated.View style={{ opacity: glow }}>
        <Image
          source={require('../assets/splash-icon.png')}
          style={{ width: ICON_WIDTH, height: ICON_WIDTH }}
          resizeMode="contain"
          // 起動画面の絵。読み上げる中身が無い
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </Animated.View>
    </View>
  )
}
