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
// 画面の地（`surface` = #F9F9FB）との段差で浮かせる。
// **影は使わない。** DESIGN.md の Tonal Layers に従う。
export default function LogList({ logs, onDelete, onUpdate, limit }) {
  const shown = limit ? logs.slice(0, limit) : logs
  const groups = groupByMonth(shown)
  const months = Object.keys(groups).sort().reverse()

  return (
    <View className="gap-stack-lg">
      {months.map((month) => {
        const items = groups[month]
        return (
          <View key={month}>
            <Text className="font-strong text-label-md text-on-surface-variant mb-2.5">
              {monthLabel(items[0].date)}
            </Text>
            <View className="bg-surface-lowest rounded-lg px-4">
              {items.map((log, i) => (
                <LogItem
                  key={log.date}
                  log={log}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
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
