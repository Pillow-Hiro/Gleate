import { Text, View } from 'react-native'

// 1日の記録を1枚のカードで見せる。過去と今日を並べる用途で使う。
// 記録が無い場合の文言は、空白期間の長さに触れない（AI憲法：離脱期間に言及しない）。
const SNAPSHOT_FIELDS = [
  { key: 'created', label: null },
  { key: 'enjoyable', label: 'よかったこと' },
  { key: 'struggled', label: '困ったこと' },
  { key: 'next', label: '次にやること' },
]

export default function LogSnapshot({ log, dateHint, isToday }) {
  return (
    <View className="bg-stone/40 rounded-xl px-4 py-4 flex-1 gap-2.5">
      <Text className="text-[10px] text-ink-faint tracking-[1px]">{log ? log.date : dateHint}</Text>
      {!log ? (
        <Text className="text-sm text-ink-faint">
          {isToday ? '今日の記録はまだありません。' : 'この時期の記録はありません。'}
        </Text>
      ) : (
        SNAPSHOT_FIELDS.map(({ key, label }) =>
          log[key] ? (
            <View key={key}>
              {label ? <Text className="text-[9px] text-ink-faint mb-0.5">{label}</Text> : null}
              <Text className="text-sm text-ink leading-relaxed">{log[key]}</Text>
            </View>
          ) : null
        )
      )}
    </View>
  )
}
