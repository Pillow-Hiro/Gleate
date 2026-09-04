import { useEffect, useRef, useState } from 'react'
import { Animated, Pressable, View } from 'react-native'
import Text from './Text'
import { useThemeContext } from '../lib/theme'

// 下線式のタブ。**下線が滑る。**
//
// ## なぜ部品にしたか
//
// 2026-08-23 まで、同じ形が3か所に別々に書いてあった
// （記録／振り返り・分析のまとめ・過去との対話）。
// どれも押した瞬間に下線が**飛んで**いた。消えて、現れる。
//
// 二択・三択のあいだを移ったことは、**同じ線が動く**ことで伝わる。
// 3か所に同じ動きを別々に書くと速さがずれるので、1つにまとめた。
//
// ## 幅を直に動かさない
//
// タブごとに幅が違うので、下線も伸び縮みする必要がある。
// `width` を動かすと native driver が使えず、指の動きから遅れる。
// **素の幅を 100 に決めて `scaleX` で伸ばす。** 変形だけなので
// 描画側（UI スレッド）で完結する。
//
// `scaleX` は中心から伸びるので、置く場所は中心を合わせて計算する。
const BASE = 100

export default function UnderlineTabs({
  tabs,
  value,
  onChange,
  // 置かれる場所ごとに詰め方と字の大きさが違う。**見た目は呼ぶ側が決める**
  itemClassName = 'px-1 pb-2.5',
  textClassName = 'text-body',
  gapClassName = 'gap-4',
}) {
  const { isDark } = useThemeContext()
  // `global.css` の `--color-accent`（明 130 85 0 / 暗 255 185 83）
  const accent = isDark ? '#FFB953' : '#825500'

  const [box, setBox] = useState({})
  const tx = useRef(new Animated.Value(0)).current
  const sx = useRef(new Animated.Value(0)).current
  // **最初の1回は動かさない。** 開いた瞬間に線が走ると、
  // 何かを押したように見える
  const placed = useRef(false)

  const at = box[value]

  useEffect(() => {
    if (!at) return
    const toX = at.x + at.width / 2 - BASE / 2
    const toS = at.width / BASE
    if (!placed.current) {
      placed.current = true
      tx.setValue(toX)
      sx.setValue(toS)
      return
    }
    Animated.parallel([
      Animated.spring(tx, { toValue: toX, useNativeDriver: true, friction: 9, tension: 90 }),
      Animated.spring(sx, { toValue: toS, useNativeDriver: true, friction: 9, tension: 90 }),
    ]).start()
  }, [at, tx, sx])

  return (
    <View className={`flex-row ${gapClassName} border-b border-border`}>
      {tabs.map(({ id, label }) => (
        <Pressable
          key={id}
          onPress={() => onChange(id)}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === id }}
          className={itemClassName}
          onLayout={(e) => {
            const { x, width } = e.nativeEvent.layout
            setBox((prev) => {
              const had = prev[id]
              if (had && had.x === x && had.width === width) return prev
              return { ...prev, [id]: { x, width } }
            })
          }}
        >
          <Text className={`${textClassName} ${value === id ? 'text-primary' : 'text-outline'}`}>
            {label}
          </Text>
        </Pressable>
      ))}

      {at ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            height: 2,
            width: BASE,
            backgroundColor: accent,
            transform: [{ translateX: tx }, { scaleX: sx }],
          }}
        />
      ) : null}
    </View>
  )
}
