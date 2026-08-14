import { describe, it, expect } from 'vitest'
import { markdownToHtml, htmlToMarkdown, escapeHtml } from './htmlMarkdown'

const round = (md) => htmlToMarkdown(markdownToHtml(md))

describe('markdownToHtml', () => {
  it('行を div にする', () => {
    expect(markdownToHtml('あ')).toBe('<div>あ</div>')
  })

  it('空行も残す', () => {
    expect(markdownToHtml('あ\n\nい')).toBe('<div>あ</div><div><br></div><div>い</div>')
  })

  it('太字と斜体', () => {
    expect(markdownToHtml('**強い**')).toBe('<div><b>強い</b></div>')
    expect(markdownToHtml('*斜め*')).toBe('<div><i>斜め</i></div>')
  })

  it('続く箇条書きは1つの ul にまとめる', () => {
    expect(markdownToHtml('- あ\n- い')).toBe('<ul><li>あ</li><li>い</li></ul>')
  })

  it('HTML に見える文字を逃がす', () => {
    expect(markdownToHtml('<script>')).toBe('<div>&lt;script&gt;</div>')
  })
})

describe('htmlToMarkdown', () => {
  it('div を行にする', () => {
    expect(htmlToMarkdown('<div>あ</div><div>い</div>')).toBe('あ\nい')
  })

  it('外枠が無くても1行として読む', () => {
    expect(htmlToMarkdown('あ')).toBe('あ')
  })

  it('b と strong の両方を太字にする', () => {
    expect(htmlToMarkdown('<div><b>あ</b></div>')).toBe('**あ**')
    expect(htmlToMarkdown('<div><strong>あ</strong></div>')).toBe('**あ**')
  })

  it('li を箇条書きにする', () => {
    expect(htmlToMarkdown('<ul><li>あ</li><li>い</li></ul>')).toBe('- あ\n- い')
  })

  // `contenteditable` は書式を持たない包みを勝手に足す
  it('意味のない包みは落とす', () => {
    expect(htmlToMarkdown('<div><span style="x">あ</span></div>')).toBe('あ')
  })

  it('逃がした文字を戻す', () => {
    expect(htmlToMarkdown('<div>&lt;script&gt;</div>')).toBe('<script>')
  })

  it('空の div は空行になる', () => {
    expect(htmlToMarkdown('<div>あ</div><div><br></div><div>い</div>')).toBe('あ\n\nい')
  })

  // **中身が空の記号を書き戻さない。** `****` が残ると読むときに邪魔になる
  it('空の太字は消す', () => {
    expect(htmlToMarkdown('<div><b></b></div>')).toBe('')
  })
})

describe('往復', () => {
  const samples = [
    'ふつうの文',
    '**強い**',
    'これは**強い**言葉',
    '*斜め*',
    '- あ\n- い',
    '1行目\n2行目',
    'あ\n\nい',
    '記号 < と > と &',
    '- **強い**箇条書き',
  ]

  // **保存の形は Markdown のまま。** 往復で崩れると記録が壊れる
  it('Markdown → HTML → Markdown で戻る', () => {
    for (const md of samples) {
      expect(round(md)).toBe(md)
    }
  })
})

describe('escapeHtml', () => {
  it('& を先に逃がす', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;')
  })
})
