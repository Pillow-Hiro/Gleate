import { Pressable, View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import Text from './Text'
import { CARD, readCards } from '../lib/suggestCard'

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
// ## 見た目は Apple の「ジャーナル」に合わせた
//
// 作者から画面をもらった。あちらは**題名が主、種類が従。**
// 題名を大きく、添え字を下に小さく。外す ✕ が右上。
//
// **絵は出せない。**Apple Music の絵を出すには取りに行くことになり、
// 「何を聴いていたか」を外へ知らせる通信を足すことになる
// （`lib/attachLink.js` の決め）。**出せないものを、出せるふりで
// 枠だけ描かない。**字だけで、字が読みやすいように組む。
//
// ## 押せるものにしない
//
// **これは手がかりであって、操作ではない。**外す ✕ だけが押せる。
// 読んで、書きはじめるためのもの。

function Ask({ color }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.6" />
      <Path
        d="M9.6 9.3a2.5 2.5 0 114.3 1.9c-.8.7-1.4 1.2-1.4 2.1"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <Circle cx="12.4" cy="16.4" r="0.9" fill={color} />
    </Svg>
  )
}

function Dot({ color }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="4.2" stroke={color} strokeWidth="1.6" />
    </Svg>
  )
}

const INK = '#847563'

export default function SuggestCards({ items, onRemove }) {
  const cards = readCards(items)
  if (cards.length === 0) return null

  return (
    <View className="gap-2 mb-3">
      {cards.map((card) => (
        <View
          key={`${card.source}::${card.line}`}
          className="flex-row items-start gap-2.5 bg-surface-low border border-border rounded-xl px-3.5 py-3"
        >
          <View className="pt-0.5">
            {card.kind === CARD.ask ? <Ask color={INK} /> : <Dot color={INK} />}
          </View>
          <View className="flex-1">
            {/* **題名が主。**Apple の並びに合わせた */}
            <Text className="text-body-md text-on-surface leading-relaxed">
              {card.title}
            </Text>
            {card.sub ? (
              <Text className="text-label-md text-outline mt-0.5">{card.sub}</Text>
            ) : null}
          </View>
          <Pressable
            onPress={() => onRemove?.(card.source)}
            accessibilityLabel={`${card.title} を外す`}
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
