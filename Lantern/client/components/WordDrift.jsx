import { useMemo } from 'react'
import { Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'
import Text from './Text'
import { monthDrift } from '../lib/wordDrift'
import { localDateStr } from '../lib/date'

// 語の移り変わり（2026-09-05・作者の選択・分析タブの強化）。
//
// **今月から出てきた言葉と、先月まで出ていた言葉を並べる。**
//
// ## 評価しない
//
// CLAUDE.md「することは2つだけ。記録を並べること。変化を示すこと」の
// 2つ目。**増えた・減った・良くなったとは言わない。**
// 語が入れ替わったという事実だけを置いて、読み方は本人に委ねる。
//
// 「消えた」も使わない。**失ったように読める。**
// 「先月まで出ていた言葉」なら、起きたことだけを言っている。
//
// ## AI を呼ばない
//
// 数えて引き算するだけ（`lib/wordDrift.js`）。頻出キーワードは AI に
// 数えさせていて有料の枠を使うが、こちらは端末の中で終わる。
// **月をまたいで比べるのに、枠を2回分使う理由が無い。**
//
// ## 押すとその語の記録へ
//
// 行き先は「記録」タブの検索（`KeywordSection` と同じ）。
// **探した結果を見る場所を2つ作らない。**
function Words({ title, words, onPick }) {
  if (words.length === 0) return null

  return (
    <View className="gap-2">
      <Text className="text-label-md text-outline">{title}</Text>
      <View className="flex-row flex-wrap gap-2">
        {words.map(({ word, count }) => (
          <Pressable
            key={word}
            onPress={() => onPick(word)}
            accessibilityLabel={`${word} の記録を見る`}
            className="flex-row items-baseline gap-1 border border-outline-variant rounded-full px-3 py-1.5 active:opacity-70"
          >
            <Text className="text-label-md text-on-surface">{word}</Text>
            {/* 回数は添えるが、**多い少ないは言わない** */}
            <Text className="text-label-sm text-outline">{count}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

export default function WordDrift({ logs }) {
  const router = useRouter()
  const month = localDateStr().slice(0, 7)
  const drift = useMemo(() => monthDrift(logs, month), [logs, month])

  const nothing =
    drift.appeared.length === 0 && drift.left.length === 0 && drift.kept.length === 0

  function pick(word) {
    router.navigate(`/journal?q=${encodeURIComponent(word)}`)
  }

  return (
    <View className="gap-4">
      <View>
        <Text className="font-strong text-label-md text-on-surface-variant">言葉の移り変わり</Text>
        <Text className="text-label-md text-outline mt-1">
          先月と今月で、記録に出てくる言葉を並べています。
        </Text>
      </View>

      {nothing ? (
        // **溜まるまで出せないことを言う。**空の枠だけ置くと、
        // 壊れているのか、まだ何も無いのかが分からない
        <View className="bg-surface-low rounded-lg px-5 py-4">
          <Text className="text-label-md text-outline leading-relaxed">
            同じ言葉が月に2回出てくると、ここに並びはじめます。
          </Text>
        </View>
      ) : (
        <View className="bg-surface-lowest rounded-lg px-5 py-5 gap-5 shadow-bloom">
          <Words title="今月から出てきた言葉" words={drift.appeared} onPick={pick} />
          <Words title="先月まで出ていた言葉" words={drift.left} onPick={pick} />
          <Words title="どちらの月にもある言葉" words={drift.kept} onPick={pick} />
        </View>
      )}
    </View>
  )
}
