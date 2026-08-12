import { ScrollView, View } from 'react-native'
import Text from './Text'
import { buildYearGrid, monthTicks } from '../lib/yearMap'
import { todayStr } from '../lib/date'

// 1年分の記録の有無を格子で見せる。
//
// **2状態しか持たない。** 記録あり（琥珀）／なし（地の段差）。
// 濃淡で「たくさん書いた日」を強調しない。
// CLAUDE.md「記録が多い＝良い、という価値観を作らない」。
// **階調を入れた瞬間、薄い日が「足りない日」に見える。**
//
// 数字を添えない。「今年◯日」「達成率◯%」は書かない。
// 見て分かることに言葉を足すと、それは評価になる。
//
// 組み立ては `lib/yearMap.js`。描画から切り離して vitest で検査している。
const CELL = 10
const GAP = 3

export default function YearMap({ logs }) {
  const today = todayStr()
  const grid = buildYearGrid(logs.map((l) => l.date), today)
  const ticks = monthTicks(grid)

  return (
    <View>
      <Text className="font-strong text-label-md text-on-surface-variant mb-2.5">
        記録した日
      </Text>

      {/* 横に長いので、狭い画面では右へ流す。
          **右端（＝今日に近い側）から見せる。** 過去の端から始めると、
          いま自分がどこにいるのかを探すことになる */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: 'column' }}
      >
        <View className="flex-row" style={{ gap: GAP, marginBottom: 4 }}>
          {grid.map((_, i) => {
            const tick = ticks.find((t) => t.index === i)
            return (
              <View key={i} style={{ width: CELL }}>
                {tick ? (
                  <Text className="font-label text-label-sm text-outline" numberOfLines={1}>
                    {tick.label}
                  </Text>
                ) : null}
              </View>
            )
          })}
        </View>

        <View className="flex-row" style={{ gap: GAP }}>
          {grid.map((week, wi) => (
            <View key={wi} style={{ gap: GAP }}>
              {week.map((cell) => (
                <View
                  key={cell.date}
                  className={
                    cell.isFuture
                      ? 'bg-transparent'
                      : cell.hasLog
                        ? 'bg-lantern-glow'
                        : 'bg-surface-high'
                  }
                  style={{ width: CELL, height: CELL, borderRadius: 2 }}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}
