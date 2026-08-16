import { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, Easing, Image, Pressable, useWindowDimensions, View } from 'react-native'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'
import Text from './Text'
import { currentSplashBackground } from '../lib/splashBackground'
import { cacheForNextTime as cachePhoto } from '../lib/splashPhoto'
import { cacheForNextTime as cacheQuote, loadCached as loadQuote } from '../lib/splashQuote'
import { markLeaving } from '../lib/splashHandoff'

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

// 去るときの間合い（2026-08-16・案 `code.html` に合わせた）。**全部で約1.1秒。**
//
// **写真は去らない。** 案の演出はこうなっている。
//
//   言葉が上へ抜ける → 灯りがふくらむ → 鮮明な写真が薄れ、
//   下にあるログイン画面の**ぼけた同じ写真**が現れ、カードが下から上がる
//
// 起動画面が消えてログイン画面が出る、のではない。
// **地はつながったまま、上に載っているものだけが入れ替わる。**
// だから1枚を動かさない。動かすと下の写真とずれて、つながって見えなくなる。
//
// ログイン側の間合いは `app/login.jsx` にある。ここと足し合わせて
// 約1.1秒になるように置いてある。
const WORD_OUT_MS = 300
const WORD_STAGGER_MS = 60
const BLOOM_DELAY_MS = 80
const BLOOM_MS = 820
const SHEET_DELAY_MS = 240
const SHEET_MS = 620
// **1枚は動かさない。**
//
// 2026-08-16、実機を見た作者の判断で「退く演出」をやめた。
// 1.02 でも、下のログイン画面の写真は動かないので**ずれが出る。**
// 地がつながって見えることの方が、退く手応えより大事だった。
// 薄れるだけにする。

// 言葉が上がってくる幅。出るときも去るときも同じだけ動く
const RISE = 12

// 地がゆっくり動く（案の ken-burns）。**20秒で片道。**
// 止まった写真より、息をしている方が「待っている画面」に見える。
// 気づかせるためではないので、大きさも速さも気づかない程度に留める。
const KEN_MS = 20000
const KEN_SCALE = 1.05
const KEN_SHIFT = 0.01

function useReveal(delay) {
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

// 出る側と去る側を**別の値で持つ**。
//
// 1つの値を 0→1→2 で使い回すと、**出きる前に押されたときに
// 言葉が一瞬現れてから去る。** 押されるのは大抵すぐなので、
// その道が普通に通る。掛け算にしておけば、出ていない言葉は出ないまま去る。
function wordStyle(enter, out) {
  return {
    opacity: Animated.multiply(
      enter,
      out.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
    ),
    transform: [
      {
        translateY: Animated.add(
          enter.interpolate({ inputRange: [0, 1], outputRange: [RISE, 0] }),
          out.interpolate({ inputRange: [0, 1], outputRange: [0, -RISE] })
        ),
      },
    ],
  }
}

export default function SplashScreen({ onClose }) {
  const now = new Date()
  const dateLabel = `${now.getDate()} ${MONTHS_EN[now.getMonth()]}`
  const { width, height } = useWindowDimensions()

  // 一言も地も、**描く前に1つ決めて、そのあと変えない**（2026-08-16）。
  //
  // 前回までに覚えたものがあればそれを、無ければ手元のものを使う。
  // どちらも端末の中にあるので、**開いた瞬間に出る。**
  //
  // `useState` の初期値で決めているのは、描いている最中に変えないため。
  // 見ている最中に差し替わるのは、作者が嫌がった動き。
  // 一言は「言葉が2回出てくる」として報告された。
  const [quote] = useState(
    () => loadQuote() || FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)]
  )
  // **ログイン画面と同じ1枚を使う**（`lib/splashBackground.js`）。
  // 別々に選ぶと、受け渡しの途中で写真が入れ替わる
  const [background] = useState(() => currentSplashBackground())

  const dateIn = useReveal(100)
  const logoIn = useReveal(250)
  const quoteIn = useReveal(500)
  const hintIn = useReveal(900)

  const dateOut = useRef(new Animated.Value(0)).current
  const logoOut = useRef(new Animated.Value(0)).current
  const quoteOut = useRef(new Animated.Value(0)).current
  const hintOut = useRef(new Animated.Value(0)).current

  // 1枚が退く。0 が出ている状態、1 が去った状態
  const sheet = useRef(new Animated.Value(0)).current
  // 灯り。0 →1 を一度だけ通る（途中でふくらんで、終わりで消える）
  const bloom = useRef(new Animated.Value(0)).current
  // 押されている間のへこみ。**触れたことを画面が返す**
  const press = useRef(new Animated.Value(0)).current
  // 地のゆっくりした動き
  const ken = useRef(new Animated.Value(0)).current

  const leaving = useRef(false)

  useEffect(() => {
    // 行って戻るを繰り返す。`Animated.loop` は往復しないので、
    // 往路と復路を並べたものを回す
    const leg = (toValue) =>
      Animated.timing(ken, {
        toValue,
        duration: KEN_MS,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    const anim = Animated.loop(Animated.sequence([leg(1), leg(0)]))
    anim.start()
    return () => anim.stop()
  }, [ken])

  const close = useCallback(() => {
    // **2回目は待たせない。**
    //
    // 去る動きが止まると、この画面は出たまま操作を受け付けなくなる。
    // ブラウザは表に出ていない間 `requestAnimationFrame` を止めるし、
    // アプリを裏に回しても同じことが起きる。
    // 押されているのに何も起きない画面を作らないため、
    // 2回目の押下は動きを飛ばしてそのまま閉じる。
    if (leaving.current) {
      onClose?.()
      return
    }
    leaving.current = true

    // **下のログイン画面に知らせる。** あちらのカードはこれを合図に上がる
    markLeaving()

    // 出ている途中なら止める。**去りながら出てくるのを防ぐ**
    ;[dateIn, logoIn, quoteIn, hintIn].forEach((v) => v.stopAnimation())

    const wordsOut = Animated.stagger(
      WORD_STAGGER_MS,
      // 下から順に。**目は下（タップして続ける）から離れていく**
      [hintOut, quoteOut, logoOut, dateOut].map((v) =>
        Animated.timing(v, {
          toValue: 1,
          duration: WORD_OUT_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        })
      )
    )

    Animated.parallel([
      wordsOut,
      Animated.timing(bloom, {
        toValue: 1,
        duration: BLOOM_MS,
        delay: BLOOM_DELAY_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(sheet, {
        toValue: 1,
        duration: SHEET_MS,
        delay: SHEET_DELAY_MS,
        // 最初に動いて最後に落ち着く。等速だと機械が消したように見える
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 途中で止められた場合も閉じる。**閉じないと出たままになる**
      onClose?.()
    })
  }, [bloom, dateIn, dateOut, hintIn, hintOut, logoIn, logoOut, onClose, quoteIn, quoteOut, sheet])

  function dip(toValue, duration) {
    Animated.timing(press, {
      toValue,
      duration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start()
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/splash/content`)
        const data = await res.json()
        if (cancelled) return
        // **次回のために置くだけ。** いま出ている一言も地も変えない。
        // 1日ずれる（前に取ったものが今日出る）が、起動画面の一言と写真は
        // その日を表すものではないので困らない
        if (data.quote) cacheQuote(data.quote)
        if (data.photo_url) cachePhoto(data.photo_url)
      } catch (e) {
        // 取れなければ、覚えているものがそのまま出る
        console.warn('[Splash] 起動画面コンテンツの取得に失敗', e)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const content = (
    <Pressable
      className="flex-1 items-center justify-center"
      onPress={close}
      onPressIn={() => dip(1, 120)}
      onPressOut={() => dip(0, 220)}
    >
      {/* グラデーションオーバーレイの代わりに一様な暗幕を敷く（RNに線形グラデーションがないため）。
          pointerEvents を切らないと暗幕がタップを奪い、画面を閉じられなくなる。 */}
      <View pointerEvents="none" className="absolute inset-0 bg-black/40" />

      {/* className は Animated.Text には効かない（NativeWind がラップするのは素の Text）。
          効かないと色もサイズも既定値に落ち、写真の上に黒い小さな文字が出る。
          動きは Animated.View に持たせ、見た目は Text に置く。 */}
      <View className="px-10 w-full max-w-sm items-center">
        <Animated.View style={wordStyle(dateIn, dateOut)}>
          <Text className="text-white/80 tracking-[4px] mb-5 text-aux">{dateLabel}</Text>
        </Animated.View>

        <Animated.View style={wordStyle(logoIn, logoOut)}>
          <Text className="font-latin text-display text-white mb-7">
            Lantern
          </Text>
        </Animated.View>

        <Animated.View style={wordStyle(quoteIn, quoteOut)}>
          <Text className="text-white/90 text-body leading-loose text-center">
            {quote}
          </Text>
        </Animated.View>
      </View>

      {/* ここも className は効かないので位置指定は style で持つ（bottom-14 = 56px） */}
      <Animated.View
        style={{ ...wordStyle(hintIn, hintOut), position: 'absolute', bottom: 56 }}
      >
        <Text className="text-aux text-white/40">タップして続ける</Text>
      </Animated.View>
    </Pressable>
  )

  // **灯りが引き取る。**
  //
  // 円を1枚置くと縁が立って「輪が広がった」に見える。
  // 中心から外へ薄れていく塗り（`RadialGradient`）にすると、
  // 縁が消えて**灯りがふくらんだ**ように見える。
  // `react-native-svg` は既に入っているので、足したものは無い。
  //
  // 色は灯りの `#FBB03B`。この画面に他の琥珀は無いので、
  // 「1画面に灯り色を2箇所以上置かない」に反しない。
  const bloomSize = Math.max(width, height) * 1.2
  const glow = (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: (width - bloomSize) / 2,
        top: (height - bloomSize) / 2,
        width: bloomSize,
        height: bloomSize,
        // 出ていない間は 0。**押されるまで灯りは無い**
        opacity: bloom.interpolate({
          inputRange: [0, 0.35, 1],
          outputRange: [0, 1, 0],
        }),
        transform: [
          { scale: bloom.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2] }) },
        ],
      }}
    >
      <Svg width={bloomSize} height={bloomSize}>
        <Defs>
          <RadialGradient id="lanternGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FBB03B" stopOpacity="0.55" />
            <Stop offset="45%" stopColor="#FBB03B" stopOpacity="0.22" />
            <Stop offset="100%" stopColor="#FBB03B" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width={bloomSize} height={bloomSize} fill="url(#lanternGlow)" />
      </Svg>
    </Animated.View>
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
  // **灯りは1枚の外に出す。** 中に入れると1枚が薄くなるのに巻き込まれ、
  // 一番ふくらむ頃にはもう見えない。
  //
  // **className ではなく style で書いている。** NativeWind が包むのは素の
  // `View` で、`Animated.View` には効かない。効かないと位置指定ごと落ち、
  // 起動画面が画面いっぱいに広がらなくなる。
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          // 画像が描かれるまでの1フレームぶんの下地
          backgroundColor: '#16213e',
          opacity: sheet.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [
            // 押されている間わずかにへこむ。**触れたことを返す**
            // 去るときは動かさない（上の `SHEET_MS` の項を参照）
            { scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.985] }) },
          ],
        }}
      >
        <Animated.Image
          source={background}
          resizeMode="cover"
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            transform: [
              { scale: ken.interpolate({ inputRange: [0, 1], outputRange: [1, KEN_SCALE] }) },
              {
                translateX: ken.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -width * KEN_SHIFT],
                }),
              },
              {
                translateY: ken.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -height * KEN_SHIFT],
                }),
              },
            ],
          }}
        />
        {content}
      </Animated.View>
      {glow}
    </View>
  )
}
