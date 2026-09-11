import { Pressable } from 'react-native'
import { GlassFill, isGlassOn } from './GlassPanel'
import { useThemeContext } from '../lib/theme'
import { accentColor } from '../lib/accent'

// 琥珀で塗っていた押せるもの（2026-09-11・作者の指示
// 「琥珀のボタン、残り16箇所も liquid glass に変更」）。
//
// ## 1つにまとめた理由
//
// 16箇所を1つずつ書き換えると、**`bg-lantern-glow` を消し忘れた場所**や
// **`glow` を取り忘れた場所**が必ず出る。しかも Tailwind は知らない
// クラスを黙って無視するので、**間違いは色が消えるだけで気づけない。**
//
// ここに1つ置けば、直すときも1箇所で済む。
//
// ## 押せるので `interactive`
//
// 指に反応して歪む（Apple の作法）。押せない面（今日の灯り）には
// 渡していない——**触れそうに見えてしまう**ので。
//
// ## 硝子が出せないときは今までどおり
//
// iOS 26 未満では `fill` の一色塗りに落ちる。**1ピクセルも変わらない。**
//
// ## `active` を偽にすると何も塗らない
//
// 選ばれている間だけ琥珀にする所（絞り込みの札・装飾の on）のため。
// 偽のときは呼ぶ側の `className` がそのまま出る。
export default function GlassPressable({
  radius = 999,
  active = true,
  className = '',
  style,
  children,
  ...rest
}) {
  const { accent, isDark } = useThemeContext()
  const glow = accentColor(accent, isDark)
  const on = active && isGlassOn()

  return (
    <Pressable
      className={className}
      style={[active && !on ? { backgroundColor: glow } : null, style]}
      {...rest}
    >
      {on ? <GlassFill fill={glow} radius={radius} interactive /> : null}
      {children}
    </Pressable>
  )
}
