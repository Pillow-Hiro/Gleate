import { View } from 'react-native'
import Text from './Text'
import { markFor } from '../lib/accountMark'

// アカウントの印。
//
// **顔写真は持たない。** プロフィールは要件に含まないと決めてある。
// 代わりに**アドレスから決まる印**を出す。
//
// 同じアドレスなら必ず同じ色・同じ文字になるので、
// アドレスを隠していても「いつもと同じアカウントか」が一目で分かる。
// 取り違えに気づく手がかりを、文字を出さずに残すための形。
//
// 色は琥珀の周りの3色だけ。**世界観の外の色を混ぜない。**
export default function AccountMark({ email, size = 36 }) {
  const { initial, background, ink } = markFor(email)

  return (
    <View
      style={{ width: size, height: size, backgroundColor: background }}
      className="rounded-full items-center justify-center"
    >
      <Text style={{ color: ink }} className="font-label text-label-md">
        {initial}
      </Text>
    </View>
  )
}
