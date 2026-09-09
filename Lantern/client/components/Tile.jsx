import { Pressable, View } from 'react-native'
import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg'
import Text from './Text'
import { useThemeContext } from '../lib/theme'
import { accentColor } from '../lib/accent'

// ホームの2枚（2026-09-09・作者の指示「画像のをベースに数字を目立たせる」）。
//
// 案（`lantern_1`）は**記号が左上、数が右上の小さな字。**
// 作者の求めは「数を目立たせる」なので、そこだけ変えた——
// **数を下の段へ下ろし、題より大きくする。**
//
// 案の記号は琥珀。**塗りではないので規則に触れない**
// （`CLAUDE.md`「1画面に灯り色を2箇所以上置かない」の「置く」は塗り。
// この画面で塗るのは今日の灯りだけ、という状態は保っている）。
//
// 数が無いときは `—`。**0 と「まだ読めていない」を混同させない。**

// 記号は**タブと同じ形**（2026-09-09・作者の指示
// 「記号の形をタブのアイコンと同じにしてください」）。
//
// タブは SF Symbols を native で出している（`app/(tabs)/_layout.jsx`）
// ——記録が `book.closed`、書くが `pencil`。**同じ絵柄を描き写す。**
//
// 一度は案 `lantern_2` の記号を使ったが、**タブの記号と少し違う形**に
// なっていた。同じ場所を指すものが2つの形を持つと、繋がりが読めない。

export function Back({ color }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      {/* `book.closed` — 閉じた本。外枠と、左寄りの背 */}
      <Rect
        x="4.5"
        y="3"
        width="15"
        height="18"
        rx="2.4"
        stroke={color}
        strokeWidth="1.75"
      />
      <Path d="M8.2 3v18" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    </Svg>
  )
}

export function Bulb({ color }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      {/* `pencil` — 斜めの鉛筆。**下の横線は付けない**
          （あれは `pencil.line` で、タブのものとは別） */}
      <Path
        d="M4 20l1-4L16.5 4.5a2.12 2.12 0 013 3L8 19l-4 1z"
        stroke={color}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function Book({ color }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
      <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
    </Svg>
  )
}

export function Clock({ color }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <Polyline points="12 6 12 12 16 14" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export default function Tile({ Icon, count, title, sub, onPress }) {
  const { accent, isDark } = useThemeContext()
  const glow = accentColor(accent, isDark)

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={title}
      className="flex-1 bg-surface-lowest border border-border rounded-lg px-4 py-4 gap-3 shadow-bloom active:opacity-70"
    >
      <View className="w-9 h-9 rounded-lg bg-surface-mid items-center justify-center">
        <Icon color={glow} />
      </View>
      <View>
        {/* **数を目立たせる**（作者の指示）。案では右上の小さな字だった */}
        <Text className="font-strong text-headline-md text-on-surface leading-none">
          {count == null ? '—' : count}
        </Text>
        <Text className="font-strong text-label-md text-on-surface mt-2">{title}</Text>
        <Text className="text-label-sm text-outline mt-0.5">{sub}</Text>
      </View>
    </Pressable>
  )
}
