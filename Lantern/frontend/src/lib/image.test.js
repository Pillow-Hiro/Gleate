import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  fitWithin,
  PHOTO_MAX_EDGE,
  THUMB_MAX_EDGE,
  PHOTO_QUALITY,
  THUMB_QUALITY,
} from './image'

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
    // アーカイブ目的ではないので、元より大きくして容量を増やす意味がない
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })

  it('ちょうど上限ならそのまま', () => {
    expect(fitWithin(1600, 900, 1600)).toEqual({ width: 1600, height: 900 })
  })

  it('縦横比を保つ', () => {
    const { width, height } = fitWithin(3000, 2000, 1500)
    expect(width / height).toBeCloseTo(3000 / 2000, 2)
  })

  it('整数に丸める', () => {
    const { width, height } = fitWithin(1000, 333, 500)
    expect(Number.isInteger(width)).toBe(true)
    expect(Number.isInteger(height)).toBe(true)
  })

  it('丸めても0にならない', () => {
    // 極端な縦横比でも 0px にすると canvas が例外を投げる
    expect(fitWithin(10000, 5, 1600).height).toBeGreaterThanOrEqual(1)
    expect(fitWithin(5, 10000, 1600).width).toBeGreaterThanOrEqual(1)
  })

  it('サムネイル用の小さい上限でも動く', () => {
    expect(fitWithin(4000, 3000, 400)).toEqual({ width: 400, height: 300 })
  })

  it('定数は本体1600px・サムネ400px', () => {
    expect(PHOTO_MAX_EDGE).toBe(1600)
    expect(THUMB_MAX_EDGE).toBe(400)
  })

  it('品質は本体0.8・サムネ0.7', () => {
    expect(PHOTO_QUALITY).toBe(0.8)
    expect(THUMB_QUALITY).toBe(0.7)
  })
})

describe('frontend と mobile の image.js', () => {
  it('寸法計算の部分が一致している', () => {
    // 二重保守中のため、片方だけ直して他方が古いまま、という事故を防ぐ。
    // 圧縮処理そのものは canvas と expo で実装が違うので、共通部分だけを比べる。
    const here = dirname(fileURLToPath(import.meta.url))
    const read = (p) => readFileSync(resolve(here, p), 'utf8').replace(/\r\n/g, '\n')
    const extract = (src) => {
      const start = src.indexOf('// --- 寸法計算 ---')
      const end = src.indexOf('// --- ここまで ---')
      expect(start).toBeGreaterThanOrEqual(0)
      expect(end).toBeGreaterThan(start)
      return src.slice(start, end)
    }
    expect(extract(read('./image.js'))).toBe(extract(read('../../../mobile/lib/image.js')))
  })
})
