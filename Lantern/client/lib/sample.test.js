import { describe, it, expect } from 'vitest'
import { dailySample } from './sample'

function logs(n) {
  return Array.from({ length: n }, (_, i) => ({
    date: `2026-06-${String(i + 1).padStart(2, '0')}`,
  }))
}

describe('dailySample', () => {
  it('件数が足りなければ全部返す', () => {
    expect(dailySample(logs(3), 12, '2026-08-14')).toHaveLength(3)
    expect(dailySample([], 12, '2026-08-14')).toEqual([])
  })

  it('指定した件数だけ返す', () => {
    expect(dailySample(logs(30), 12, '2026-08-14')).toHaveLength(12)
  })

  // **同じ日なら同じ顔ぶれ。** 開き直すたびに変わると探す手が動く
  it('同じ種なら同じ結果', () => {
    const a = dailySample(logs(30), 12, '2026-08-14')
    const b = dailySample(logs(30), 12, '2026-08-14')
    expect(a).toEqual(b)
  })

  it('日が変われば顔ぶれが変わる', () => {
    const a = dailySample(logs(30), 12, '2026-08-14').map((l) => l.date)
    const b = dailySample(logs(30), 12, '2026-08-15').map((l) => l.date)
    expect(a).not.toEqual(b)
  })

  // **書いた直後に自分の記録が無いと、保存できていないように見える**
  it('いちばん新しい記録を必ず含む', () => {
    for (let d = 1; d <= 20; d += 1) {
      const picked = dailySample(logs(30), 12, `2026-08-${d}`)
      expect(picked[0].date).toBe('2026-06-30')
    }
  })

  it('新しい順に並ぶ', () => {
    const picked = dailySample(logs(30), 12, '2026-08-14').map((l) => l.date)
    expect([...picked].sort((a, b) => b.localeCompare(a))).toEqual(picked)
  })

  it('同じ記録を2回返さない', () => {
    const picked = dailySample(logs(30), 12, '2026-08-14')
    expect(new Set(picked.map((l) => l.date)).size).toBe(picked.length)
  })

  it('元の配列を書き換えない', () => {
    const src = logs(30)
    const before = src.map((l) => l.date)
    dailySample(src, 12, '2026-08-14')
    expect(src.map((l) => l.date)).toEqual(before)
  })

  // 記録が増えても、すでに選ばれていたものが理由なく入れ替わらないこと。
  // 点数は種と日付だけで決まるので、他の記録の有無に左右されない。
  it('候補が増えても点数の並びは保たれる', () => {
    const small = dailySample(logs(20), 5, 's').map((l) => l.date)
    const big = dailySample(logs(20).concat({ date: '2026-05-01' }), 6, 's').map((l) => l.date)
    for (const d of small) expect(big).toContain(d)
  })
})
