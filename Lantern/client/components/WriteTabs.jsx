import { useEffect, useRef, useState } from 'react'
import { Animated, Pressable, View } from 'react-native'
import Text from './Text'

// 「記録」と「アイデア」の切り替え。
//
// ## 形の由来
//
// **2026-08-14 に下線タブから左右2つの区画に変えた。**
// 実機で「どっちを書いているか迷う」と指摘された。原因は2つあった。
//
// 1. 「記録」の下線タブが**「記録」タブの中のタブと同じ形**をしていた
// 2. **どちらが何なのかがどこにも書いていない**
//
// 形を変え、選んでいる側に説明を1行付けた。説明は選択で入れ替わるので、
// いま何を書いているかが画面の言葉として残る。
//
// ## 動き（2026-08-23）
//
// それまでは押した瞬間に琥珀の地が**飛んでいた。**消えて、現れる。
// 二択のあいだを移ったのか、別のものが出たのかが体で分からない。
//
// **帯を滑らせる。**動いているあいだだけ横に伸び、そのぶん縦が縮む。
// 物が動くときの潰れと伸び（squash and stretch）で、
// 押した先へ**同じものが移った**ことが伝わる。
//
// 跳ねは `spring` の行きすぎに任せている。時間で作らないので、
// 途中でもう一度押されても破綻しない（値が今いる場所から次へ向かう）。
//
// **中身の面は動かさない。**記録側は WebView を抱えており、
// 位置を動かすとちらつく（2026-08-19 の主欄の件と同じ）。
// 動かすのは帯と言葉だけで足りる。
const TABS = [
  {
    id: 'record',
    label: '記録',
    note: '今日あったことを残します。1日にひとつ、あとから書き直せます。',
  },
  {
    id: 'ideas',
    label: 'アイデア',
    note: '思いついたことを1行で置きます。日付を持たず、いつでも使えます。',
  },
]

// 外側の余白。`p-1` と同じ値。**帯の幅を出すのに要る**ので定数で持つ
const PAD = 4

export default function WriteTabs({ value, onChange }) {
  const index = value === 'ideas' ? 1 : 0
  const [trackW, setTrackW] = useState(0)
  const slide = useRef(new Animated.Value(index)).current

  // 説明の1行。**帯より少し遅れて入れ替える。**
  // 先に消してから差し替えるので、字が重ならない
  const [note, setNote] = useState(TABS[index].note)
  const fade = useRef(new Animated.Value(1)).current
  const first = useRef(true)

  useEffect(() => {
    Animated.spring(slide, {
      toValue: index,
      useNativeDriver: true,
      friction: 8,
      tension: 90,
    }).start()
  }, [index, slide])

  useEffect(() => {
    // 最初の描画では消さない（開いた瞬間に言葉が瞬く）
    if (first.current) {
      first.current = false
      return
    }
    Animated.timing(fade, { toValue: 0, duration: 110, useNativeDriver: true }).start(
      ({ finished }) => {
        if (!finished) return
        setNote(TABS[index].note)
        Animated.timing(fade, { toValue: 1, duration: 170, useNativeDriver: true }).start()
      },
    )
  }, [index, fade])

  const pillW = trackW > 0 ? (trackW - PAD * 2) / 2 : 0

  // 行きすぎをそのまま使う。**跳ねはここから出る**
  const move = slide.interpolate({ inputRange: [0, 1], outputRange: [0, pillW] })
  // 動いている途中だけ伸び縮みする。端では 1 に戻す
  const stretch = slide.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.1, 1],
    extrapolate: 'clamp',
  })
  const squash = slide.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.9, 1],
    extrapolate: 'clamp',
  })
  // 字の濃さ。行きすぎで 1 を超えないよう留める
  const t = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' })
  const off = slide.interpolate({ inputRange: [0, 1], outputRange: [1, 0], extrapolate: 'clamp' })

  return (
    <View className="gap-2.5">
      <View
        className="flex-row bg-surface-low rounded-full"
        style={{ padding: PAD }}
        onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
      >
        {/* 滑る帯。**押される面ではない。**下に敷いてあるだけで、
            触るのは上の Pressable。幅を測るまでは描かない */}
        {pillW > 0 ? (
          <Animated.View
            pointerEvents="none"
            className="bg-lantern-glow rounded-full"
            style={{
              position: 'absolute',
              left: PAD,
              top: PAD,
              bottom: PAD,
              width: pillW,
              transform: [{ translateX: move }, { scaleX: stretch }, { scaleY: squash }],
            }}
          />
        ) : null}

        {TABS.map(({ id, label }, i) => (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: index === i }}
            className="flex-1 rounded-full py-2.5 min-h-touch justify-center items-center"
          >
            {/* 選んでいる字と選んでいない字を**重ねて置き、濃さで入れ替える。**
                色を直に動かすと、明るい地と暗い地で別の指定が要る */}
            <Animated.View style={{ opacity: i === 0 ? off : t }}>
              <Text className="font-strong text-body-md text-on-lantern">{label}</Text>
            </Animated.View>
            <Animated.View
              style={{
                position: 'absolute',
                alignItems: 'center',
                justifyContent: 'center',
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                opacity: i === 0 ? t : off,
              }}
            >
              <Text className="text-body-md text-on-surface-variant">{label}</Text>
            </Animated.View>
          </Pressable>
        ))}
      </View>

      <Animated.View style={{ opacity: fade }}>
        <Text className="text-label-md text-outline leading-relaxed">{note}</Text>
      </Animated.View>
    </View>
  )
}
