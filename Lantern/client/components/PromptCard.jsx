import { Image, Pressable, View } from 'react-native'
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg'
import Text from './Text'
import { useThemeContext } from '../lib/theme'
import { accentColor } from '../lib/accent'

// 今日の問い（2026-09-09・作者の指示「Lantern_2の画像のようにして」）。
//
// ## 案の数値をそのまま写した
//
// 3度、目分量で寄せて外した——大きすぎ、ボタンの裏に回り、認識できない。
// **測らずに寄せていたのが原因。**`lantern_2/code.html` から数値を取った。
//
//     絵        幅いっぱい・高さ 142
//     階調      下から上（本体の色へ溶ける）
//     札        絵の左上（top-3 left-3）
//     見出し    灯り色の小さい字
//     問い      17px・**太くしない**・行送りゆったり
//     行き先    角丸の四角（丸ではない）。左は塗り、右は縁だけ
//
// **問いを太字にしていたのは私の判断で、案は普通の太さ。**
// **絵を横に置いたのも私の読み違いで、案は幅いっぱい。**
//
// ## 案から変えたところ
//
// - **「Day 48」を入れない**——`CLAUDE.md` が Streak を煽る演出を禁じている
// - **説明文を入れない**——案の文は「書き留めてみましょう」で終わる。
//   「〇〇しましょう」は禁句（同）。**代わりの文を私が作らない**
// - 見出しは「今日の灯り」ではなく**「今日の問い」**。
//   Gleate では今日の灯りは別のもの（上の琥珀の面）で、
//   **同じ名前を2つの意味に使わない**
// - 札は「AIの問い」ではなく**「Gleateの問い」**。
//   このアプリは自分のことを AI と呼ばない（`CLAUDE.md`）

// 絵の高さ。案の `h-[142px]` をそのまま
const BAND = 142

// 階調の行き先。`global.css` の `--color-surface-container-lowest`。
// **片方を変えたら両方を変えること**
const SURFACE = { light: '#FFFFFF', dark: '#121415' }

function Pencil({ color }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M12 20h9" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path
        d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export default function PromptCard({ question, onWrite, onIdea }) {
  const { accent, isDark } = useThemeContext()
  const base = isDark ? SURFACE.dark : SURFACE.light
  const glow = accentColor(accent, isDark)

  return (
    <View className="bg-surface-lowest border border-border rounded-md overflow-hidden shadow-bloom">
      <View style={{ height: BAND, overflow: 'hidden' }}>
        {/* **幅いっぱい**（案のとおり）。横に置いていたのは私の読み違い */}
        <Image
          source={
            isDark
              ? require('../assets/prompt-night.jpg')
              : require('../assets/prompt-day.jpg')
          }
          accessibilityLabel="灯りを提げて歩く人"
          style={{ width: '100%', height: BAND }}
          resizeMode="cover"
        />

        {/* 下から本体の色へ溶ける。**絵と本体の境目を消す** */}
        <Svg
          width="100%"
          height={BAND}
          style={{ position: 'absolute', left: 0, top: 0 }}
        >
          <Defs>
            <LinearGradient id="vignette" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor={base} stopOpacity="1" />
              <Stop offset="0.35" stopColor={base} stopOpacity="0.35" />
              <Stop offset="1" stopColor={base} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height={BAND} fill="url(#vignette)" />
        </Svg>

        {/* 札。**絵の左上**（案のとおり）。灯りの点と字だけ */}
        <View className="absolute top-3 left-3 flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/55 border border-outline-variant">
          <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: glow }} />
          <Text className="text-label-sm text-white">Gleateの問い</Text>
        </View>
      </View>

      <View className="px-5 pt-3 pb-5">
        {/* 見出し。案は「今日の灯り / Day 48」。**日数は入れない**（冒頭の節） */}
        <Text className="text-label-sm text-primary mb-2">今日の問い</Text>

        {/* 問い。**太くしない**——案は `font-normal`。
            17px は Gleate の `body-md` と同じ */}
        <Text className="text-body-md text-on-surface leading-relaxed mb-4">
          {question}
        </Text>

        {/* 行き先。案は角丸の四角で、**左が塗り、右が縁だけ** */}
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={onWrite}
            accessibilityLabel={`${question} について書く`}
            className="flex-1 flex-row items-center justify-center gap-2 px-4 py-2.5 rounded bg-lantern-glow active:opacity-80"
          >
            <Pencil color="#1D1D1F" />
            <Text className="font-strong text-label-md text-on-lantern">
              これについて書く
            </Text>
          </Pressable>
          <Pressable
            onPress={onIdea}
            accessibilityLabel="1行で置く"
            className="px-3.5 py-2.5 rounded border border-outline-variant active:opacity-70"
          >
            <Text className="text-label-md text-on-surface-variant">1行で置く</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}
