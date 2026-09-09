import { useState } from 'react'
import { Image, Pressable, View } from 'react-native'
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
// ## 絵は Apple が置いている（2026-09-09）
//
// 一度は「絵は出せない」と書いた。**間違い。**Apple Music に
// 取りに行く必要は無く、**`JournalingSuggestion.Song.artwork` が
// 端末の中のファイルを指している**（`Podcast.artwork`、
// `GenericMedia.appIcon`、`StateOfMind.icon` も同じ）。
//
// **外へ何も聞かずに、Apple と同じ絵が出せる。**
// 名前は Apple の資料で確かめた——当てずっぽうではない。
//
// **道だけ覚えて、中身は持たない。**いつか消えることがあるので、
// 読めなければ記号に戻す（`Art` の `onError`）。
//
// ## 純正の部品は無い
//
// 作者から「Apple 純正のコンポーネントにしたい」と言われて調べた。
// 公開されているのは**選ぶための `JournalingSuggestionsPicker` だけ**で、
// **選んだものを見せる部品は無い**（Apple の「ジャーナル」は非公開の UI）。
// だから自分で組む。絵が手に入るので、見た目はかなり近づく。
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

function Note({ color }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18V5l11-2v13" stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
      <Circle cx="6" cy="18" r="3" stroke={color} strokeWidth="1.7" />
      <Circle cx="17" cy="16" r="3" stroke={color} strokeWidth="1.7" />
    </Svg>
  )
}

function Pin({ color }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21c4-4.6 6-7.8 6-10.4A6 6 0 006 10.6C6 13.2 8 16.4 12 21z"
        stroke={color}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="10.4" r="2.1" stroke={color} strokeWidth="1.7" />
    </Svg>
  )
}

function Heart({ color }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20s-7-4.4-7-9.2A4 4 0 0112 8.6 4 4 0 0119 10.8C19 15.6 12 20 12 20z"
        stroke={color}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
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

// **Swift が種類を言ってくるので、記号を分けられる**（2026-09-07）。
// 言えなかったころは丸ひとつだった——**音符を出しておいて場所だった、
// では嘘になる**ので出せなかった。
const SIGNS = {
  [CARD.ask]: Ask,
  [CARD.song]: Note,
  [CARD.podcast]: Note,
  [CARD.media]: Note,
  [CARD.place]: Pin,
  [CARD.mood]: Heart,
}

const INK = '#847563'

/// 絵。**読めなければ何も描かない**——枠だけ残ると壊れて見える
function Art({ uri }) {
  const [gone, setGone] = useState(false)
  if (!uri || gone) return null
  return (
    <Image
      source={{ uri }}
      onError={() => setGone(true)}
      className="w-12 h-12 rounded-lg bg-surface-high"
      resizeMode="cover"
    />
  )
}

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
          {/* **絵があれば絵。**Apple の「ジャーナル」と同じ並び
              ——絵が左、題名が主、種類は絵が語る */}
          {card.art ? (
            <Art uri={card.art} />
          ) : (
            <View className="pt-0.5">
              {(() => {
                // **知らない種類は丸。**嘘を言わない側に倒す
                const Sign = SIGNS[card.kind] || Dot
                return <Sign color={INK} />
              })()}
            </View>
          )}
          <View className="flex-1 justify-center">
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
