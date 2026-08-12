import { describe, expect, it } from 'vitest'
import { buildYearGrid, monthTicks } from './yearMap'

describe('buildYearGrid', () => {
  it('週×曜日の格子を返す', () => {
    const grid = buildYearGrid([], '2026-08-13', 53)
    expect(grid).toHaveLength(53)
    grid.forEach((week) => expect(week).toHaveLength(7))
  })

  it('各週は日曜から始まる', () => {
    const grid = buildYearGrid([], '2026-08-13')
    grid.forEach((week) => {
      const [y, m, d] = week[0].date.split('-').map(Number)
      expect(new Date(y, m - 1, d).getDay()).toBe(0)
    })
  })

  it('最後の週に今日が入る', () => {
    const grid = buildYearGrid([], '2026-08-13')
    const last = grid[grid.length - 1].map((c) => c.date)
    expect(last).toContain('2026-08-13')
  })

  it('記録のある日だけ hasLog が立つ', () => {
    const grid = buildYearGrid(['2026-08-13', '2026-08-10'], '2026-08-13')
    const all = grid.flat()
    const marked = all.filter((c) => c.hasLog).map((c) => c.date).sort()
    expect(marked).toEqual(['2026-08-10', '2026-08-13'])
  })

  it('今日より後ろは isFuture', () => {
    const grid = buildYearGrid([], '2026-08-13')
    const all = grid.flat()
    expect(all.filter((c) => c.isFuture).every((c) => c.date > '2026-08-13')).toBe(true)
    expect(all.filter((c) => !c.isFuture).every((c) => c.date <= '2026-08-13')).toBe(true)
  })

  it('範囲の外にある記録は無視する', () => {
    // 2年前の記録は格子に入らない。落ちないことを確かめる
    const grid = buildYearGrid(['2020-01-01'], '2026-08-13')
    expect(grid.flat().some((c) => c.hasLog)).toBe(false)
  })

  it('同じ日が重複していても1つとして扱う', () => {
    const grid = buildYearGrid(['2026-08-13', '2026-08-13'], '2026-08-13')
    expect(grid.flat().filter((c) => c.hasLog)).toHaveLength(1)
  })

  it('**濃淡を持たない。** hasLog は真偽値だけ', () => {
    // 「記録が多い＝良い」という価値観を作らないため、
    // 件数や文字数を持たせない。ここが変わったら CLAUDE.md も変わっている
    const grid = buildYearGrid(['2026-08-13'], '2026-08-13')
    const cell = grid.flat().find((c) => c.hasLog)
    expect(Object.keys(cell).sort()).toEqual(['date', 'hasLog', 'isFuture'])
    expect(typeof cell.hasLog).toBe('boolean')
  })
})

describe('monthTicks', () => {
  it('月が変わる列にだけ目盛りを置く', () => {
    const grid = buildYearGrid([], '2026-08-13')
    const ticks = monthTicks(grid)
    // 53週なら、またぐ月は13前後
    expect(ticks.length).toBeGreaterThanOrEqual(12)
    expect(ticks.length).toBeLessThanOrEqual(14)
    const labels = ticks.map((t) => t.label)
    expect(new Set(labels).size).toBe(labels.length > 12 ? labels.length - 1 : labels.length)
  })

  it('目盛りは列の番号を持つ', () => {
    const ticks = monthTicks(buildYearGrid([], '2026-08-13'))
    ticks.forEach((t) => expect(Number.isInteger(t.index)).toBe(true))
    expect(ticks[0].index).toBe(0)
  })
})
