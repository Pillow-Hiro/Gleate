import { useEffect, useRef, useState } from 'react'
import { Animated, Pressable, View } from 'react-native'
import Text from './Text'
import { GlassFill, isGlassOn } from './GlassPanel'
import { useThemeContext } from '../lib/theme'
import { accentColor } from '../lib/accent'

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
    // **2026-09-04 に書き換えた**（作者の指摘）。それまでの
    // 「1日にひとつ、あとから書き直せます」は、**2つとも嘘になっていた。**
    // 1日3件まで置けるようになり（2026-09-02）、直す場所も
    // 「記録」タブへ移った（2026-09-03）。
    // 件数は書かない（`REQUIREMENTS.md` F1「書く前に数を意識させない」）。
    // 伝えたいのは数ではなく、**分けて書けること**
    // **「朝と夜」と言わない**（2026-09-04・作者の指摘）。嘘ではないが、
    // **書く時間を2つに決めてしまう。** 昼に思い立った人が「いまは
    // 書くときではない」と読む。伝えたいのは区切りではなく、
    // **いつでも開いていること**
    note: '今日あったことを残します。思い立ったときに、いつでも。直すのは「記録」から。',
  },
  {
    id: 'ideas',
    label: 'アイデア',
    note: '思いついたことを1行で置きます。日付を持たず、いつでも使えます。',
  },
]

// 外側の余白。`p-1` と同じ値。**帯の幅を出すのに要る**ので定数で持つ
const PAD = 4

// 帯は**琥珀のまま**（2026-09-11・作者の指示「色だけは戻して」）。
//
// 一度、動画（Apple Music）に合わせて無色にした。**動かし方は
// そちらが正しかったが、色までは求められていなかった。**
// 動きだけ残して色は戻す。

export default function WriteTabs({ value, onChange }) {
  const index = value === 'ideas' ? 1 : 0
  const { accent, isDark } = useThemeContext()
  const glow = accentColor(accent, isDark)
  const [trackW, setTrackW] = useState(0)
  const slide = useRef(new Animated.Value(index)).current

  // 帯の**左右の端を別々に持つ**（2026-09-11・作者の指示
  // 「移動するとき、添付動画のようにしてほしい」）。
  //
  // ## `scaleX` では出せない動きだった
  //
  // 動画（Apple Music・iOS 26）を1/30秒ずつ見た。帯は**進む側の端が
  // 先に走り、後ろの端が遅れて追いつく。**途中では帯が track の
  // ほぼ全幅まで伸びている。
  //
  // `scaleX` は**中心から対称に**伸びるので、この形にならない。
  // 左右の端をそれぞれ動かし、**進む向きの端だけ速くする。**
  //
  // 端の位置は `left` と `width`。**どちらも native driver に載らない**
  // ので、この2つだけ JS 側で動かす。0.4秒の短い動きで、動かすのは
  // 小さな面ひとつなので、それで足りる。
  const edgeL = useRef(new Animated.Value(0)).current
  const edgeR = useRef(new Animated.Value(0)).current
  const placed = useRef(false)

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

  const pillW = trackW > 0 ? (trackW - PAD * 2) / 2 : 0

  useEffect(() => {
    if (!pillW) return
    const toL = index * pillW
    const toR = toL + pillW

    // 幅を測った直後は**動かさずに置く。**開いた瞬間に伸びない
    if (!placed.current) {
      placed.current = true
      edgeL.setValue(toL)
      edgeR.setValue(toR)
      return
    }

    // **進む向きの端が先**。右へ行くなら右端、左へ行くなら左端
    const lead = index === 1 ? edgeR : edgeL
    const trail = index === 1 ? edgeL : edgeR
    Animated.parallel([
      Animated.spring(lead, {
        toValue: index === 1 ? toR : toL,
        useNativeDriver: false,
        friction: 9,
        tension: 150,
      }),
      Animated.spring(trail, {
        toValue: index === 1 ? toL : toR,
        useNativeDriver: false,
        friction: 11,
        tension: 60,
      }),
    ]).start()
  }, [index, pillW, edgeL, edgeR])

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

  // 動いている途中だけ伸び縮みする。端では 1 に戻す
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
          // **硝子にした**（2026-09-11・作者の指示「記録とアイデアの
          // タブ移動を liquid glass にしたい」）。今日の灯り・ペンの丸・
          // 「これについて書く」と同じ扱い。
          //
          // 角丸は大きな数を渡す。**丈を測っていないので半分が出せない**
          // が、iOS は丈の半分を超えた値を丸く詰めてくれる。
          //
          // iOS 26 未満では今までどおり琥珀に塗る（`GlassPanel.jsx`）。
          <Animated.View
            pointerEvents="none"
            className="rounded-full"
            style={{
              position: 'absolute',
              top: PAD,
              bottom: PAD,
              left: Animated.add(edgeL, PAD),
              width: Animated.subtract(edgeR, edgeL),
              ...(isGlassOn() ? null : { backgroundColor: glow }),
            }}
          >
            <GlassFill fill={glow} radius={999} />
          </Animated.View>
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
