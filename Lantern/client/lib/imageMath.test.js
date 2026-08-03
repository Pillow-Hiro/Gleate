import { describe, it, expect } from 'vitest'
import { fitWithin, PHOTO_MAX_EDGE, THUMB_MAX_EDGE } from './imageMath'

describe('fitWithin', () => {
  it('横長は幅が上限になる', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 })
  })

  it('縦長は高さが上限になる', () => {
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 })
  })

  it('正方形は両辺が上限になる', () => {
    expect(fitWithin(2000, 2000, 1600)).toEqual({ width: 1600, height: 1600 })
  })

  it('上限より小さい画像は拡大しない', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })

  it('ちょうど上限ならそのまま', () => {
    expect(fitWithin(1600, 900, 1600)).toEqual({ width: 1600, height: 900 })
  })

  it('整数に丸める', () => {
    const { width, height } = fitWithin(1000, 333, 500)
    expect(Number.isInteger(width)).toBe(true)
    expect(Number.isInteger(height)).toBe(true)
  })

  it('丸めても0にならない', () => {
    // 極端な縦横比でも 0px にすると ImageManipulator が例外を投げる
    expect(fitWithin(10000, 5, 1600).height).toBeGreaterThanOrEqual(1)
  })

  it('上限の定数', () => {
    expect(PHOTO_MAX_EDGE).toBe(1600)
    expect(THUMB_MAX_EDGE).toBe(400)
  })

  it('幅と高さが入れ替わっても対称に動く', () => {
    const a = fitWithin(4000, 3000, 1600)
    const b = fitWithin(3000, 4000, 1600)
    expect(a.width).toBe(b.height)
    expect(a.height).toBe(b.width)
  })

  it('縦横比を保つ', () => {
    const { width, height } = fitWithin(4000, 3000, 1600)
    expect(width / height).toBeCloseTo(4000 / 3000, 2)
  })

  it('maxEdge が元より大きければ何もしない', () => {
    expect(fitWithin(100, 50, 99999)).toEqual({ width: 100, height: 50 })
  })
})
