import { useRef, useState } from 'react'
import { Dimensions, Pressable, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Text from './Text'
import LanternMark from './LanternMark'
import { SLIDES, indexFromOffset, isLast, nextIndex } from '../lib/onboardingSlides'

// 初回だけ出る案内。**3枚めくって終わり。**
//
// 出す場所は起動画面のあと（`app/_layout.jsx`）。写真と一言を見せてから
// 案内に入る。**最初の印象を案内に譲らない。**
//
// ## 画面の上に指を出さない
//
// 実物のタブや欄を暗くして順に指す作りにはしなかった。理解は早いが、
// 画面が変わるたびに位置がずれる。**保守が重い割に、伝える量は同じ。**
//
// ## 飛ばせる
//
// 右上に「スキップ」を置く。読ませたい気持ちで閉じ道を消すと、
// 最初に触れる体験が「閉じられない画面」になる。
export default function Onboarding({ onDone }) {
  const [index, setIndex] = useState(0)
  const scrollRef = useRef(null)
  // **幅は測ってから使う。** `Dimensions` を初期値に置くのは、
  // 最初の描画で `onLayout` が来る前に横幅が要るため
  const [width, setWidth] = useState(Dimensions.get('window').width)

  function go(next) {
    scrollRef.current?.scrollTo({ x: next * width, animated: true })
    setIndex(next)
  }

  return (
    <View className="absolute inset-0 bg-surface">
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        {/* 飛ばす道。**最初から見えている場所に置く** */}
        <View className="flex-row justify-end px-5 pt-2">
          <Pressable onPress={onDone} className="min-h-touch px-2 justify-center active:opacity-70">
            <Text className="text-label-md text-outline">スキップ</Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          onMomentumScrollEnd={(e) =>
            setIndex(indexFromOffset(e.nativeEvent.contentOffset.x, width))
          }
          className="flex-1"
        >
          {SLIDES.map((slide) => (
            <View key={slide.key} style={{ width }} className="flex-1 justify-center px-8">
              <View className="w-full max-w-read self-center gap-6">
                {/* 案内の面は字と同じ流れに置いてある。
                    **板を敷くと見出しの前に四角が立つ**ので敷かない */}
                <LanternMark size={34} tile={false} />
                <Text className="font-display text-headline-md text-on-surface leading-relaxed">
                  {slide.title}
                </Text>
                <Text className="text-body-md text-on-surface-variant leading-relaxed">
                  {slide.body}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View className="px-8 pb-4 gap-6">
          {/* いま何枚目か。**数字ではなく点で出す**（数えさせない） */}
          <View className="flex-row justify-center gap-2">
            {SLIDES.map((slide, i) => (
              <View
                key={slide.key}
                className={`h-1.5 rounded-full ${
                  i === index ? 'w-5 bg-primary' : 'w-1.5 bg-outline-variant'
                }`}
              />
            ))}
          </View>

          <Pressable
            onPress={() => (isLast(index) ? onDone() : go(nextIndex(index)))}
            className="bg-lantern-glow rounded-full py-4 items-center active:opacity-80"
          >
            <Text className="font-strong text-body-md text-on-lantern">
              {isLast(index) ? SLIDES[SLIDES.length - 1].action : '次へ'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  )
}
