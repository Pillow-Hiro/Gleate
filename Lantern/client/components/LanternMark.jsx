import Svg, { Circle, Line } from 'react-native-svg'

// 灯りのしるし。
//
// デザイン案（`0_login`）は、白い丸の中に小さな光の記号を置いている。
// **絵文字は使わない**（CLAUDE.md）ので図形で描く。
//
// 中心の丸と8本の線だけ。細かくすると小さい寸法で潰れる。
export default function LanternMark({ size = 28, color = '#FBB03B' }) {
  const c = size / 2
  const r = size * 0.18
  const inner = size * 0.3
  const outer = size * 0.46
  const rays = [0, 45, 90, 135, 180, 225, 270, 315]

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={c} cy={c} r={r} fill={color} />
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
