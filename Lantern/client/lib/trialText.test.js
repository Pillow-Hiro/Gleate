import { describe, expect, it } from 'vitest'
import { trialLabel } from './trialText'

describe('無料お試しの一文', () => {
  it('2週間の無料お試し', () => {
    expect(trialLabel({ price: 0, periodNumberOfUnits: 2, periodUnit: 'WEEK' }))
      .toBe('最初の2週間は無料')
  })

  it('日数でも読める形にする', () => {
    expect(trialLabel({ price: 0, periodNumberOfUnits: 14, periodUnit: 'DAY' }))
      .toBe('最初の14日間は無料')
  })

  it('値引きは「無料」と言わない', () => {
    // 有料の導入価格。**お試しではない**
    expect(trialLabel({ price: 300, periodNumberOfUnits: 1, periodUnit: 'MONTH' })).toBe('')
  })

  it('付いていなければ何も出さない', () => {
    expect(trialLabel(null)).toBe('')
    expect(trialLabel(undefined)).toBe('')
  })

  it('欠けた値は黙って捨てる', () => {
    // ストアの応答が想定と違っても、**画面に壊れた字を出さない**
    expect(trialLabel({ price: 0, periodUnit: 'WEEK' })).toBe('')
    expect(trialLabel({ price: 0, periodNumberOfUnits: 2, periodUnit: 'FORTNIGHT' })).toBe('')
  })
})
