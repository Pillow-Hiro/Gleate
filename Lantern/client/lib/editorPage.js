// 編集画面の中身（WebView に流し込む HTML）。
//
// **部品から切り出してある。** 切り出すと、ここだけブラウザで開いて
// 実際に打って確かめられる。WebView の中は実機でしか動かないが、
// 中で動く HTML は同じものなので、**壊れているかどうかはここで分かる。**
//
// 外へ取りに行かない。CDN も読み込まない。文字列がすべて。

export function editorPage({ html, placeholder, color, muted, minHeight, autoFocus }) {
  return `<!DOCTYPE html>
<html lang="ja"><head>
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

  // **いまカーソルがいる場所に効いている装飾。**
  // 押した本人にしか分からない状態を、ボタンの側に返す。
  // queryCommandState はブラウザが持っている（自分で判定しない）。
  //
  // **この中でバッククォートを書かないこと。** ここは丸ごと
  // テンプレート文字列の中なので、1つ書いた時点で文字列が閉じる。
  // 2026-08-15 にそれでビルドが落ちた。Web の書き出しでは気づけない
  // （Web は WebEditor.web.jsx を選ぶので、この関数を通らない）。
  // 検査は lib/editorPage.test.js が持っている。
  function sendState() {
    try {
      post({
        type: 'state',
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        bullet: document.queryCommandState('insertUnorderedList'),
      });
    } catch (e) {}
  }

  // **消し切ったら、問いを戻す**（2026-09-06・作者の報告
  // 「文字を消すと、プレースホルダーが表示されない」）。
  //
  // 1文字打って消すと、中身は空に見えても br や空の div が残る。
  // 上の CSS は :empty を見ているので、**残っているあいだ問いは出ない。**
  // 消し方（lanternClear）は同じことを知っていたが、
  // **手で消したときには誰も見ていなかった。**
  //
  // 焦点は動かさない。innerHTML を空にするだけならカーソルは欄に残る。
  function tidy() {
    if (!ed.textContent.trim() && ed.innerHTML !== '') ed.innerHTML = '';
  }

  ed.addEventListener('input', function () { tidy(); sendHtml(); sendState(); });
  ed.addEventListener('keyup', sendState);
  ed.addEventListener('mouseup', sendState);
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
    sendState();
  };

  // 書きはじめを差し込む（Journaling Suggestions）。
  // **末尾に足す。書いてあるものを消さない。**
  //
  // insertText を使うのは、中身を組み直さないため。
  // ed.innerHTML に代入すると打っている途中のカーソルが飛ぶ
  // （WebEditor が中身を1回しか渡さないのと同じ理由）。
  //
  // **1行とは限らない**（2026-09-05）。Swift が「最初に取れた1つ」から
  // 「取れたもの全部」に変わり、問い・曲・場所が改行で繋がって来る。
  // insertText に改行入りの文字列を渡すと、contenteditable では
  // **潰れて1行になることがある。**行ごとに分けて、あいだで段落を作る。
  //
  // **逆斜線は二重に書くこと**（2026-09-06）。ここは丸ごとテンプレート
  // 文字列の中なので、一重で書くと**出力に本物の改行が入り、
  // 文字列が閉じずに構文エラーになる。**上のバッククォートの註釈と
  // 同じ罠で、**その註釈のすぐ下で踏んだ。**この註釈にも一度
  // 書いてしまい、二度踏んだ——ここでは記号を字で書く。
  //
  // 踏んだ結果は「改行が潰れる」ではなかった。**スクリプト全体が
  // 動かなくなり、合図が1つも出なくなった**——装飾の列が出ず、
  // **書いた文字も保存されなくなっていた**（ビルド26）。
  //
  // **この中でバッククォートを使わないこと。** ここは外側の
  // テンプレートリテラルの中で、註釈の中でも文字列が閉じてしまう。
  window.lanternInsert = function (text) {
    ed.focus();
    var sel = window.getSelection();
    var range = document.createRange();
    range.selectNodeContents(ed);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    if (ed.textContent.trim()) document.execCommand('insertParagraph');
    var lines = String(text).split('\\n');
    for (var i = 0; i < lines.length; i++) {
      if (i > 0) document.execCommand('insertParagraph');
      if (lines[i]) document.execCommand('insertText', false, lines[i]);
    }
    sendHtml();
    sendHeight();
    sendState();
  };

  // **外から空にする。**（2026-09-03）
  //
  // **この中でバッククォートを使わないこと**（上の註釈と同じ理由）。
  // 実際にここで一度閉じてしまい、構文が壊れた。
  //
  // 記録すると紙は白紙に戻る（components/RecordForm.jsx）が、
  // value を空にしても**ここには届かない。**中身は最初の1回しか
  // 渡していないので、命令で消すほかない。
  //
  // innerHTML ごと空にする。br を1つでも残すと :empty にならず、
  // **問いのプレースホルダが戻らない**（上の CSS）。
  //
  // 焦点は当てない。書き終えた直後なので、キーボードは閉じてよい。
  window.lanternClear = function () {
    ed.innerHTML = '';
    sendHtml();
    sendHeight();
    sendState();
  };

  setTimeout(function () { sendHeight(); sendState(); }, 0);
  if (AUTOFOCUS) setTimeout(function () { ed.focus(); }, 60);
  document.addEventListener('selectionchange', function () { sendHeight(); sendState(); });
</script>
</body></html>`
}
