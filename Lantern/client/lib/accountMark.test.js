import { describe, it, expect } from 'vitest'
import { markFor } from './accountMark'

describe('markFor', () => {
  // **同じアドレスなら必ず同じ。** 変わると取り違えの手がかりにならない
  it('同じアドレスなら同じ印', () => {
    expect(markFor('a@example.com')).toEqual(markFor('a@example.com'))
  })

  it('大文字小文字で色が変わらない', () => {
    expect(markFor('A@Example.com').background).toBe(markFor('a@example.com').background)
  })

  it('@ の前の1文字目を大文字で出す', () => {
    expect(markFor('tinot@example.com').initial).toBe('T')
    expect(markFor('日記@example.com').initial).toBe('日')
  })

  it('空でも落ちない', () => {
    expect(markFor('').initial).toBe('?')
    expect(markFor(undefined).initial).toBe('?')
    expect(markFor(null).background).toBeTruthy()
  })

  // 世界観の外の色を混ぜない
  it('色は決めた3つの中から選ぶ', () => {
    const allowed = new Set(['#FFF0DB', '#FBB03B', '#F2E6D6'])
    for (const a of ['a@x.com', 'b@x.com', 'c@x.com', 'd@x.com', 'e@x.com']) {
      expect(allowed.has(markFor(a).background)).toBe(true)
    }
  })

  it('アドレスが違えば色が分かれることがある', () => {
    const colors = new Set(
      ['a@x.com', 'b@x.com', 'c@x.com', 'd@x.com', 'e@x.com', 'f@x.com'].map(
        (a) => markFor(a).background
      )
    )
    expect(colors.size).toBeGreaterThan(1)
  })
})
