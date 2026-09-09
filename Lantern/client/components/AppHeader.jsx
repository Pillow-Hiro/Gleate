import { View } from 'react-native'
import Text from './Text'
import LanternMark from './LanternMark'

// 画面のいちばん上。**Lantern の綴りを左上に置く**（2026-08-14）。
//
// それまで名前が出るのはログイン画面と起動画面だけで、
// 中に入ると**どのアプリを開いているのか画面に書いていなかった。**
//
// デザイン案（`3_write`）は中央に置いているが、**左に寄せた。**
// 中央に置くと iOS の画面名の位置と重なり、
// 「この画面の名前が Lantern」だと読める。名前はアプリのもの。
//
// 右に何か置ける（`right`）。いまは使っていないが、
// 案の "Done" のように画面ごとの操作が入る場所。
export default function AppHeader({ right }) {
  return (
    <View className="flex-row items-center justify-between px-5 h-11">
      <View className="flex-row items-center gap-2">
        <LanternMark size={18} />
        <Text className="font-latin text-body-md text-on-surface">Lantern</Text>
      </View>
      {right ?? null}
    </View>
  )
}
