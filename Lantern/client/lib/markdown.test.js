import { describe, expect, it } from 'vitest'
import { parseBlocks, parseInline, stripMarkdown, toggleBullet, wrapSelection, parseWithMarkers } from './markdown'

const plain = (spans) => spans.map((s) => s.text).join('')

describe('stripMarkdown', () => {
  it('記法を外す', () => {
    expect(stripMarkdown('**曲**を書いた')).toBe('曲を書いた')
    expect(stripMarkdown('*曲*を書いた')).toBe('曲を書いた')
    expect(stripMarkdown('- 曲を書いた')).toBe('曲を書いた')
  })

  it('太字を斜体より先に処理する', () => {
    // 逆順だと `**a**` が `*` + `*a*` + `*` に割れる
    expect(stripMarkdown('**a**')).toBe('a')
    expect(stripMarkdown('**a** **b**')).not.toContain('*')
  })

  it('改行は残す', () => {
    expect(stripMarkdown('- 一つ目\n- 二つ目')).toBe('一つ目\n二つ目')
  })

  it('対になっていない記号は消さない', () => {
    // 書いた文字を勝手に削らない
    expect(stripMarkdown('**')).toBe('**')
    expect(stripMarkdown('2 * 3 = 6')).toBe('2 * 3 = 6')
    expect(stripMarkdown('-5度だった')).toBe('-5度だった')
  })

  it('空でも落ちない', () => {
    expect(stripMarkdown('')).toBe('')
    expect(stripMarkdown(null)).toBe('')
  })
})

describe('parseInline', () => {
  it('装飾のない文はそのまま1つ', () => {
    expect(parseInline('ふつうの文')).toEqual([{ text: 'ふつうの文', bold: false, italic: false }])
  })

  it('太字を切り分ける', () => {
    const spans = parseInline('今日は**曲**を書いた')
    expect(plain(spans)).toBe('今日は曲を書いた')
    expect(spans.find((s) => s.text === '曲').bold).toBe(true)
    expect(spans.find((s) => s.text === '今日は').bold).toBe(false)
  })

  it('斜体を切り分ける', () => {
    const spans = parseInline('*静かな*朝')
    expect(spans.find((s) => s.text === '静かな').italic).toBe(true)
  })

  it('入れ子（太字の中の斜体）を扱える', () => {
    const spans = parseInline('**強い *と斜め* だ**')
    const both = spans.find((s) => s.bold && s.italic)
    expect(both?.text).toBe('と斜め')
    expect(plain(spans)).toBe('強い と斜め だ')
  })

  it('文字を落とさない', () => {
    // **装飾の解釈に失敗しても、書いた文字は全部出す**
    const src = '**a**b*c*d__e__f'
    expect(plain(parseInline(src))).toBe('abcdef')
  })
})

describe('parseBlocks', () => {
  it('行ごとに割る', () => {
    const blocks = parseBlocks('一行目\n二行目')
    expect(blocks).toHaveLength(2)
    expect(plain(blocks[0].spans)).toBe('一行目')
  })

  it('箇条書きを見分け、記号は spans に残さない', () => {
    const blocks = parseBlocks('- 買い物\nふつうの行')
    expect(blocks[0].bullet).toBe(true)
    expect(plain(blocks[0].spans)).toBe('買い物')
    expect(blocks[1].bullet).toBe(false)
  })

  it('空行も1行として残す', () => {
    // 書いた人が空けた行を詰めない
    expect(parseBlocks('上\n\n下')).toHaveLength(3)
  })
})

describe('wrapSelection', () => {
  it('選択した範囲を囲む', () => {
    const r = wrapSelection('今日は曲を書いた', 3, 4, '**')
    expect(r.text).toBe('今日は**曲**を書いた')
  })

  it('カーソルは閉じ記号の手前に戻す', () => {
    const r = wrapSelection('あ', 0, 1, '**')
    expect(r.text).toBe('**あ**')
    expect(r.text.slice(0, r.cursor)).toBe('**あ')
  })

  // **何も選ばずに押したら、いまいる語を囲む**（2026-08-15）。
  // それまでは `****` が現れ、実機で「良くない」と言われた
  it('選択が無ければカーソルのある語を囲む', () => {
    const r = wrapSelection('今日は曲を書いた', 4, 4, '**')
    expect(r.text).toBe('**今日は曲を書いた**')
  })

  it('句読点で語が切れる', () => {
    const r = wrapSelection('今日は、曲を書いた', 6, 6, '**')
    expect(r.text).toBe('今日は、**曲を書いた**')
  })

  it('空白で語が切れる', () => {
    const r = wrapSelection('hello world', 2, 2, '**')
    expect(r.text).toBe('**hello** world')
  })

  it('行をまたがない', () => {
    const r = wrapSelection('1行目\n2行目', 8, 8, '**')
    expect(r.text).toBe('1行目\n**2行目**')
  })

  it('語が無いところでは記号だけ置く', () => {
    const r = wrapSelection('', 0, 0, '**')
    expect(r.text).toBe('****')
    expect(r.cursor).toBe(2)
  })

  it('前後とも切れ目なら記号だけ置く', () => {
    // 空白と空白のあいだ。**囲む語が無い**
    const r = wrapSelection('あ  い', 2, 2, '**')
    expect(r.text).toBe('あ **** い')
  })

  // カーソルが語のすぐ右にあるときは、その語を囲む。
  // 「打ち終えて B を押す」がいちばん多い形なので、ここを外さない
  it('語の直後でもその語を囲む', () => {
    const r = wrapSelection('あ い', 1, 1, '**')
    expect(r.text).toBe('**あ** い')
  })

  it('囲んだあとカーソルは閉じ記号の手前', () => {
    const r = wrapSelection('曲', 1, 1, '**')
    expect(r.text.slice(0, r.cursor)).toBe('**曲')
  })
})

describe('toggleBullet', () => {
  it('行頭に付ける', () => {
    expect(toggleBullet('買い物', 0, 0).text).toBe('- 買い物')
  })

  it('付いていれば外す', () => {
    expect(toggleBullet('- 買い物', 0, 0).text).toBe('買い物')
  })

  it('選択した複数行にまとめて付ける', () => {
    const r = toggleBullet('一つ目\n二つ目', 0, 7)
    expect(r.text).toBe('- 一つ目\n- 二つ目')
  })

  it('1行でも付いていなければ全部に付ける', () => {
    // 混在したまま切り替えると、押すたびに入れ替わって収束しない
    const r = toggleBullet('- 一つ目\n二つ目', 0, 9)
    expect(r.text).toBe('- - 一つ目\n- 二つ目')
  })

  it('空行は飛ばす', () => {
    const r = toggleBullet('一つ目\n\n二つ目', 0, 8)
    expect(r.text).toBe('- 一つ目\n\n- 二つ目')
  })

  it('選択していない行を触らない', () => {
    const src = '上の行\n対象\n下の行'
    const start = src.indexOf('対象')
    const r = toggleBullet(src, start, start + 2)
    expect(r.text).toBe('上の行\n- 対象\n下の行')
  })
})

describe('parseWithMarkers', () => {
  // **いちばん大事な性質。** つなぎ直して元に戻らないと、
  // 入力欄の中身と画面の文字がずれ、打つたびにカーソルが飛ぶ
  const samples = [
    '',
    'ふつうの文',
    '**強い**',
    'これは**強い**言葉',
    '*斜め*と**強い**',
    '- 箇条書き',
    '- **強い**箇条書き',
    '1行目\n2行目',
    '空行を挟む\n\n次の行',
    '**閉じていない',
    '*a* *b* *c*',
    '記号だけ ** ',
    '__下線の太字__',
    '_下線の斜体_',
  ]

  it('つなぎ直すと元の文字列に戻る', () => {
    for (const s of samples) {
      expect(parseWithMarkers(s).map((x) => x.text).join('')).toBe(s)
    }
  })

  it('記号には marker が立つ', () => {
    const spans = parseWithMarkers('これは**強い**')
    const markers = spans.filter((s) => s.marker).map((s) => s.text)
    expect(markers).toEqual(['**', '**'])
  })

  it('記号の中身に bold が立つ', () => {
    const spans = parseWithMarkers('**強い**')
    const body = spans.find((s) => !s.marker && s.text === '強い')
    expect(body.bold).toBe(true)
  })

  it('箇条書きの行頭は marker', () => {
    const spans = parseWithMarkers('- あれ')
    expect(spans[0]).toEqual({ text: '- ', bold: false, italic: false, marker: true })
  })

  it('改行はそのまま1つの断片になる', () => {
    const spans = parseWithMarkers('あ\nい')
    expect(spans.map((s) => s.text)).toEqual(['あ', '\n', 'い'])
  })

  it('斜体も本体に印が立つ', () => {
    const spans = parseWithMarkers('*斜め*')
    expect(spans.find((s) => !s.marker && s.text === '斜め').italic).toBe(true)
  })
})
