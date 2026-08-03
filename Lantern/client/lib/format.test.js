import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  parseDate,
  monthLabel,
  dayLabel,
  dateDisplayJa,
  formatAge,
  truncateTitle,
  groupByMonth,
} from './format'

afterEach(() => {
  vi.useRealTimers()
})

describe('parseDate', () => {
  it('YYYY-MM-DD をローカルタイムゾーンのDateにする', () => {
    const d = parseDate('2026-03-15')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(2) // 0始まり
    expect(d.getDate()).toBe(15)
  })

  it('new Date(文字列) のUTC解釈による日付ずれを起こさない', () => {
    // new Date('2026-03-15') はUTC扱いなので、日本時間では前日の9:00になる。
    // 分解して組み立てることでローカル日付を保つ。
    expect(parseDate('2026-03-15').getDate()).toBe(15)
  })

  it('月末・年始でも正しい', () => {
    expect(parseDate('2026-12-31').getMonth()).toBe(11)
    expect(parseDate('2026-01-01').getDate()).toBe(1)
  })
})

describe('monthLabel', () => {
  it('YYYY年M月 にする', () => {
    expect(monthLabel('2026-03-15')).toBe('2026年3月')
  })

  it('月のゼロ埋めを外す', () => {
    expect(monthLabel('2026-01-05')).toBe('2026年1月')
    expect(monthLabel('2026-12-01')).toBe('2026年12月')
  })

  it('YYYY-MM だけでも動く（グルーピングのキーがこの形式）', () => {
    expect(monthLabel('2026-07')).toBe('2026年7月')
  })
})

describe('dayLabel', () => {
  it('D日 曜日 にする', () => {
    // 2026-03-15 は日曜日
    expect(dayLabel('2026-03-15')).toBe('15日 日')
  })

  it('曜日が7種すべて正しく出る', () => {
    // 2026-03-15(日) から 1週間
    const expected = ['日', '月', '火', '水', '木', '金', '土']
    expected.forEach((w, i) => {
      const day = 15 + i
      expect(dayLabel(`2026-03-${day}`)).toBe(`${day}日 ${w}`)
    })
  })
})

describe('dateDisplayJa', () => {
  it('M月D日 曜日 の形にする', () => {
    expect(dateDisplayJa('2026-03-15')).toBe('3月15日 日曜日')
  })

  it('月日のゼロ埋めを外す', () => {
    expect(dateDisplayJa('2026-01-05')).toBe('1月5日 月曜日')
  })
})

describe('formatAge', () => {
  const now = new Date(2026, 6, 30, 12, 0, 0)

  function at(offsetMs) {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    return new Date(now.getTime() - offsetMs).toISOString()
  }

  it('1時間未満は「1時間以内」', () => {
    expect(formatAge(at(0))).toBe('1時間以内')
    expect(formatAge(at(59 * 60 * 1000))).toBe('1時間以内')
  })

  it('1〜23時間は「N時間前」', () => {
    expect(formatAge(at(60 * 60 * 1000))).toBe('1時間前')
    expect(formatAge(at(23 * 60 * 60 * 1000))).toBe('23時間前')
  })

  it('24時間以上は「N日前」', () => {
    expect(formatAge(at(24 * 60 * 60 * 1000))).toBe('1日前')
    expect(formatAge(at(3 * 24 * 60 * 60 * 1000))).toBe('3日前')
  })

  it('境界がちょうど切り替わる', () => {
    expect(formatAge(at(60 * 60 * 1000 - 1))).toBe('1時間以内')
    expect(formatAge(at(24 * 60 * 60 * 1000 - 1))).toBe('23時間前')
  })
})

describe('truncateTitle', () => {
  it('空文字やundefinedは空文字', () => {
    expect(truncateTitle('')).toBe('')
    expect(truncateTitle(undefined)).toBe('')
    expect(truncateTitle(null)).toBe('')
  })

  it('既定の20文字以内はそのまま', () => {
    expect(truncateTitle('あ'.repeat(20))).toBe('あ'.repeat(20))
  })

  it('20文字を超えたら切って ... を付ける', () => {
    expect(truncateTitle('あ'.repeat(21))).toBe('あ'.repeat(20) + '...')
  })

  it('maxLength を指定できる', () => {
    expect(truncateTitle('abcdef', 3)).toBe('abc...')
    expect(truncateTitle('abc', 3)).toBe('abc')
  })
})

describe('groupByMonth', () => {
  const logs = [
    { date: '2026-06-10' },
    { date: '2026-07-28' },
    { date: '2026-07-01' },
    { date: '2026-05-31' },
  ]

  it('YYYY-MM をキーにまとめる', () => {
    expect(Object.keys(groupByMonth(logs)).sort()).toEqual(['2026-05', '2026-06', '2026-07'])
  })

  it('各月の中は新しい日付が先', () => {
    expect(groupByMonth(logs)['2026-07'].map(l => l.date)).toEqual(['2026-07-28', '2026-07-01'])
  })

  it('元の配列を書き換えない', () => {
    const input = [{ date: '2026-01-01' }, { date: '2026-12-31' }]
    groupByMonth(input)
    expect(input.map(l => l.date)).toEqual(['2026-01-01', '2026-12-31'])
  })

  it('空配列なら空オブジェクト', () => {
    expect(groupByMonth([])).toEqual({})
  })

  it('同じ月だけなら1グループ', () => {
    const result = groupByMonth([{ date: '2026-07-01' }, { date: '2026-07-02' }])
    expect(Object.keys(result)).toEqual(['2026-07'])
    expect(result['2026-07']).toHaveLength(2)
  })
})
