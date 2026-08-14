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

// **実ブラウザで打って取った HTML。**
//
// 2026-08-15 に `lib/editorPage.js` をブラウザで開き、
// 太字・斜体・箇条書きを実際に押して `innerHTML` を控えた。
// ここで壊れると、実機の編集画面も壊れる。
describe('実ブラウザが返した HTML', () => {
  const captured = {
    '選択して太字': ['<div><b>ふつうの文</b></div>', '**ふつうの文**'],
    '選択して斜体': ['<div><i>ふつうの文</i></div>', '*ふつうの文*'],
    '2行を箇条書き': ['<div><ul><li>あ</li><li>い</li></ul></div>', '- あ\n- い'],
    '太字を外す': ['<div>強い</div>', '強い'],
    '空から打つ': ['あたらしい行', 'あたらしい行'],
    '改行して打つ': ['<div>あ</div><div>い</div>', 'あ\nい'],
    '隣の太字と溶ける': [
      '<div>これは<b>強い言葉</b></div><ul><li>あ</li></ul>',
      'これは**強い言葉**\n- あ',
    ],
  }

  for (const [name, [html, md]] of Object.entries(captured)) {
    it(name, () => {
      expect(htmlToMarkdown(html)).toBe(md)
    })
  }

  // **入れ子で壊した。** 対を正規表現で数えると、
  // 外側の div が最初の </li> で閉じたことになる
  it('塊が包まれていても数えない', () => {
    expect(htmlToMarkdown('<div><div><div>あ</div></div></div>')).toBe('あ')
  })

  // **箇条書きを外すと、外れた行が裸で </ul> の後ろに残る。**
  // 切れ目を入れないと前の項目とくっつく
  it('箇条書きを外した行が前の行とくっつかない', () => {
    expect(
      htmlToMarkdown('<ul><li>詰まった</li></ul>直した')
    ).toBe('- 詰まった\n直した')
  })

  it('箇条書きのあとに塊が続いても空行を足さない', () => {
    expect(htmlToMarkdown('<ul><li>あ</li></ul><div>い</div>')).toBe('- あ\nい')
  })

  it('箇条書きで終わっても空行を足さない', () => {
    expect(htmlToMarkdown('<ul><li>あ</li></ul>')).toBe('- あ')
  })
})
