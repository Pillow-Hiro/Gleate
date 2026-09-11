import { Platform } from 'react-native'

// SF Symbols をそのまま出す（2026-09-11・作者の指示
// 「日替わりの抜粋、過去の記録のアイコンを記録タブのアイコンに合わせてください」）。
//
// ## 似せるのをやめた
//
// タブは native の SF Symbols を出している（`app/(tabs)/_layout.jsx`）。
// 記録は `book.closed`、書くは `pencil`。
//
// 画面の中の記号は、それを**SVGで描き写していた。**2026-09-09 にも
// 「記号の形をタブのアイコンと同じにしてください」と言われて描き直して
// いる。**同じ指示が二度出たということは、描き写しでは合っていない。**
//
// `expo-symbols` がビルド29 に autolink 済みなのを指紋の素で確かめた。
//
//     node_modules/expo-symbols/ios  ['expoAutolinkingIos']
//
// **本物を出せば、二度とずれない。**
//
// ## 静的 import にしない
//
// `expo-symbols` は読み込んだ時点で `requireNativeViewManager` を呼ぶ。
// 持たないビルドに配られると**画面を描く前に落ちる**
// （`tests/test_react_patterns.py`。`expo-glass-effect` と同じ理由で
//  あちらの一覧にも足した）。
//
// ## iOS 以外は描いたものに落ちる
//
// SF Symbols は Apple のもの。Android と web では出せないので、
// **呼ぶ側が渡した `fallback` をそのまま描く。**
// いま画面にある SVG がそのまま落ち先になる。

let mod = null

function symbols() {
  if (mod !== null) return mod
  if (Platform.OS !== 'ios') {
    mod = false
    return mod
  }
  try {
    const m = require('expo-symbols')
    mod = m && m.SymbolView ? m : false
  } catch (e) {
    // **ここでアプリを止めない。**描いたものに落ちる
    mod = false
  }
  return mod
}

/**
 * `name` は SF Symbols の名前（`book.closed` など）。
 * **タブと同じ名前を渡すこと**——それが揃える目的なので。
 *
 * `fallback` は iOS 以外で描くもの。渡さなければ何も出ない。
 */
export default function Symbol({ name, size = 20, color, fallback = null }) {
  const m = symbols()
  if (!m) return fallback
  const { SymbolView } = m
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={color}
      type="monochrome"
      resizeMode="scaleAspectFit"
      style={{ width: size, height: size }}
      fallback={fallback}
    />
  )
}
