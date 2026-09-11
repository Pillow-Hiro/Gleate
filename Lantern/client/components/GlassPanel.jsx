import { StyleSheet, View } from 'react-native'

// 硝子の面（2026-09-11・作者の指示「今日の灯りに liquid glass を反映できたりする？」）。
//
// ## ビルドは要らなかった
//
// `expo-glass-effect` は `expo-router` が連れてきていて、**ビルド29 に
// autolink 済み**だった。指紋の素に居るのを確かめている。
//
//     node_modules/expo-glass-effect/ios  ['expoAutolinkingIos']
//
// native はもう積まれているので、**JSから呼ぶだけ＝配信で届く。**
//
// ## それでも静的 import にしない
//
// `tests/test_react_patterns.py` が止める。2026-08-09 に、**この
// パッケージを足したビルドと足していないビルドの指紋が同一**だった
// 記録が残っている。指紋が同じなら EAS Update は区別できないので、
// **native を持たないバイナリに新しいJSが配られる。**
//
// いまは指紋に入っているのを実測したが、**入っていない時期があった**
// という事実のほうが重い。読み込んだだけで落ちる書き方をやめておけば、
// 次に同じことが起きても**硝子が出ないだけで済む。**
//
// ## iOS 26 未満では今までの面に落ちる
//
// `isLiquidGlassAvailable()` が true を返すのは iOS 26 から。
// 公開しているアプリの下限は **16.4**（`Info.plist` で実測）なので、
// **落ちる先を書かないと大半の端末で面が消える。**
//
// 落ちた先は `fill` の一色塗り——**いまと1ピクセルも変わらない。**
//
// ## 明暗を渡さない
//
// `glassColorScheme` は `light` で固定する。この面に載る字は、
// 明るいテーマでも暗いテーマでも黒（`lib/accent.js` の `onGlow` は
// 明暗どちらも `29 29 31`）。**硝子を暗い側に振ると、夜に黒い字が
// 読めなくなる。**面の見え方ではなく、字の読みやすさに合わせる。
//
// ## className を `GlassView` に渡さない
//
// NativeWind が `className` を解くのは、それが知っている部品だけ。
// よその部品に渡しても**黙って無視される**（打ち間違えた色が消えるだけで
// 気づけないのと同じ事故）。なので**外側の `View` に着せて、
// 硝子はその内側に敷く。**
//
// ## `overflow-hidden` を外側に置かない
//
// 硝子は角丸で切る必要があるが、**切る指示を外側に書くと影が消える。**
// iOS では `overflow: hidden` が `masksToBounds` になり、枠の外に出る
// `shadow-bloom` ごと刈り取られる。作者の指示は「ツヤは出してください」
// なので、**影は残さなければならない。**
//
// そこで切るのは**内側の1枚だけ**にする。外側は影と余白だけを持つ。
// 角丸の値は呼ぶ側から数で渡す——`rounded-lg` は 16px
// （`tailwind.config.js`）。**クラス名からは読み取れないので数で渡す。**

// `null` は「まだ見ていない」、`false` は「使えない」
let mod = null

function glass() {
  if (mod !== null) return mod
  try {
    const m = require('expo-glass-effect')
    mod = m && m.isLiquidGlassAvailable && m.isLiquidGlassAvailable() ? m : false
  } catch (e) {
    // **ここでアプリを止めない。**硝子が出ないだけ
    mod = false
  }
  return mod
}

export default function GlassPanel({ fill, radius = 16, className = '', style, children }) {
  const m = glass()

  if (!m) {
    return (
      <View className={className} style={[{ backgroundColor: fill }, style]}>
        {children}
      </View>
    )
  }

  const { GlassView } = m

  return (
    <View className={className} style={style}>
      <View
        style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
        pointerEvents="none"
      >
        <GlassView
          style={StyleSheet.absoluteFill}
          glassEffectStyle="regular"
          glassColorScheme="light"
          tintColor={fill}
        />
      </View>
      {children}
    </View>
  )
}
