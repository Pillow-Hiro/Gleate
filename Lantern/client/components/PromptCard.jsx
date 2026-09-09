import { Image, Pressable, View } from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import Text from './Text'
import { useThemeContext } from '../lib/theme'

// 今日の問い（2026-09-09・作者の指示「イラストが背面にある感じ」）。
//
// ## 絵は背面に置く
//
// 案（`lantern_1`）は、**絵を右に置いて左へ溶かしている。**
// 上に帯として載せるのではなく、字の後ろに回り込む。
//
// それまでは幅いっぱいの帯を頭に置いていた。**絵が主で、問いが従**に
// なっていた。問いを読ませる面なので、そこは逆でなければいけない。
//
// ## にじませ方
//
// `expo-linear-gradient` は入っていない。**依存を増やさない**
// （増やすと指紋が変わり、配信で届かなくなる）ので、
// 既にある `react-native-svg` で階調を描く。
//
// 左は面の色で塗りつぶし、右へ向かって透ける。**字のある側は必ず
// 読める**——絵の明暗に関わらず、下地が面の色になる。
//
// ## 面の色を直に書いている理由
//
// 階調の始まりの色が要るが、CSS 変数は JS から読めない。
// `global.css` の `--color-surface-container-lowest` と同じ値を写した。
// **片方を変えたら両方を変えること。**
const SURFACE = { light: '#FFFFFF', dark: '#121415' }

// 絵の高さ。**問いより大きくしない**（2026-09-09・作者から
// 「写真のサイズが大きすぎる」と言われた寸法から下げてある）
const BAND = 150

export default function PromptCard({ question, onWrite, onIdea }) {
  const { isDark } = useThemeContext()
  const base = isDark ? SURFACE.dark : SURFACE.light

  return (
    <View className="bg-surface-lowest border border-border rounded-lg overflow-hidden shadow-bloom">
      <View style={{ height: BAND }}>
        {/* 絵。**右に寄せる。**人物が中央に来ると字と重なる */}
        <Image
          source={
            isDark
              ? require('../assets/prompt-night.jpg')
              : require('../assets/prompt-day.jpg')
          }
          accessibilityLabel="灯りを提げて歩く人"
          style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '78%' }}
          resizeMode="cover"
        />

        {/* 左から面の色。**字の下は必ず読める** */}
        <Svg
          width="100%"
          height={BAND}
          style={{ position: 'absolute', left: 0, top: 0 }}
        >
          <Defs>
            <LinearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={base} stopOpacity="1" />
              <Stop offset="0.42" stopColor={base} stopOpacity="0.92" />
              <Stop offset="0.78" stopColor={base} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height={BAND} fill="url(#fade)" />
        </Svg>

        {/* 問い。**絵の上ではなく、溶けた面の上に置く** */}
        <View className="flex-1 justify-center px-5" style={{ width: '68%' }}>
          <Text className="font-strong text-body-lg text-on-surface leading-relaxed">
            {question}
          </Text>
        </View>
      </View>

      {/* 2つの行き先。**どちらも面は塗らない**——`CLAUDE.md`
          「1画面に灯り色を2箇所以上置かない」（この画面の塗りは今日の灯り） */}
      <View className="flex-row gap-2.5 px-5 pb-5 pt-1">
        <Pressable
          onPress={onWrite}
          accessibilityLabel={`${question} について書く`}
          className="flex-1 border border-lantern-glow rounded-full py-2.5 items-center active:opacity-70"
        >
          <Text className="font-strong text-label-md text-primary">これについて書く</Text>
        </Pressable>
        <Pressable
          onPress={onIdea}
          accessibilityLabel="1行で置く"
          className="border border-outline-variant rounded-full px-4 py-2.5 items-center active:opacity-70"
        >
          <Text className="text-label-md text-on-surface-variant">1行で置く</Text>
        </Pressable>
      </View>
    </View>
  )
}
