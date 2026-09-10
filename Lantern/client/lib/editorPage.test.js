import { describe, it, expect } from 'vitest'
import { editorPage } from './editorPage'

// **このファイルが存在する理由。**
//
// 2026-08-15、`editorPage.js` の中に書いたコメントの
// バッククォートがテンプレート文字列を閉じ、**iOS のビルドが落ちた。**
//
// `expo export --platform web` では気づけない。
// Web は `WebEditor.web.jsx` を選ぶので、この関数を通らないため。
// **読み込むだけの検査**でも、構文の壊れは捕まえられる。
const page = () =>
  editorPage({
    html: '<div>あ</div>',
    placeholder: '今日のこと',
    color: '#1D1D1F',
    muted: '#8E8478',
    minHeight: 240,
    autoFocus: false,
  })

describe('editorPage', () => {
  it('読み込めて、HTML を返す', () => {
    expect(page().startsWith('<!DOCTYPE html>')).toBe(true)
  })

  it('渡した中身と placeholder が入る', () => {
    const html = page()
    expect(html).toContain('<div>あ</div>')
    expect(html).toContain('今日のこと')
  })

  it('欄と命令の口がある', () => {
    const html = page()
    expect(html).toContain('id="ed"')
    expect(html).toContain('contenteditable="true"')
    expect(html).toContain('window.lanternExec')
  })

  // **タグで書かせる。** false にしないと WebKit が
  // <span style="font-weight:700"> を作り、Gleate はそれを読まない
  it('styleWithCSS を切っている', () => {
    expect(page()).toContain("execCommand('styleWithCSS', false, false)")
  })

  it('効いている装飾を知らせる', () => {
    const html = page()
    expect(html).toContain('queryCommandState')
    expect(html).toContain("type: 'state'")
  })

  it('外へ取りに行かない', () => {
    const html = page()
    expect(html).not.toContain('http://')
    expect(html).not.toContain('https://')
    expect(html).not.toContain('<script src')
  })

  it('autoFocus が反映される', () => {
    expect(editorPage({ html: '', placeholder: '', color: '#000', muted: '#888', minHeight: 1, autoFocus: true }))
      .toContain('var AUTOFOCUS = true')
    expect(page()).toContain('var AUTOFOCUS = false')
  })

  // **外から空にできること**（2026-09-03・作者から「白紙にならない」）。
  // 記録すると紙は白紙に戻るが、主欄だけ残っていた。
  // 中身は WebView が持っているので、`value` を空にしても届かない。
  describe('外から空にする', () => {
    const clearBody = () => page().split('window.lanternClear')[1].split('};')[0]

    it('lanternClear がある', () => {
      expect(page()).toContain('window.lanternClear')
    })

    // `<br>` を1つでも残すと `:empty` にならず、
    // **プレースホルダ（問い）が戻らない**
    it('innerHTML ごと空にする', () => {
      expect(clearBody()).toContain("ed.innerHTML = ''")
    })

    // 空にしたことを外へ知らせないと `form` と画面がずれる。
    // 高さも縮めないと、空の欄が書いたときの高さのまま残る
    it('空にしたら中身と高さを知らせる', () => {
      expect(clearBody()).toContain('sendHtml()')
      expect(clearBody()).toContain('sendHeight()')
    })

    // 書き終えた直後なので、キーボードは閉じてよい。
    // `lanternInsert` は焦点を当てるが、こちらは当てない
    it('焦点は当てない', () => {
      expect(clearBody()).not.toContain('ed.focus()')
    })
  })
})

// **出来上がったページの中身も読む**（2026-09-06）。
//
// ここまでの検査は `editorPage.js` が**読み込めるか**しか見ていなかった。
// バッククォートで閉じてしまう壊れ方はそれで捕まる——ファイル自体が
// 壊れるので。**しかし今回の壊れ方は違った。**
//
// テンプレート文字列の中に一重の逆斜線を書いた。`editorPage.js` は
// 正しく読み込める。**壊れるのは出来上がったページの方。**
//
//     var lines = String(text).split('
//     ');
//
// 中の面のスクリプトが丸ごと動かなくなり、**合図が1つも出なくなった。**
// 装飾の列が出ず、**書いた文字も保存されなくなっていた**（ビルド26）。
// 例外も警告も出ない——`post()` は `ReactNativeWebView` が無ければ
// 黙って諦める作りなので、**外からは静かに壊れる。**
//
// **出来上がったものを実際に構文解析する。**それだけで捕まえられた。
describe('出来上がったページのスクリプト', () => {
  const script = () => page().match(/<script>([\s\S]*?)<\/script>/)[1]

  it('構文として通る', () => {
    // **`new Function` は中身を実行しない。**組み立てるだけで構文は分かる
    expect(() => new Function(script())).not.toThrow()
  })

  it('合図を出す口がある', () => {
    // **これが無いと、外からは何も分からないまま静かに壊れる**
    expect(script()).toContain('ReactNativeWebView.postMessage')
    expect(script()).toContain("addEventListener('focus'")
    expect(script()).toContain("addEventListener('input'")
  })

  // **構文が通るだけでは足りない**（2026-09-06）。
  // 途中で落ちれば、そこから先の口は付かない。**走らせて確かめる。**
  it('走らせると合図の口が付き、最初の知らせが出る', () => {
    const heard = []
    const posted = []
    const ed = {
      addEventListener: (t) => heard.push(t),
      innerHTML: '', scrollHeight: 200, textContent: '',
      focus() {}, blur() {},
    }
    const doc = {
      getElementById: () => ed,
      execCommand: () => true,
      queryCommandState: () => false,
      createRange: () => ({ selectNodeContents() {}, collapse() {} }),
      body: { scrollHeight: 200 },
      addEventListener: () => {},
    }
    const win = {
      ReactNativeWebView: { postMessage: (m) => posted.push(JSON.parse(m).type) },
      getSelection: () => ({ removeAllRanges() {}, addRange() {} }),
    }
    new Function('window', 'document', 'setTimeout', script())(win, doc, (fn) => fn())

    // **これが無いと、焦点が伝わらず列が出ない**
    expect(heard).toContain('focus')
    // **これが無いと、書いた文字が保存されない**
    expect(heard).toContain('input')
    expect(posted).toContain('height')
    // 外から差し込む口（日記の候補）
    expect(typeof win.lanternInsert).toBe('function')
  })
})
