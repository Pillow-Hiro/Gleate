import { forwardRef, useImperativeHandle, useRef } from 'react'
import RichEditor from './RichEditor'
import { toggleBullet, wrapSelection } from '../lib/markdown'

// Web では WebView を使わない。**入れ子のブラウザになる。**
//
// 記号が薄く見える形（`RichEditor`）のまま。
// Web は下書きや読み返しに使う想定で、実機ほど書き込まない。
//
// 分岐ではなくファイルを分けているのは、そうしないと
// `react-native-webview` が Web のバンドルに乗るため。
const WebEditor = forwardRef(function WebEditor(
  { value, onChange, onFocus, onBlur, placeholder, minHeight },
  ref
) {
  const selection = useRef(null)

  useImperativeHandle(ref, () => ({
    exec(cmd) {
      if (cmd === 'blur') return
      const s = selection.current
      const start = s?.start ?? value.length
      const end = s?.end ?? start
      const next =
        cmd === 'bullet'
          ? toggleBullet(value, start, end)
          : wrapSelection(value, start, end, cmd === 'bold' ? '**' : '*')
      onChange(next.text)
    },
  }))

  return (
    <RichEditor
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      onBlur={onBlur}
      onSelectionChange={(e) => { selection.current = e.nativeEvent.selection }}
      placeholder={placeholder}
      minHeight={minHeight}
    />
  )
})

export default WebEditor
