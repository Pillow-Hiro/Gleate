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
  // <span style="font-weight:700"> を作り、Lantern はそれを読まない
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
