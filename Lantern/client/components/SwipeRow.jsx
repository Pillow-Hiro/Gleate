import { useRef } from 'react'
import { Animated, PanResponder, Pressable, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

// 横に払うとゴミ箱が出る行（2026-09-11・作者の指示
// 「横にフリックしたらゴミ箱が出る表示で」）。
//
// ## `react-native-gesture-handler` を使わない
//
// 入ってはいる（`expo-router` 経由でビルド29 に autolink 済み）。
// だが **`GestureHandlerRootView` がこのアプリのどこにも無い。**
// 根を探したが `expo-router` も `@react-navigation` も置いていない。
// 無いまま `Swipeable` を使うと、**動かないのに何の合図も出ない。**
//
// 同じ形の失敗を一度している——`Sheet.jsx` のつまみは
// `PanResponder` を親の `Pressable` に取られて、**触れるのに効かない
// つまみ**として残っていた。**動かないものを置かない。**
//
// ここでは `PanResponder` を**行の親**に置く。子の `Pressable` より
// 先に動きを見られるので、横に払えば親が取れる。
// （`Sheet` が失敗したのは、**親が `Pressable` で子が responder** という
// 逆の並びだったため。）
//
// ## 縦に流れるのを邪魔しない
//
// 一覧は縦に流れる。`onMoveShouldSetPanResponder` で
// **横の動きが縦より明らかに大きいときだけ**取る。
// 8px 動くまでは何も取らない——押しただけで動き出さないように。
//
// ## 開いたままにする
//
// 半分を越えたら開いたまま留める。押し間違いで消えないよう、
// **ゴミ箱をもう一度押すまで消さない。**

// ゴミ箱が見える幅
const REVEAL = 76

// ここを越えたら開く
const SNAP = REVEAL / 2

function Trash({ color }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M4 7h16" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Path
        d="M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <Path
        d="M6 7l.8 12.1A2 2 0 008.8 21h6.4a2 2 0 002-1.9L18 7"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export default function SwipeRow({ onDelete, label, children, className = '' }) {
  const x = useRef(new Animated.Value(0)).current
  const opened = useRef(false)

  function slide(to) {
    opened.current = to !== 0
    Animated.spring(x, {
      toValue: to,
      useNativeDriver: true,
      bounciness: 0,
      speed: 18,
    }).start()
  }

  const pan = useRef(
    PanResponder.create({
      // **押しただけでは取らない。**8px 動いて、かつ横が縦より大きいとき
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_e, g) => {
        const base = opened.current ? -REVEAL : 0
        // 右へは戻る以上に行かせない。左は REVEAL で止める
        x.setValue(Math.min(0, Math.max(-REVEAL, base + g.dx)))
      },
      onPanResponderRelease: (_e, g) => {
        const base = opened.current ? -REVEAL : 0
        slide(base + g.dx < -SNAP ? -REVEAL : 0)
      },
      onPanResponderTerminate: () => slide(opened.current ? -REVEAL : 0),
    }),
  ).current

  return (
    <View className={`overflow-hidden ${className}`}>
      {/* ゴミ箱。**行の下に敷いておき、行がどくと見える** */}
      <View
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: REVEAL }}
        className="items-center justify-center"
      >
        <Pressable
          onPress={() => {
            slide(0)
            onDelete()
          }}
          accessibilityLabel={label}
          hitSlop={8}
          className="w-11 h-11 items-center justify-center rounded-full active:opacity-60"
        >
          <Trash color="rgb(186 26 26)" />
        </Pressable>
      </View>

      {/* **地を塗る。**塗らないとゴミ箱が行の下から透ける */}
      <Animated.View
        style={{ transform: [{ translateX: x }] }}
        className="bg-surface"
        {...pan.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  )
}
