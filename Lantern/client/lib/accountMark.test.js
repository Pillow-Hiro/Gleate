import { describe, it, expect } from 'vitest'
import { MARK_SLOTS, markFor } from './accountMark'
import { ACCENTS } from './accent'

describe('markFor', () => {
  // **同じアドレスなら必ず同じ。** 変わると取り違えの手がかりにならない
  it('同じアドレスなら同じ印', () => {
    expect(markFor('a@example.com')).toEqual(markFor('a@example.com'))
  })

  it('大文字小文字で色が変わらない', () => {
    expect(markFor('A@Example.com').surface).toBe(markFor('a@example.com').surface)
  })

  it('@ の前の1文字目を大文字で出す', () => {
    expect(markFor('tinot@example.com').initial).toBe('T')
    expect(markFor('日記@example.com').initial).toBe('日')
  })

  it('空でも落ちない', () => {
    expect(markFor('').initial).toBe('?')
    expect(markFor(undefined).initial).toBe('?')
    expect(markFor(null).surface).toBeTruthy()
  })

  // 世界観の外の色を混ぜない。**灯りの束の中からしか取らない**
  it('組は決めた3つの中から選ぶ', () => {
    const allowed = new Set(MARK_SLOTS.map((s) => s.surface))
    for (const a of ['a@x.com', 'b@x.com', 'c@x.com', 'd@x.com', 'e@x.com']) {
      expect(allowed.has(markFor(a).surface)).toBe(true)
    }
  })

  it('アドレスが違えば組が分かれることがある', () => {
    const slots = new Set(
      ['a@x.com', 'b@x.com', 'c@x.com', 'd@x.com', 'e@x.com', 'f@x.com'].map(
        (a) => markFor(a).surface
      )
    )
    expect(slots.size).toBeGreaterThan(1)
  })

  // **どの灯りを選んでも、面と字が対で存在すること**（2026-09-04）。
  // 印は `AccountMark` が灯りの束から色を引く。役目の名前を書き
  // 間違えると `undefined` になり、**印が透明になって字も消える**
  it('どの灯りにも組の色がある', () => {
    for (const accent of ACCENTS) {
      for (const scheme of ['light', 'dark']) {
        for (const slot of MARK_SLOTS) {
          expect(accent[scheme][slot.surface], `${accent.id}.${scheme}`).toBeTruthy()
          expect(accent[scheme][slot.ink], `${accent.id}.${scheme}`).toBeTruthy()
        }
      }
    }
  })
})
