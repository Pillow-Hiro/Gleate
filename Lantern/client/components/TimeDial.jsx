import { useEffect, useRef } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import Text from './Text'

// 時刻のダイヤル。**hh と mm を回して決める。**
//
// 2026-08-14 まで、8/12/18/21/23 の5つを並べ、その後 24 個の格子にした。
// どちらも「用意された選択肢から選ぶ」形で、
// **自分の時間をそのまま指定できなかった。**
//
// iOS の時刻ピッカーと同じ、上下に回す形にしている。
// **端末の部品は使っていない。** `@react-native-community/datetimepicker` は
// ネイティブを持つので、入れると指紋が変わり、
// 配信済みのビルドへ OTA が届かなくなる（2026-08-13 に踏んだ）。
// 縦のスクロールに吸着させれば、同じ操作感を JS だけで作れる。
//
// **分は1分刻み**（2026-08-15）。5分刻みから変えた。
// 「その時刻でないと困る」人がいる、という作者の判断。
// 60 段になるので、見える段の広さがそのまま探しやすさになる。
// **見える段を増やした**（2026-08-14）。3段だと、いま選んでいる時刻の
// 前後が1つずつしか見えず、どこを回しているのか分からなかった。
const ITEM_HEIGHT = 44
const VISIBLE = 7
const HEIGHT = ITEM_HEIGHT * VISIBLE

export const MINUTE_STEP = 1

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP)

function pad(n) {
  return String(n).padStart(2, '0')
}

function Column({ values, value, onChange, label }) {
  const ref = useRef(null)
  const index = Math.max(0, values.indexOf(value))

  // 開いたときに現在の値へ合わせる。合っていないと、
  // いま何時に設定されているのかが分からない
  useEffect(() => {
    const id = setTimeout(() => {
      ref.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: false })
    }, 0)
    return () => clearTimeout(id)
    // 開いた直後だけ。回している最中に引き戻さない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleEnd(e) {
    const y = e.nativeEvent.contentOffset.y
    const i = Math.round(y / ITEM_HEIGHT)
    const next = values[Math.min(values.length - 1, Math.max(0, i))]
    if (next !== value) onChange(next)
  }

  return (
    <ScrollView
      ref={ref}
      accessibilityLabel={label}
      style={{ height: HEIGHT, width: 96 }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_HEIGHT}
      decelerationRate="fast"
      onMomentumScrollEnd={handleEnd}
      onScrollEndDrag={handleEnd}
      contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * Math.floor(VISIBLE / 2) }}
    >
      {values.map((v) => (
        // 回すだけでなく、押しても選べるようにする。
        // 目的の数字が見えているのに回さないと選べないのは遠い
        <Pressable
          key={v}
          onPress={() => onChange(v)}
          style={{ height: ITEM_HEIGHT }}
          className="items-center justify-center"
        >
          <Text
            className={`font-label ${
              v === value ? 'text-headline-md text-on-surface' : 'text-body-lg text-outline'
            }`}
          >
            {pad(v)}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}

export default function TimeDial({ hour, minute, onChange }) {
  return (
    <View className="items-center">
      <View className="flex-row items-center justify-center">
        {/* 真ん中の段を示す帯。どこが選ばれているのかを示す */}
        <View
          pointerEvents="none"
          className="absolute left-0 right-0 bg-surface-high rounded"
          style={{ height: ITEM_HEIGHT, top: ITEM_HEIGHT * Math.floor(VISIBLE / 2) }}
        />
        <Column
          label="時"
          values={HOURS}
          value={hour}
          onChange={(h) => onChange({ hour: h, minute })}
        />
        <Text className="text-headline-md text-on-surface-variant px-1">:</Text>
        <Column
          label="分"
          values={MINUTES}
          value={minute}
          onChange={(m) => onChange({ hour, minute: m })}
        />
      </View>
    </View>
  )
}
