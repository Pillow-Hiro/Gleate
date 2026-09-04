import { Pressable, View } from 'react-native'
import Text from './Text'

// 色を選ぶ区画（2026-09-04・作者の指示で設定からマイページへ移した）。
//
// 灯りの色（`lib/accent.js`）と紙の色（`lib/paper.js`）で使う。
// **中身は同じ形**なので、2つ書かずに1つで済ませる。
//
// ## 見本を左に置く
//
// 名前だけでは、選ぶ前にどんな色か分からない。「蝋燭」「生成り」は
// 手がかりにはなるが、**画面がどう変わるかは色を見ないと分からない。**
//
// **説明文は置かない**（作者の指示）。見本と名前で足りている。
//
// 見本は丸。四角だと小さな面に見えて、地の色と競う。
// 紙の見本は地に近い色なので、輪郭を1本足さないと沈む。
//
// ## 見本はいまの明暗で出す
//
// 色を引くのは呼ぶ側（`swatchOf`）。明るい側で固定していたら、
// **暗いテーマでは白い丸が並んだ**。選ぶ前にどうなるかを見せる丸なので、
// いま見ている側の色でなければ意味がない。
function SwatchRow({ label, swatch, selected, isLast, onPress, what }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${what}を${label}にする`}
      className="active:opacity-70"
    >
      <View
        className={`flex-row items-center gap-3 py-3.5 min-h-touch ${
          isLast ? '' : 'border-b border-border'
        }`}
      >
        <View
          style={{ backgroundColor: `rgb(${swatch})`, width: 22, height: 22 }}
          className="rounded-full border border-outline-variant"
        />
        <Text
          className={`flex-1 text-body-md ${
            selected ? 'font-strong text-primary' : 'text-on-surface'
          }`}
        >
          {label}
        </Text>
        {selected ? <Text className="text-body-md text-primary">✓</Text> : null}
      </View>
    </Pressable>
  )
}

export default function SwatchPicker({ title, options, value, onChange, swatchOf }) {
  return (
    <View>
      <Text className="font-strong text-label-md text-on-surface-variant mb-2">{title}</Text>
      <View className="bg-surface-lowest rounded-lg px-4 shadow-bloom">
        {options.map((option, i) => (
          <SwatchRow
            key={option.id}
            what={title}
            label={option.label}
            swatch={swatchOf(option.id)}
            selected={value === option.id}
            isLast={i === options.length - 1}
            onPress={() => onChange(option.id)}
          />
        ))}
      </View>
    </View>
  )
}
