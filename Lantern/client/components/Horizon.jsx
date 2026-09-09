import Svg, { Circle, Defs, Line, RadialGradient, Rect, Stop } from 'react-native-svg'
import { accentSwatch } from '../lib/accent'
import { useThemeContext } from '../lib/theme'

// 地平線と、遠くにひとつの灯り（2026-09-09・作者の指示
// 「書くタブの今日の問いカードの下に何かアプリの絵の素材を入れたい」）。
//
// ## なぜ描いたものにしたか
//
// 案を4つ出して、作者が選んだ——「A1がいい。Lanternの光っぽい」。
//
// 写真や美術品も見てもらったが、**あれは全部「何かの絵」で、意味を持つ。**
// 書く画面の下に置くと、**その意味が問いより強くなる。**
// 描いたものなら、意味を持たせない大きさに保てる。
//
// 権利の心配が無く、容量も要らず、**灯りの色をそのまま使える。**
// アクセントを替えれば一緒に変わる（`lib/accent.js`）。
//
// ## 絵として強くしない
//
// 線は細く、灯りは小さく、にじみは薄く。**見るものを増やさない。**
// 問いのカードは書き出させるためのもので、その下に見入るものがあると
// 視線がそこで止まる。**温度だけを足して、目は止めない。**
//
// 明るい地では、にじみはほとんど見えない。**それでよい**
// ——光は暗さがあって初めて光になる（アイコンで通った道）。

// 帯の中の比。**画面の幅に合わせて伸びる**ので、比だけを決める
const RATIO = 120 / 343      // 高さ ÷ 幅
const HORIZON = 0.68         // 地平線の高さ
const LIGHT_X = 0.72         // 灯りの位置。**真ん中に置かない**
const LIGHT_R = 0.026        // 灯りの大きさ（幅に対して）

export default function Horizon({ width }) {
  const { accent, isDark } = useThemeContext()
  const glow = accentSwatch(accent, isDark)
  const h = Math.round(width * RATIO)

  // 地平線。**罫線に見えない濃さ**にする——この画面には他にも線がある
  const line = isDark ? '#3C3C40' : '#E6E2DA'

  return (
    <Svg width={width} height={h} viewBox={`0 0 ${width} ${h}`}>
      <Defs>
        {/* にじみ。暗いほうを濃くする。**明るい地では光は立たない** */}
        <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={glow} stopOpacity={isDark ? 0.34 : 0.18} />
          <Stop offset="1" stopColor={glow} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      <Rect
        x={width * LIGHT_X - h * 0.9}
        y={width * RATIO * HORIZON - h * 0.9}
        width={h * 1.8}
        height={h * 1.8}
        fill="url(#halo)"
      />

      <Line
        x1="0"
        y1={h * HORIZON}
        x2={width}
        y2={h * HORIZON}
        stroke={line}
        strokeWidth="1"
      />

      <Circle cx={width * LIGHT_X} cy={h * HORIZON} r={width * LIGHT_R} fill={glow} />
    </Svg>
  )
}
