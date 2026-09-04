import { useCallback, useState } from 'react'
import { Image, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import Text from './Text'
import { markFor } from '../lib/accountMark'
import { useThemeContext } from '../lib/theme'
import { findAccent } from '../lib/accent'
import * as avatar from '../lib/avatarStore'

// アカウントの印。
//
// **顔写真は持たない。** プロフィールは要件に含まないと決めてある。
// 代わりに**アドレスから決まる印**を出す。
//
// 同じアドレスなら必ず同じ色・同じ文字になるので、
// アドレスを隠していても「いつもと同じアカウントか」が一目で分かる。
// 取り違えに気づく手がかりを、文字を出さずに残すための形。
//
// **色は灯りの色から取る**（2026-09-04・作者の指示）。
// 選んだ灯りが月なら印も青白くなる。**世界観の外の色を混ぜない**のは
// 元からの方針で、その「世界観」が選べるようになった。
//
// どの組を使うかはアドレスが決める（`lib/accountMark.js`）。
// 灯りを変えても**組の番号は動かない**ので、取り違えの手がかりは残る。
export default function AccountMark({ email, size = 36 }) {
  const { initial, surface, ink } = markFor(email)
  const { accent, isDark } = useThemeContext()
  const slots = findAccent(accent)[isDark ? 'dark' : 'light']

  // **設定にも画像を出す**（2026-09-04・作者から「設定画面から見た際に、
  // アカウントアイコンが反映されない」）。
  //
  // 画像を読んでいたのはマイページだけで、設定は印を描くだけだった。
  // **同じものを指す印が2つの画面で違って見えていた。**
  //
  // 焦点が戻るたびに読み直す。設定はタブなので裏で生きたままで、
  // 載せたときの一度きりでは、マイページで替えた画像が映らない
  // （`lib/refreshOnFocus.js` と同じ理由）。読むのは端末の中だけ。
  const [uri, setUri] = useState(() => avatar.load())
  useFocusEffect(
    useCallback(() => {
      setUri(avatar.load())
    }, []),
  )

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size }}
        className="rounded-full"
        resizeMode="cover"
      />
    )
  }

  return (
    <View
      style={{ width: size, height: size, backgroundColor: `rgb(${slots[surface]})` }}
      className="rounded-full items-center justify-center"
    >
      <Text style={{ color: `rgb(${slots[ink]})` }} className="font-label text-label-md">
        {initial}
      </Text>
    </View>
  )
}
