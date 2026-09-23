import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, Pressable, View } from 'react-native'
import Text from './Text'
import MarginNote from './MarginNote'
import { splitSentences } from '../lib/sentences'

// 深掘りの結果（2026-09-13 / 2026-09-24・作者との壁打ち）。
//
// ## 主役は見立て（2026-09-24・作者の判断）
//
// 作者から「**記録を並べるのがメインになっている。記録を並べるのはサブで、
// 本質はその記録を読んで、深い見立てを建てることだ**」。
//
// それまでは上に記録を8件まで並べ、下に見立ての候補を2つ置いて選ばせていた。
// いまは**見立てが1つ、いちばん上。**記録は、その見立てがどこに立っているかを
// 示すために、日付だけを下に小さく置く。押すとその日の記録が開く
// （無料。自分の記録への道に料金をかけない）。
//
// ## 出来た文を1文ずつ出す
//
// 作者から「**ロード中だと不安なので、できた文章をフェードインするみたいに**」。
// 届いた見立てを句点で切り、1文ずつ薄く浮かび上がらせる（`lib/sentences.js`）。
// **動きを減らす設定の人には、いきなり全部出す**（`AccessibilityInfo`）。
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

// 1文が現れるまでの間。**速すぎると点滅に見え、遅いと待たされる**
const STEP_MS = 320
const FADE_MS = 420

/** 1文。順番が来たら薄く浮かび上がる */
function Sentence({ text, index, instant }) {
  const opacity = useRef(new Animated.Value(instant ? 1 : 0)).current

  useEffect(() => {
    if (instant) {
      opacity.setValue(1)
      return
    }
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: FADE_MS,
      delay: index * STEP_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    })
    animation.start()
    return () => animation.stop()
  }, [index, instant, opacity])

  return (
    <Animated.View style={{ opacity }}>
      <Text className="text-body-md text-on-surface leading-loose">{text}</Text>
    </Animated.View>
  )
}

/** 見立て。**届いてから1文ずつ出す** */
function Reading({ text }) {
  const [instant, setInstant] = useState(false)

  useEffect(() => {
    let cancelled = false
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((reduce) => { if (!cancelled && reduce) setInstant(true) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return (
    <View className="gap-1.5">
      {splitSentences(text).map((sentence, i) => (
        <Sentence key={i} text={sentence} index={i} instant={instant} />
      ))}
    </View>
  )
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
    <View className="gap-3">
      {/* **見立ての枠**（2026-09-14・作者から「見立て部分からも枠で囲いましょう。
          どこから見立てなのか分かりません」）。
          見立ては Gleate の言葉なので、振り返りの観察と同じ砂色の面に置く */}
      <View className="bg-ai-surface/60 border border-ai-ink/20 rounded-lg px-5 py-5 gap-3">
        <Text className="text-label-sm text-ai-ink">Gleateの見立て</Text>
        <Reading text={result.reading} />

        {result.question ? (
          <MarginNote>
            <Text className="text-body text-on-surface-variant leading-relaxed">{result.question}</Text>
          </MarginNote>
        ) : null}

        <Text className="text-label-sm text-outline">当てはまらないこともあります。</Text>
      </View>

      {/* 見立てが立っている記録。**本人が書いた文なので、見当外れならすぐ気づける** */}
      {result.records?.length ? (
        <View className="gap-1.5">
          <Text className="text-label-sm text-outline">この見立てが立っている記録</Text>
          {result.records.map((r) => (
            <Pressable
              key={r.id || `${r.date}-${r.excerpt}`}
              onPress={() => onOpenRecord?.(r.date)}
              accessibilityLabel={`${shortDate(r.date)}の記録を開く`}
              className="flex-row gap-2.5 py-1.5 active:opacity-70"
            >
              <Text className="text-label-sm text-outline w-16">{shortDate(r.date)}</Text>
              <Text className="flex-1 text-label-md text-on-surface-variant leading-relaxed">
                {r.excerpt}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  )
}
