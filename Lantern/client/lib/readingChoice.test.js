import { describe, expect, it } from 'vitest'
import { withChoice } from './readingChoice'

// 選んだ見立ての印を、振り返りの控えに書き足す。
// **控えの形を壊さない**——`ReviewSection` と `app/deepen.jsx` が同じ鍵を読む。

const stored = () => ({
  generatedAt: '2026-09-22T00:00:00.000Z',
  patterns: [{
    question: '何と比べて出てきた言葉でしょう。',
    deepen: { found: true, readings: [{ text: 'A' }, { text: 'B' }], records: [] },
  }],
})

describe('withChoice', () => {
  it('選んだ番号を書き足す', () => {
    expect(withChoice(stored(), 1).patterns[0].deepen.chosen).toBe(1)
  })

  it('選び直せる', () => {
    expect(withChoice(withChoice(stored(), 1), 0).patterns[0].deepen.chosen).toBe(0)
  })

  it('ほかの中身は触らない', () => {
    const got = withChoice(stored(), 0)
    expect(got.generatedAt).toBe('2026-09-22T00:00:00.000Z')
    expect(got.patterns[0].question).toBe('何と比べて出てきた言葉でしょう。')
    expect(got.patterns[0].deepen.readings).toHaveLength(2)
  })

  it('元の控えを書き換えない', () => {
    const before = stored()
    withChoice(before, 1)
    expect(before.patterns[0].deepen.chosen).toBeUndefined()
  })

  // 深掘りの結果が無ければ、書き足す先がない
  it('深掘りが無ければそのまま返す', () => {
    const none = { patterns: [{ question: '問い。' }] }
    expect(withChoice(none, 0)).toBe(none)
  })

  it('控えが無くても落ちない', () => {
    expect(withChoice(null, 0)).toBe(null)
    expect(withChoice({}, 0)).toEqual({})
  })
})
