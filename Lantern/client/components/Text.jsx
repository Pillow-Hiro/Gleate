import { Text as RNText } from 'react-native'

// **画面のテキストはこれを使う。`react-native` の Text を直接使わない。**
//
// 和文の本文フォント（Noto Sans JP）を全画面に効かせるための置き場所。
// React Native の Text は CSS のような継承をしないため、
// 親に font-body を置いても子には降りてこない。
// 197 箇所の <Text> に手で font-body を書く代わりに、
// 既定を持つ Text をひとつ用意して、各ファイルの import を差し替えている。
//
// font-display / font-mono が指定されている場合は上書きしない。
// NativeWind はクラスの並び順ではなく CSS の定義順で優先度を決めるため、
// **両方を渡すとどちらが勝つか読めない。** 文字列に足す前に弾く。
const HAS_FONT = /(^|\s)font-(display|body|strong|mono)(\s|$)/

export default function Text({ className, ...props }) {
  const cls = className || ''
  return <RNText className={HAS_FONT.test(cls) ? cls : `font-body ${cls}`} {...props} />
}
