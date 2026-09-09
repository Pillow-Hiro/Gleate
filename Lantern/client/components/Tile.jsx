import { Pressable, View } from 'react-native'
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg'
import Text from './Text'
import { useThemeContext } from '../lib/theme'
import { accentSwatch } from '../lib/accent'

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

export function Back({ color }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M3 3v5h5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="12 7 12 12 15 15" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function Bulb({ color }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <Line x1="9" y1="21" x2="15" y2="21" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
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
  const glow = accentSwatch(accent, isDark)

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
