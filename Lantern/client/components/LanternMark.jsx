import { View } from 'react-native'
import Svg, { Circle, Line } from 'react-native-svg'

// 灯りのしるし。
//
// デザイン案（`0_login`）は、白い丸の中に小さな光の記号を置いている。
// **絵文字は使わない**（CLAUDE.md）ので図形で描く。
//
// 中心の丸と8本の線だけ。細かくすると小さい寸法で潰れる。
//
// ## 地を暗くする（2026-09-09・作者の指示「画面左上のアイコンも変えて」）
//
// アイコンを暗い地の灯りに変えた（`scripts/build_icon.py`）。
// **しるしだけ明るい地のままだと、同じものに見えない。**
//
// **光は暗さがあって初めて光になる。**明るい地の上では、
// にじみも芯の白抜きも効かない（アイコンを決めるときに試した）。
// だから**しるしごと小さな暗い板に載せる**——アイコンをそのまま
// 小さくしたものになる。
//
// `tile={false}` で昔の形（地なし）にも戻せる。暗い面の上に置くときや、
// 一色で描きたいときに使う。
export default function LanternMark({ size = 28, color = '#FBB03B', tile = true }) {
  if (tile) {
    // 板の大きさに対してしるしは 0.62——アイコンと同じ比
    const inner = Math.round(size * 0.62)
    return (
      <View
        className="items-center justify-center rounded-lg"
        style={{ width: size, height: size, backgroundColor: '#1C1C1E' }}
      >
        <Glyph size={inner} color={color} core />
      </View>
    )
  }
  return <Glyph size={size} color={color} />
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
