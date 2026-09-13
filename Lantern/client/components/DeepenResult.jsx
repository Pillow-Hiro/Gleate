import { Pressable, View } from 'react-native'
import Text from './Text'
import MarginNote from './MarginNote'

// 深掘りの結果（2026-09-13・作者との壁打ち）。
//
// ## 事実と見立てを別の段に置く
//
// 上に「同じ話として読んだ記録」、下に「Gleateの見立て」。
// `CLAUDE.md`「深掘りでは Gleate の見立てを置いてよい」は、見立てを
// **事実とも本人の結論とも混ざらないように置く**と決めている。画面の形で守る。
//
// ## 件数ではなく、記録そのものを見せる
//
// 本人が書いた文が並ぶので、**見当外れなら本人がすぐ気づける。**
// 押すとその日の記録が開く（無料。自分の記録への道に料金をかけない）。
//
// ## AIとは名乗らない
//
// 「Gleateの見立て」と書く。きらめきの記号も付けない。
// 最後に「当てはまらないこともあります。」を添える。
//
// 全画面（`app/deepen.jsx`）と、閉じたあとのカードの下（`ReviewSection`）で
// 同じものを出す。**2つ持つと片方だけ直る。**

/** `2026-09-02` → `9月2日`。**曜日までは要らない**——並べて読むので短く */
export function shortDate(date) {
  const [, m, d] = String(date || '').split('-').map(Number)
  return m && d ? `${m}月${d}日` : String(date || '')
}

export default function DeepenResult({ result, onOpenRecord }) {
  if (!result) return null

  if (!result.found) {
    return (
      <View className="bg-surface-lowest border border-border rounded-lg px-5 py-4">
        <Text className="text-body text-outline leading-relaxed">
          同じ話に見える記録は、見つかりませんでした。
        </Text>
      </View>
    )
  }

  return (
    <View className="bg-surface-lowest border border-border rounded-lg px-5 py-4 gap-4">
      <View className="gap-1">
        <Text className="text-label-sm text-outline">同じ話として読んだ記録</Text>
        {result.records.map((r) => (
          <Pressable
            key={r.id || `${r.date}-${r.excerpt}`}
            onPress={() => onOpenRecord?.(r.date)}
            accessibilityLabel={`${shortDate(r.date)}の記録を開く`}
            className="py-1.5 active:opacity-70"
          >
            <Text className="text-label-sm text-outline">{shortDate(r.date)}</Text>
            <Text className="text-body text-on-surface leading-relaxed">{r.excerpt}</Text>
          </Pressable>
        ))}
      </View>

      <View className="gap-2.5">
        <Text className="text-label-sm text-outline">Gleateの見立て</Text>
        {result.readings.map((reading, i) => (
          <View key={i} className="gap-0.5">
            <Text className="text-body text-on-surface leading-relaxed">{reading.text}</Text>
            <Text className="text-label-sm text-outline">
              {reading.dates.map(shortDate).join('・')}の記録から
            </Text>
          </View>
        ))}
      </View>

      {result.question ? (
        <MarginNote>
          <Text className="text-body text-on-surface-variant leading-relaxed">{result.question}</Text>
        </MarginNote>
      ) : null}

      <Text className="text-label-sm text-outline">当てはまらないこともあります。</Text>
    </View>
  )
}
