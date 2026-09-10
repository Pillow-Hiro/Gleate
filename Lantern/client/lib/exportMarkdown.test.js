import { describe, expect, it } from 'vitest'
import { logToMarkdown, logsToMarkdown } from './exportMarkdown'

const day = {
  date: '2026-08-17',
  created: '章を1つ書いた',
  enjoyable: '',
  struggled: '',
  next: '',
  ai_response: '',
}

describe('1日ぶん', () => {
  it('日付が見出しになる', () => {
    expect(logToMarkdown(day)).toContain('## 2026-08-17')
  })

  it('書いた欄だけ出す', () => {
    const md = logToMarkdown(day)
    expect(md).toContain('### やったこと')
    // **空の欄で見出しを作らない。** 書けなかった日のように見える
    expect(md).not.toContain('### よかったこと')
    expect(md).not.toContain('### 困ったこと')
    expect(md).not.toContain('### 次にやること')
  })

  it('4つとも書いた日は4つ出す', () => {
    const md = logToMarkdown({
      ...day, enjoyable: 'あ', struggled: 'い', next: 'う',
    })
    for (const label of ['やったこと', 'よかったこと', '困ったこと', '次にやること']) {
      expect(md).toContain(`### ${label}`)
    }
  })

  it('中身が無ければ null', () => {
    // 見出しだけの日を作らない
    expect(logToMarkdown({ date: '2026-08-17' })).toBe(null)
    expect(logToMarkdown({ date: '2026-08-17', created: '   ' })).toBe(null)
  })

  it('日付が無ければ null', () => {
    expect(logToMarkdown({ created: 'あ' })).toBe(null)
    expect(logToMarkdown(null)).toBe(null)
  })

  it('Gleate の言葉は引用にする', () => {
    // **自分の言葉と混ざらないように**
    const md = logToMarkdown({ ...day, ai_response: '書けた日だった。\n静かでよい。' })
    expect(md).toContain('> 書けた日だった。')
    expect(md).toContain('> 静かでよい。')
  })

  it('引用の行末に空白を残さない', () => {
    const md = logToMarkdown({ ...day, ai_response: 'あ\n\nい' })
    expect(md).not.toMatch(/> $/m)
  })

  it('お気に入りは印だけ', () => {
    // **数えない。** 多い少ないの評価にしない
    expect(logToMarkdown({ ...day, favorite: true })).toContain('## 2026-08-17 ★')
    expect(logToMarkdown(day)).not.toContain('★')
  })

  it('本文の Markdown をそのまま通す', () => {
    // 本文はもともと Markdown で保存している。**変換しない**
    const md = logToMarkdown({ ...day, created: '**太字**と\n- 箇条書き' })
    expect(md).toContain('**太字**')
    expect(md).toContain('- 箇条書き')
  })
})

describe('写真と添付', () => {
  it('同梱するときだけ写真を指す', () => {
    const md = logToMarkdown(day, { photoName: '2026-08-17__1.jpg' })
    expect(md).toContain('![写真](photos/2026-08-17__1.jpg)')
  })

  it('同梱しないなら書かない', () => {
    // **開いて画像が壊れているより、無い方がよい**
    expect(logToMarkdown(day)).not.toContain('![写真]')
    expect(logToMarkdown(day, { photoName: null })).not.toContain('![写真]')
  })

  it('添付は一覧にする', () => {
    const md = logToMarkdown(day, { fileNames: ['メモ.txt', '資料.pdf'] })
    expect(md).toContain('- [メモ.txt](files/メモ.txt)')
    expect(md).toContain('- [資料.pdf](files/資料.pdf)')
  })

  it('添付が空なら見出しごと出さない', () => {
    expect(logToMarkdown(day, { fileNames: [] })).not.toContain('添えたもの')
  })
})

describe('まとめて1枚', () => {
  const logs = [
    { date: '2026-08-15', created: '古い' },
    { date: '2026-08-17', created: '新しい' },
    { date: '2026-08-16', created: '中' },
  ]

  it('新しい日が上', () => {
    const md = logsToMarkdown(logs)
    expect(md.indexOf('2026-08-17')).toBeLessThan(md.indexOf('2026-08-16'))
    expect(md.indexOf('2026-08-16')).toBeLessThan(md.indexOf('2026-08-15'))
  })

  it('日と日のあいだに区切りを置く', () => {
    expect(logsToMarkdown(logs).match(/\n---\n/g).length).toBeGreaterThanOrEqual(3)
  })

  it('表紙が付く', () => {
    expect(logsToMarkdown(logs, { generatedAt: '2026-08-17' }))
      .toContain('# Gleate の記録')
  })

  it('1件も無くても空にしない', () => {
    const md = logsToMarkdown([])
    expect(md).toContain('# Gleate の記録')
    expect(md).toContain('まだ記録がありません。')
  })

  it('渡されたものが配列でなくても落ちない', () => {
    expect(() => logsToMarkdown(null)).not.toThrow()
    expect(() => logsToMarkdown(undefined)).not.toThrow()
  })

  it('中身の無い日は飛ばす', () => {
    // 表紙にも日付が入るので、**見出しの形で照合する**
    const md = logsToMarkdown(
      [{ date: '2026-08-17' }, { date: '2026-08-16', created: 'あ' }],
      { generatedAt: '2026-08-20' }
    )
    expect(md).not.toContain('## 2026-08-17')
    expect(md).toContain('## 2026-08-16')
  })

  it('写真は Map でも素のオブジェクトでも引ける', () => {
    const asMap = logsToMarkdown([{ date: '2026-08-17', created: 'あ' }], {
      photos: new Map([['2026-08-17', 'a.jpg']]),
    })
    const asObj = logsToMarkdown([{ date: '2026-08-17', created: 'あ' }], {
      photos: { '2026-08-17': 'a.jpg' },
    })
    expect(asMap).toContain('photos/a.jpg')
    expect(asObj).toContain('photos/a.jpg')
  })

  it('煽らない', () => {
    // 表紙で件数を褒めたりしない
    const md = logsToMarkdown(logs)
    for (const w of ['頑張', '素晴らし', '成長', '継続', 'しましょう']) {
      expect(md).not.toContain(w)
    }
  })
})
