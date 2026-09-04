import { useState } from 'react'
import { View } from 'react-native'
import Text from './Text'
import Svg, { Circle, Line, Polyline } from 'react-native-svg'

// recharts はDOM/SVG前提でRNでは動かないため、折れ線を自前で描く。
// Web版と同じ「期間内の再生回数推移」を表現する最小構成。
// 色はNativeWindのトークンではなくSVG属性に直接渡す必要があるため定数で持つ。
const COLORS = {
  // 値は DESIGN.md（lantern-glow / border / outline）
  light: { line: '#FBB03B', grid: 'rgba(0,0,0,0.10)', text: '#847563' },
  dark: { line: '#FFB953', grid: 'rgba(255,255,255,0.12)', text: '#988C7E' },
}

const HEIGHT = 200
const PADDING = { top: 8, right: 8, bottom: 22, left: 34 }

function formatTick(v) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
}

export default function ViewsChart({ data, isDark }) {
  const [width, setWidth] = useState(0)
  const c = COLORS[isDark ? 'dark' : 'light']

  if (data.length === 0) return null

  const plotW = Math.max(width - PADDING.left - PADDING.right, 1)
  const plotH = HEIGHT - PADDING.top - PADDING.bottom
  const max = Math.max(...data.map((d) => d.view_count), 1)

  const x = (i) => PADDING.left + (data.length === 1 ? plotW / 2 : (plotW * i) / (data.length - 1))
  const y = (v) => PADDING.top + plotH - (plotH * v) / max

  const points = data.map((d, i) => `${x(i)},${y(d.view_count)}`).join(' ')

  // 目盛りは0・中間・最大の3本に絞る（狭い画面で潰れないため）
  const ticks = [0, max / 2, max]

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          {ticks.map((t, i) => (
            <Line
              key={i}
              x1={PADDING.left}
              y1={y(t)}
              x2={width - PADDING.right}
              y2={y(t)}
              stroke={c.grid}
              strokeWidth={1}
            />
          ))}
          <Polyline points={points} fill="none" stroke={c.line} strokeWidth={1.5} />
          {data.map((d, i) => (
            <Circle key={i} cx={x(i)} cy={y(d.view_count)} r={3} fill={c.line} />
          ))}
        </Svg>
      ) : (
        <View style={{ height: HEIGHT }} />
      )}

      {/* SVG内のテキストは端末によって描画が揺れるため、軸ラベルは通常のTextで重ねる */}
      <View className="flex-row justify-between mt-1" style={{ paddingLeft: PADDING.left }}>
        <Text className="text-[10px] text-outline">{data[0]?.label}</Text>
        {data.length > 1 ? (
          <Text className="text-[10px] text-outline">{data[data.length - 1]?.label}</Text>
        ) : null}
      </View>
      <Text className="text-[10px] text-outline mt-0.5">最大 {formatTick(max)} 回</Text>
    </View>
  )
}
