import { useEffect, useState } from 'react'
import { View } from 'react-native'
import Text from './Text'
import { getLight, isLighting, subscribeLight } from '../lib/lightBuffer'

// その日の灯り。**書く紙の外に出した**（2026-09-03）。
//
// 記録は全画面で書いて、書き終えると閉じる（`app/write.jsx`）。
// 灯りは保存の十数秒あとに届くので、**書いていた画面はもう無い。**
// 受け皿（`lib/lightBuffer.js`）を見ているのはここになった。
//
// 受け皿をそのまま映す。**独自に覚えない。**
// 保存し直すと受け皿は空になる（`forgetLight`）ので、ここも空になり、
// 続けて「ともしています」に変わる。前の灯りを残すと、
// **新しく書いた記録に古い返事が付いている**ように見える。
export default function LightCard({ date }) {
  const [light, setLight] = useState(() => getLight(date) || '')
  const [lighting, setLighting] = useState(() => isLighting(date))

  useEffect(() => {
    function sync() {
      setLight(getLight(date) || '')
      setLighting(isLighting(date))
    }
    sync()
    return subscribeLight(sync)
  }, [date])

  if (light) {
    return (
      <View className="bg-ai-surface rounded-lg px-5 py-4">
        <Text className="text-body-md leading-relaxed text-ai-ink">{light}</Text>
      </View>
    )
  }

  // **記録はもう残っている。**待っているのは灯りだけなので、
  // 「保存中」とは書かない。書いた人を不安にさせない
  if (lighting) {
    return (
      <View className="bg-ai-surface rounded-lg px-5 py-4">
        <Text className="text-label-md text-on-surface-variant">灯りをともしています。</Text>
      </View>
    )
  }

  return null
}
