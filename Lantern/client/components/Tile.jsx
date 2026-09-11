import { Pressable, View } from 'react-native'
import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg'
import Text from './Text'
import { useThemeContext } from '../lib/theme'
import { accentColor } from '../lib/accent'
import Symbol from './Symbol'

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

// 記号は**タブと同じもの**（2026-09-09／2026-09-11・作者の指示
// 「記号の形をタブのアイコンと同じにしてください」「記録タブの
// アイコンに合わせてください」）。
//
// ## 描き写すのをやめた（2026-09-11）
//
// タブは SF Symbols を native で出している（`app/(tabs)/_layout.jsx`）
// ——記録が `book.closed`、書くが `pencil`。ここまでは**同じ絵柄を
// SVG で描き写していた。**
//
// **同じ指示が二度出た。**描き写しでは合っていない、ということ。
// `expo-symbols` で本物を出すようにした（`components/Symbol.jsx`）。
// iOS 以外では、これまでの SVG がそのまま落ち先になる。

export function Back({ color }) {
  return <Symbol name="book.closed" size={20} color={color} fallback={<BackDrawn color={color} />} />
}

function BackDrawn({ color }) {
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
  return <Symbol name="pencil" size={20} color={color} fallback={<BulbDrawn color={color} />} />
}

function BulbDrawn({ color }) {
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

// 日替わりの抜粋の見出し。**これも記録タブと同じもの**
// （2026-09-11・作者の指示）。開いた本を描いていたが、指しているのは
// 同じ「記録」なので、形が違うと繋がりが読めない。
export function Book({ color }) {
  return <Symbol name="book.closed" size={16} color={color} fallback={<BookDrawn color={color} />} />
}

function BookDrawn({ color }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
      <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
    </Svg>
  )
}

// 節の見出しに添える2つ（2026-09-11・作者の指示
// 「今日の灯り、今週の発見にもそれぞれアイコンをつけてください」）。
//
// **どちらもタブには無い記号。**タブと同じ名前を使えるものは
// そちらに揃えるが（`Back` `Bulb` `Book`）、この2つは画面の中にしか
// 無い節なので、意味の近い SF Symbols を選んだ。
//
// - 今日の灯り … `lightbulb`。**灯りそのもの。**
//   このアプリで閃きを指すのは「アイデアの種」で、そちらは `pencil`。
//   役目が被らないので取り違えられない
// - 今週の発見 … `magnifyingglass`。**近くで見る、という意味だけ。**
//   `sparkles` は機械が書いたものの記号として広まっていて、
//   ここは AI を使っていない（`WeeklyDiscovery.jsx`）ので使わない。
//   `eye` も避けた——**見られている側の記号**に見える

export function Lamp({ color, size = 16 }) {
  return (
    <Symbol
      name="lightbulb"
      size={size}
      color={color}
      fallback={
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.4.9 1 .9 1.7V18h5.2v-2.4c0-.7.3-1.3.9-1.7A6 6 0 0012 3z"
            stroke={color}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      }
    />
  )
}

export function Lens({ color, size = 16 }) {
  return (
    <Symbol
      name="magnifyingglass"
      size={size}
      color={color}
      fallback={
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth="1.9" />
          <Path d="M16.2 16.2L21 21" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
        </Svg>
      }
    />
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
