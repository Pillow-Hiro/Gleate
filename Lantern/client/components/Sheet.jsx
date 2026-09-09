import { Modal, Pressable, ScrollView, View } from 'react-native'
import { useKeyboardHeight } from '../lib/keyboard'

// 下から出る面。
//
// ## つまみで引き上げる作りをやめた（2026-09-09）
//
// つまみを掴んで伸ばせるようにしたが、**効いていなかった**——
// `PanResponder` を親の `Pressable` が先に取っていた。
// 作者から「タブの昇降ができない」。
//
// **動かないつまみを残さない。**触れそうに見えて触れないものは、
// 無いより悪い。曲を探す面は真ん中へ移した（`AttachRow`）ので、
// ここに残るのは**添えるものを選ぶ短い一覧だけ。**伸ばす必要が無い。
//
// 丈が足りなければ中で流す。
//
// ## キーボード
//
// 測って自分で空ける（`lib/keyboard.js` の註釈）。
// `KeyboardAvoidingView` はこの構成では当てにできない。
// 面の丈の上限。**これを超えたら中で流す**
const MAX = '88%'

export default function Sheet({ visible, onClose, children }) {
  const keyboardHeight = useKeyboardHeight()

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50 justify-end" onPress={onClose}>
        <Pressable
          className="bg-surface rounded-t-2xl"
          style={{
            paddingBottom: keyboardHeight > 0 ? keyboardHeight + 16 : 32,
            maxHeight: MAX,
          }}
          onPress={() => {}}
        >
          {/* 上の余白。**つまみは置かない**（掴めないものを見せない） */}
          <View className="pt-5" />
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
