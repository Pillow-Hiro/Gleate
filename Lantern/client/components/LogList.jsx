import { View } from 'react-native'
import Text from './Text'
import LogItem from './LogItem'
import { groupByMonth, monthLabel } from '../lib/format'

// 記録の一覧。**「最近」と「記録」が同じものを使う。**
//
// 2026-08-12 に部品として切り出した。それまで一覧の作りは
// `journal.jsx` の中に直接書かれていた。2画面で使うので、
// 置いたままだと片方だけ直る。
//
// ## かたち
//
// 月ごとに見出しを置き、その月の記録を**1枚のカードにまとめて**、
// 中を区切り線で分ける。
//
// **`DESIGN.md` は "Diary Entry List: Avoid cards" と書いている。**
// 2026-08-12 に作者が「カードあり・区切り線・抜粋2行」と決めたので、
// そちらに従っている。**仕様と食い違うのは承知のうえ。**
// 同梱のデザイン案の Settings 画面が同じ作り（1枚のカードの中を
// 区切り線で分ける）なので、案の中で孤立した形にはなっていない。
//
// カードの地は `surface-lowest`（明るいテーマで純白）。
//
// **2026-08-14 に区分けを強めた。** 実機で「視認性が悪い」と言われた。
// 白い地に白いカードで、段差が `#F9F9FB` と `#FFFFFF` の差しか無く、
// **どこからどこまでが1か月なのかが見えていなかった。**
//
// 足したのは3つ。
//
// 1. 月の見出しに**灯りの点**を添える。月の始まりが目で拾える
// 2. カードに**輪郭**を付ける。地の差だけに頼らない
// 3. 影（`shadow-bloom`）を敷く。DESIGN.md は Tonal Layers を基本とするが、
//    **上限として `shadow-bloom` を許している**（CLAUDE.md）
export default function LogList({ logs, onDelete, onUpdate, onToggleFavorite, limit }) {
  const shown = limit ? logs.slice(0, limit) : logs
  const groups = groupByMonth(shown)
  const months = Object.keys(groups).sort().reverse()

  return (
    <View className="gap-stack-lg">
      {months.map((month) => {
        const items = groups[month]
        return (
          <View key={month}>
            <View className="flex-row items-center gap-2 mb-2.5">
              <View className="w-1.5 h-1.5 rounded-full bg-lantern-glow" />
              <Text className="font-strong text-label-md text-on-surface-variant">
                {monthLabel(items[0].date)}
              </Text>
              <View className="flex-1 h-[1px] bg-border" />
            </View>
            <View className="bg-surface-lowest border border-border rounded-lg px-4 shadow-bloom">
              {items.map((log, i) => (
                <LogItem
                  key={log.date}
                  log={log}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                  onToggleFavorite={onToggleFavorite}
                  isLast={i === items.length - 1}
                />
              ))}
            </View>
          </View>
        )
      })}
    </View>
  )
}
