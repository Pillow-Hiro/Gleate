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
// 線は細く、灯りは小さく。**見るものを増やさない。**
// 問いのカードは書き出させるためのもので、その下に見入るものがあると
// 視線がそこで止まる。**温度だけを足して、目は止めない。**
//
// ## ただし、無くてはいけない（2026-09-09）
//
// 最初はにじみも薄くした。作者から——「薄くて見えないです」。
//
// **「強くしない」を大事にしすぎて、何も見えないところまで引いていた。**
// 控えめであることと、無いことは違う。4段階を並べて見比べ、
// **見えるいちばん静かな濃さ**を選び直した（下の数）。

// 帯の中の比。**画面の幅に合わせて伸びる**ので、比だけを決める
const RATIO = 120 / 343      // 高さ ÷ 幅
const HORIZON = 0.68         // 地平線の高さ
const LIGHT_X = 0.72         // 灯りの位置。**真ん中に置かない**
const LIGHT_R = 0.042        // 灯りの大きさ（幅に対して）
const HALO_R = 0.24          // にじみの広がり（幅に対して）

// にじみの濃さ。**一度これを薄くしすぎた**（2026-09-09・作者から
// 「薄くて見えないです」）。
//
// 「絵として強くしない」を大事にしすぎて、**何も見えない**ところまで
// 引いていた。控えめであることと、無いことは違う。
//
// 4段階を並べて選んだ。明るい地では琥珀が白に負けるので、
// **暗い側より濃く要る**わけではない——白の上は広がって見えるので
// 少し抑える。数はそれぞれ画面で確かめたもの。
const HALO_LIGHT = 0.54
const HALO_DARK = 0.75

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
          <Stop offset="0" stopColor={glow} stopOpacity={isDark ? HALO_DARK : HALO_LIGHT} />
          <Stop offset="0.55" stopColor={glow} stopOpacity={(isDark ? HALO_DARK : HALO_LIGHT) * 0.42} />
          <Stop offset="1" stopColor={glow} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* にじみ。**幅に対して広がる**ので、帯の外にはみ出す分は切られる */}
      <Rect
        x={width * (LIGHT_X - HALO_R)}
        y={h * HORIZON - width * HALO_R}
        width={width * HALO_R * 2}
        height={width * HALO_R * 2}
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
