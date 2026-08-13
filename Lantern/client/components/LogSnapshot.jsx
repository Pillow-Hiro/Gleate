import { Image, View } from 'react-native'
import Text from './Text'
import RichText from './RichText'

// 1日の記録を1枚のカードで見せる。過去と今日を並べる用途で使う。
// 記録が無い場合の文言は、空白期間の長さに触れない（AI憲法：離脱期間に言及しない）。
const SNAPSHOT_FIELDS = [
  { key: 'created', label: null },
  { key: 'enjoyable', label: 'よかったこと' },
  { key: 'struggled', label: '困ったこと' },
  { key: 'next', label: '次にやること' },
]

// **カードに flex-1 を付けないこと。**
//
// 2026-08-08 まで付いていた。横に並べていた頃（Web版）の名残で、
// 幅を等分するための指定だった。縦積みに変えたあとも残っていたため、
// 2枚が同じ高さに揃えられ、**中身の多い方がカードからはみ出していた**。
// 実機では「次にやること」がカードの外へ出て、文字が重なって見えた。
//
// 中身の分だけ伸びればよい。2枚の高さを揃える理由は無い。
export default function LogSnapshot({ log, dateHint, isToday }) {
  const hasText = SNAPSHOT_FIELDS.some(({ key }) => log?.[key])

  return (
    <View className="bg-stone/40 rounded-lg px-4 py-4 gap-2.5">
      <Text className="text-[10px] text-ink-faint tracking-[1px]">{log ? log.date : dateHint}</Text>
      {!log ? (
        <Text className="text-body text-ink-faint">
          {isToday ? '今日の記録はまだありません。' : 'この時期の記録はありません。'}
        </Text>
      ) : (
        <>
          {SNAPSHOT_FIELDS.map(({ key, label }) =>
            log[key] ? (
              <View key={key}>
                {label ? <Text className="text-[9px] text-ink-faint mb-0.5">{label}</Text> : null}
                <RichText text={log[key]} className="text-body text-ink leading-relaxed" />
              </View>
            ) : null
          )}
          {/* 記録はあるのにテキストが無い＝写真だけの記録。
              日付だけのカードにせず、その日に残したものを見せる。 */}
          {!hasText ? (
            log.photo_thumb_url ? (
              <Image
                source={{ uri: log.photo_thumb_url }}
                className="w-full rounded"
                style={{ height: 128 }}
                resizeMode="cover"
              />
            ) : (
              <Text className="text-body text-ink-faint">この日の記録があります。</Text>
            )
          ) : null}
        </>
      )}
    </View>
  )
}
