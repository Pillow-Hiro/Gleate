import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import { WebView } from 'react-native-webview'
import { htmlToMarkdown, markdownToHtml } from '../lib/htmlMarkdown'

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

function page({ html, placeholder, color, muted, minHeight, autoFocus }) {
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  html, body { margin:0; padding:0; background:transparent; -webkit-text-size-adjust:100%; }
  #ed {
    outline: none;
    min-height: ${minHeight}px;
    font-family: -apple-system, "Noto Sans JP", sans-serif;
    font-size: 19px;
    line-height: 32px;
    color: ${color};
    caret-color: ${color};
    word-break: break-word;
  }
  #ed:empty:before { content: attr(data-ph); color: ${muted}; }
  #ed ul { margin: 0; padding-left: 1.2em; }
  #ed b, #ed strong { font-weight: 700; }
</style>
</head><body>
<div id="ed" contenteditable="true" data-ph="${placeholder}">${html}</div>
<script>
  var AUTOFOCUS = ${autoFocus ? 'true' : 'false'};
  var ed = document.getElementById('ed');
  var lastHeight = 0;

  function post(msg) {
    window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  }
  function sendHeight() {
    var h = Math.max(document.body.scrollHeight, ed.scrollHeight);
    if (h !== lastHeight) { lastHeight = h; post({ type: 'height', height: h }); }
  }
  function sendHtml() {
    post({ type: 'change', html: ed.innerHTML });
    sendHeight();
  }

  ed.addEventListener('input', sendHtml);
  ed.addEventListener('focus', function () { post({ type: 'focus' }); });
  ed.addEventListener('blur', function () { post({ type: 'blur' }); });

  // RN からの命令。**選択は消さない**（実行前に欄へ戻す）
  window.lanternExec = function (cmd) {
    ed.focus();
    if (cmd === 'bold') document.execCommand('bold');
    else if (cmd === 'italic') document.execCommand('italic');
    else if (cmd === 'bullet') document.execCommand('insertUnorderedList');
    else if (cmd === 'blur') ed.blur();
    sendHtml();
  };

  setTimeout(sendHeight, 0);
  if (AUTOFOCUS) setTimeout(function () { ed.focus(); }, 60);
  document.addEventListener('selectionchange', sendHeight);
</script>
</body></html>`
}

const WebEditor = forwardRef(function WebEditor(
  { value, onChange, onFocus, onBlur, placeholder = '', minHeight = 220, isDark, autoFocus },
  ref
) {
  const webRef = useRef(null)
  const [height, setHeight] = useState(minHeight)

  // **中身は最初の1回しか渡さない。**
  // 打つたびに渡し直すと、WebView が中身を置き直してカーソルが飛ぶ。
  // 以後の中身は WebView が持ち、こちらは受け取るだけ。
  const source = useMemo(
    () => ({
      html: page({
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
  }))

  function handleMessage(e) {
    let msg
    try {
      msg = JSON.parse(e.nativeEvent.data)
    } catch {
      return
    }
    if (msg.type === 'change') onChange(htmlToMarkdown(msg.html))
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
