import { Pressable, View } from 'react-native'
import Text from './Text'

// 「日記の候補」から選んだものを、**紙の上に置く**（2026-09-06・作者の指示）。
//
// ## なぜ本文に入れないのか
//
// それまでは選んだ一行を本文へ差し込んでいた。作者の報告——
// 「曲だったら、曲名とアーティスト名だけが載る」。
// **書く場所に、自分の言葉ではないものが混ざる。**
//
// 添えるものとして扱えば混ざらない。写真・ファイルと同じ場所に並べ、
// **書く場所は書く人のものにしておく。**
//
// ## 見た目
//
// 押せるものにしない。**これは手がかりであって、操作ではない。**
// 外す ✕ だけが押せる。読んで、書きはじめるためのもの。
//
// 1件が複数行のことがある（問い・曲・場所が改行で繋がって来る。
// `JournalingSuggestionsModule.swift`）。**折り返して全部見せる**
// ——省略すると、手がかりとして使えない。
export default function SuggestCards({ items, onRemove }) {
  if (!items || items.length === 0) return null

  return (
    <View className="gap-2 mb-3">
      {items.map((text) => (
        <View
          key={text}
          className="flex-row items-start gap-2 bg-surface-low border border-border rounded-lg px-3 py-2.5"
        >
          <Text className="flex-1 text-label-md text-on-surface-variant leading-relaxed">
            {text}
          </Text>
          <Pressable
            onPress={() => onRemove?.(text)}
            accessibilityLabel={`${text} を外す`}
            hitSlop={10}
            className="min-h-touch justify-center px-1"
          >
            <Text className="text-label-md text-outline">✕</Text>
          </Pressable>
        </View>
      ))}
    </View>
  )
}
