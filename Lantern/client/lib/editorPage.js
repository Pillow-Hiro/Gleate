// 編集画面の中身（WebView に流し込む HTML）。
//
// **部品から切り出してある。** 切り出すと、ここだけブラウザで開いて
// 実際に打って確かめられる。WebView の中は実機でしか動かないが、
// 中で動く HTML は同じものなので、**壊れているかどうかはここで分かる。**
//
// 外へ取りに行かない。CDN も読み込まない。文字列がすべて。

export function editorPage({ html, placeholder, color, muted, minHeight, autoFocus }) {
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

  // **タグで書かせる。** これを false にしないと、WebKit は太字を
  // <span style="font-weight:700"> で表現することがある。
  // Lantern は <b> と <i> しか読まないので、span だと装飾が消える。
  try { document.execCommand('styleWithCSS', false, false); } catch (e) {}

  function post(msg) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
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

  // RN からの命令。**先に欄へ焦点を戻す**（戻さないと選択が無い扱いになる）
  window.lanternExec = function (cmd) {
    if (cmd !== 'blur') ed.focus();
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
