import { describe, expect, it } from 'vitest'
import { stampOf } from './buildStamp'

describe('配信の日時', () => {
  // **照らし合わせるための形。**「9/6 0:41 の配信です」と言えれば足りる
  it('月日と時刻を出す', () => {
    expect(stampOf(new Date(2026, 8, 6, 0, 41))).toBe('9/6 0:41')
  })

  it('分は2桁に揃える', () => {
    expect(stampOf(new Date(2026, 8, 6, 9, 5))).toBe('9/6 9:05')
  })

  it('文字列でも読む', () => {
    expect(stampOf(new Date(2026, 8, 6, 12, 0).toISOString())).toBe('9/6 12:00')
  })

  // **ここでアプリを止めない**
  it('読めなければ空', () => {
    expect(stampOf('まとも でない')).toBe('')
    expect(stampOf(null)).toBe('')
  })
})
