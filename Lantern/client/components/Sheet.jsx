import { useRef, useState } from 'react'
import { Modal, PanResponder, Pressable, ScrollView, View } from 'react-native'
import { useKeyboardHeight } from '../lib/keyboard'

// 下から出る面。**上へ引き上げられる**（2026-09-06・作者の指示
// 「Apple musicから探すのタブを上に引っ張りあげられるようにして。
// 添えるも同様に」）。
//
// ## なぜ要るか
//
// 探した結果が並ぶと、面の丈が足りない。キーボードも出ているので
// **見える所がさらに狭い。**畳んだままだと2〜3件しか見えない。
//
// ## 引き上げ方
//
// つまみを掴んで動かす。**離した時点で決める**——上へ動かしていれば
// 伸ばし、下へ動かしていれば縮める。縮み切っていれば閉じる。
//
// 途中の丈は作らない。**指に追わせると、指を離した所で半端に止まる。**
// 二段だけにすれば、どちらの状態かが常にはっきりする。
//
// ## キーボード
//
// 測って自分で空ける（`lib/keyboard.js` の註釈）。
// `KeyboardAvoidingView` はこの構成では当てにできない。
const TALL = '88%'

export default function Sheet({ visible, onClose, children }) {
  const keyboardHeight = useKeyboardHeight()
  const [tall, setTall] = useState(false)

  // **掴んだ指の向きだけを見る。**丈は離してから決める
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8,
      onPanResponderRelease: (_e, g) => {
        if (g.dy < -40) {
          setTall(true)
          return
        }
        if (g.dy > 40) {
          // **伸びていれば縮める。畳んでいれば閉じる。**
          // 一度の動きで消えると、触っただけのつもりの人が戸惑う
          setTall((was) => {
            if (was) return false
            onClose?.()
            return false
          })
        }
      },
    }),
  ).current

  function close() {
    setTall(false)
    onClose?.()
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={close}>
      <Pressable className="flex-1 bg-black/50 justify-end" onPress={close}>
        <Pressable
          className="bg-surface rounded-t-2xl"
          style={{
            paddingBottom: keyboardHeight > 0 ? keyboardHeight + 16 : 32,
            ...(tall ? { height: TALL } : { maxHeight: TALL }),
          }}
          onPress={() => {}}
        >
          {/* つまみ。**掴む所を広く取る**——線だけだと当たらない */}
          <View {...pan.panHandlers} className="items-center pt-3 pb-2">
            <View className="w-10 h-1 rounded-full bg-outline-variant" />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}
          >
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
