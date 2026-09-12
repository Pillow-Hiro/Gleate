import { useMemo } from 'react'
import { Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'
import Text from './Text'
import { topWords } from '../lib/wordDrift'
import { localDateStr } from '../lib/date'

// よく書いている言葉（2026-09-12・作者の指示「3にしてから2を採用」）。
//
// ## 2つを1つにした
//
// それまで同じ顔のものが2つあった。
//
//     頻出キーワード      記録タブ   Claude が抽出   有料
//     言葉の移り変わり     分析タブ   端末の中で計算   無料
//
// どちらも語の粒を並べ、押すと記録の検索へ飛ばす。**役割は別**
// （断面と差分）だが、**置き場所が離れていて、見た目が同じ。**
//
// まとめて、**断面の中に差分の印を乗せた。**「よく書いている言葉」を
// 件数の多い順に出し、**先月に無かった語へ点を付ける。**
//
// ## 記録タブに置く
//
// 語を押した行き先がこのタブの検索なので、**分析から飛ばす必要が
// 無くなる。**分析に残るのは数と、繋いだ場所の読み解き。
//
// ## Claude をやめた
//
// 頻出キーワードは出現回数まで Claude に数えさせていた。
// **言語モデルは数を数えられない。**出ていた回数は、数えた結果では
// なくそれらしい数だった。`Map` で数えれば必ず合う。
//
// 加えて、**3ヶ月ぶんの記録本文を API へ送っていた。**語を数えるために。
// 端末の中で数えれば送らなくて済む（`lib/wordDrift.js`）。
//
// 失ったのは**平仮名の語と動詞**。漢字2字以上・カタカナ2字以上・
// 英数字しか拾わないので、「ちいかわ」のような語は落ちる。
// **粗いことを承知で、正確さと引き換えにしている。**
//
// ## 数えるのは「打った回数」ではなく「記録の数」
//
// 2026-09-13・作者から「1個の記録に何度もカウントしている例もあった」。
//
// 壊れていたのは数字の見た目だけではない。下限の `min = 2` は
// **「繰り返し出てくる語だけ出す」**という線のつもりだったが、回数で
// 数えると**1件の記録に同じ語を2回書けば通る。**その日いちど強く
// 書いただけの語が、何か月も続いている語と同じ顔で並んでいた。
//
// 件数なら `min = 2` は「2件以上の記録に出てきた」になる。
// **線の意味と、線の効きが一致する**（`lib/wordDrift.js`）。
//
// ## 評価しない
//
// 「増えた」「減った」「消えた」とは言わない。**「先月まで出ていた
// 言葉」**なら、起きたことだけを言っている（`CLAUDE.md`）。

function Chip({ word, count, isNew, onPick }) {
  return (
    <Pressable
      onPress={() => onPick(word)}
      accessibilityLabel={`${word} の記録を見る`}
      className="flex-row items-center gap-1.5 bg-surface-low rounded-full px-3 py-1.5 active:opacity-70"
    >
      {/* 先月に無かった語。**点だけ。**「NEW」とは書かない
          ——新しいことが良いことのように読める */}
      {isNew ? <View className="w-1.5 h-1.5 rounded-full bg-lantern-glow" /> : null}
      <Text className="text-label-md text-on-surface">{word}</Text>
      {count ? <Text className="text-label-sm text-outline">{count}</Text> : null}
    </Pressable>
  )
}

export default function WordsSection({ logs }) {
  const router = useRouter()
  const month = localDateStr().slice(0, 7)
  const { top, left } = useMemo(() => topWords(logs, month), [logs, month])

  function pick(word) {
    router.navigate(`/journal?q=${encodeURIComponent(word)}`)
  }

  return (
    <View className="gap-4">
      <View>
        <Text className="font-strong text-label-md text-primary">よく書いている言葉</Text>
        <Text className="text-label-md text-outline mt-1">
          今月の記録から。数はその言葉が出てきた記録の数で、
          点が付いているのは先月には無かった言葉です。
        </Text>
      </View>

      {top.length === 0 && left.length === 0 ? (
        // **溜まるまで出せないことを言う。**空の枠だけ置くと、
        // 壊れているのか、まだ何も無いのかが分からない
        <View className="bg-surface-low rounded-lg px-5 py-4">
          <Text className="text-label-md text-outline leading-relaxed">
            同じ言葉が月に2件の記録に出てくると、ここに並びはじめます。
          </Text>
        </View>
      ) : (
        <View className="bg-surface-lowest border border-border rounded-lg px-5 py-5 gap-5 shadow-bloom">
          {top.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {top.map((w) => (
                <Chip key={w.word} {...w} onPick={pick} />
              ))}
            </View>
          ) : null}

          {left.length > 0 ? (
            <View className="gap-2">
              <Text className="text-label-md text-outline">先月まで出ていた言葉</Text>
              <View className="flex-row flex-wrap gap-2">
                {left.map((w) => (
                  <Chip key={w.word} word={w.word} onPick={pick} />
                ))}
              </View>
            </View>
          ) : null}
        </View>
      )}
    </View>
  )
}
