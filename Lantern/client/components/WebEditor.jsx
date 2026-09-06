import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import { WebView } from 'react-native-webview'
import { htmlToMarkdown, markdownToHtml } from '../lib/htmlMarkdown'
import { editorPage } from '../lib/editorPage'

// 本物の編集画面。**記号が見えない。**
//
// 2026-08-15 まで、太字は `**強い**` と記号ごと見えていた。
// 素の `TextInput` では文字列と表示が1対1なので、記号を隠せない。
// 実機で3度「効果が想定と違う」と言われた末に、WebView へ移した。
//
// ## 何を載せているか
//
// **`contenteditable` ひとつだけ。** Tiptap も Lexical も入れていない。
// 出せるのは太字・斜体・箇条書きの3つで、それは `document.execCommand`
// だけで足りる。取り込むと束ねる工程が要り、
// **オフラインで開けなくなる危険**（CDN 読み込み）も増える。
// HTML は文字列として持っており、外へ取りに行かない。
//
// ## 保存の形は変えていない
//
// 出入りで Markdown に直す（`lib/htmlMarkdown.js`）。
// これまでの記録も、AI に渡す前に記法を剥がす経路もそのまま。
// 変換は文字列だけの処理なので vitest で往復を固定している。
//
// ## 高さ
//
// WebView は中身の高さを自分で伝えないので、**中から知らせる。**
// 伝えないと、書いた分だけ下が切れる。

const WebEditor = forwardRef(function WebEditor(
  { value, onChange, onFocus, onBlur, onState, placeholder = '', minHeight = 220, isDark, autoFocus },
  ref
) {
  const webRef = useRef(null)
  const [height, setHeight] = useState(minHeight)

  // **中身は最初の1回しか渡さない。**
  // 打つたびに渡し直すと、WebView が中身を置き直してカーソルが飛ぶ。
  // 以後の中身は WebView が持ち、こちらは受け取るだけ。
  const source = useMemo(
    () => ({
      html: editorPage({
        html: markdownToHtml(value),
        placeholder,
        color: isDark ? '#EDEDEF' : '#1D1D1F',
        muted: '#8E8478',
        minHeight,
        autoFocus,
      }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDark]
  )

  useImperativeHandle(ref, () => ({
    exec(cmd) {
      webRef.current?.injectJavaScript(`window.lanternExec(${JSON.stringify(cmd)}); true;`)
    },
    // **外から1行を差し込む。** `value` を書き換えても画面には出ない
    // （中身は最初の1回しか渡していない）ので、命令で入れる。
    insertText(text) {
      webRef.current?.injectJavaScript(`window.lanternInsert(${JSON.stringify(text)}); true;`)
    },
    // **問いを差し替える**（2026-09-06）。中身と同じで、渡し直しでは
    // 届かない。カードが載っているあいだは空にする（`RecordForm`）
    setPlaceholder(text) {
      webRef.current?.injectJavaScript(
        `window.lanternPlaceholder(${JSON.stringify(text)}); true;`,
      )
    },
    // **外から空にする**（2026-09-03）。差し込むのと同じ理由で、
    // `value` を空にしても中身は消えない。
    //
    // 記録すると紙は白紙に戻るが、**主欄だけが残っていた。**
    // 他の3つは素の `TextInput` なので `value` を空にすれば消える。
    // ここだけが消えず、書いたものが残ったまま次を書くことになっていた。
    clear() {
      webRef.current?.injectJavaScript('window.lanternClear(); true;')
    },
  }))

  function handleMessage(e) {
    let msg
    try {
      msg = JSON.parse(e.nativeEvent.data)
    } catch {
      return
    }
    if (msg.type === 'change') onChange(htmlToMarkdown(msg.html))
    else if (msg.type === 'state') onState?.(msg)
    else if (msg.type === 'height') setHeight(Math.max(minHeight, msg.height))
    else if (msg.type === 'focus') onFocus?.()
    else if (msg.type === 'blur') onBlur?.()
  }

  return (
    <View style={{ height }}>
      <WebView
        ref={webRef}
        source={source}
        onMessage={handleMessage}
        originWhitelist={['about:blank']}
        // 外へ出さない。**中身は文字列で持っており、取りに行く先が無い**
        javaScriptEnabled
        scrollEnabled={false}
        hideKeyboardAccessoryView
        keyboardDisplayRequiresUserAction={false}
        automaticallyAdjustContentInsets={false}
        style={{ backgroundColor: 'transparent', flex: 1 }}
      />
    </View>
  )
})

export default WebEditor
