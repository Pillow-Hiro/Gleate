import Svg, { Circle, Line } from 'react-native-svg'
import { useThemeContext } from '../lib/theme'

// 灯りのしるし。
//
// デザイン案（`0_login`）は、白い丸の中に小さな光の記号を置いている。
// **絵文字は使わない**（CLAUDE.md）ので図形で描く。
//
// 中心の丸と8本の線だけ。細かくすると小さい寸法で潰れる。
//
// ## 板は敷かない（2026-09-09・作者の指示
// 「左上のしるしは白のとき、黒い板いらないです」）
//
// 一度、小さな暗い板に載せた——アイコンを暗い地に変えたので、
// **しるしだけ明るいままだと同じものに見えない**と考えたため。
// **画面の上では余計だった。**明るい紙の上に黒い四角がひとつ立つ。
//
// 代わりに、**暗いテーマのときだけ芯を白く抜く。**
// そこでは画面そのものが暗い地なので、板を敷かなくても光源に見える
// ——アイコンと同じ理屈で、板の役は画面がしている。
//
// **明るいテーマでは何もしない。**光は暗さがあって初めて光になるので、
// 白い紙の上で芯を抜いても濁るだけ。
export default function LanternMark({ size = 28, color = '#FBB03B' }) {
  const { isDark } = useThemeContext()
  return <Glyph size={size} color={color} core={isDark} />
}

function Glyph({ size, color, core = false }) {
  const c = size / 2
  const r = size * 0.18
  const inner = size * 0.3
  const outer = size * 0.46
  const rays = [0, 45, 90, 135, 180, 225, 270, 315]

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={c} cy={c} r={r} fill={color} />
      {/* 芯の白抜き。**平らな記号ではなく光源に見える**——
          アイコンと同じ（`scripts/build_icon.py` の `draw_core`）。
          にじみは描かない。小さい寸法では滲んで濁るだけ */}
      {core ? <Circle cx={c} cy={c} r={r * 0.52} fill="#FFEECA" /> : null}
      {rays.map((deg) => {
        const rad = (deg * Math.PI) / 180
        return (
          <Line
            key={deg}
            x1={c + Math.cos(rad) * inner}
            y1={c + Math.sin(rad) * inner}
            x2={c + Math.cos(rad) * outer}
            y2={c + Math.sin(rad) * outer}
            stroke={color}
            strokeWidth={size * 0.07}
            strokeLinecap="round"
          />
        )
      })}
    </Svg>
  )
}
