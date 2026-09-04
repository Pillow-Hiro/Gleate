import { useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import Text from './Text'

// 手がかりの面。**受け取ったものを出すだけ。** 判定はサーバーが持つ。
//
// ## 問いを出すときは、足りないことを先に言う
//
// 「手がかりを探す」を押したのに問いが出たら、それは裏切りになる。
// **なぜ聞くのかを先に置く。** そのうえで、答えずに閉じられること。
//
// 「答えを求めない問い」はこのアプリの原則（`CLAUDE.md`）。
// ここで答えさせようとすると、そこが壊れる。
//
// ## 答えたあとは探し直さない
//
// **「残しました」で終える。**（2026-09-02・作者の判断）
//
// 材料が1つ増えただけでは、過去との照合はまだできない。
// ここでもう一度探すと、**1回の操作で2度空振りする。**
// 1度目は「足りないから聞かせてください」と理由が言えるが、
// 2度目は言えない。
//
// 溜まってから「答えた直後にも探す」を足すことはできる。**逆はできない。**
export default function HintCard({ kind, text, saving, onAnswer, onClose }) {
  const [answer, setAnswer] = useState('')
  const [saved, setSaved] = useState(false)

  function submit() {
    const v = answer.trim()
    if (!v) return
    onAnswer(v)
    setSaved(true)
  }

  return (
    <View className="bg-surface-lowest rounded-lg px-5 py-5 gap-4 shadow-bloom">
      {kind === 'question' && !saved ? (
        <>
          {/* **なぜ聞くのかを先に置く** */}
          <Text className="text-label-md text-outline leading-relaxed">
            探すための手がかりが、まだ足りません。{'\n'}
            ひとつだけ聞いてもいいですか。
          </Text>

          <Text className="font-display text-body-lg text-on-surface leading-relaxed">{text}</Text>

          <TextInput
            value={answer}
            onChangeText={setAnswer}
            placeholder="一行で構いません"
            placeholderTextColor="#8E8478"
            multiline
            className="bg-surface-low rounded px-3 py-3 min-h-touch font-body text-body-md text-on-surface"
          />

          <View className="flex-row gap-3 justify-end">
            <Pressable
              onPress={onClose}
              className="border border-outline-variant rounded-full px-3.5 min-h-touch justify-center"
            >
              <Text className="text-label-md text-outline">閉じる</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={saving || !answer.trim()}
              className="bg-lantern-glow rounded-full px-4 min-h-touch justify-center disabled:opacity-50"
            >
              <Text className="font-strong text-label-md text-on-lantern">
                {saving ? '残しています...' : '残す'}
              </Text>
            </Pressable>
          </View>
        </>
      ) : saved ? (
        // **探し直さない。** 事実だけを置いて終える
        <Text className="text-body-md text-on-surface leading-relaxed">記録に残しました。</Text>
      ) : (
        <>
          <Text className="text-body-md text-ai-ink leading-relaxed">{text}</Text>
          <Pressable onPress={onClose} className="min-h-touch justify-center items-center">
            <Text className="text-label-md text-outline">閉じる</Text>
          </Pressable>
        </>
      )}
    </View>
  )
}
