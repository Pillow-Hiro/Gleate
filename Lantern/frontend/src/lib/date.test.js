import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  localDateStr,
  todayStr,
  calcStreak,
  monthsAgoStr,
  findNearestLog,
} from './date'

// ローカルタイムゾーン基準の日付を作るヘルパー（new Date('2026-03-15') はUTC解釈になる）
const d = (y, m, day, h = 12) => new Date(y, m - 1, day, h)
const logs = (...dates) => dates.map((date) => ({ date }))

afterEach(() => {
  vi.useRealTimers()
})

describe('localDateStr', () => {
  it('YYYY-MM-DD にゼロ埋めして返す', () => {
    expect(localDateStr(d(2026, 3, 5))).toBe('2026-03-05')
    expect(localDateStr(d(2026, 12, 31))).toBe('2026-12-31')
  })

  it('ローカル日付を返す。UTC変換で前日にずれない', () => {
    // 日本時間の午前0時30分。toISOString() を使っていると前日になる
    const midnight = new Date(2026, 2, 15, 0, 30)
    expect(localDateStr(midnight)).toBe('2026-03-15')
  })

  it('引数なしなら今日を返す', () => {
    vi.useFakeTimers()
    vi.setSystemTime(d(2026, 7, 28))
    expect(localDateStr()).toBe('2026-07-28')
    expect(todayStr()).toBe('2026-07-28')
  })
})

describe('calcStreak', () => {
  const now = d(2026, 7, 28)

  it('記録がなければ0', () => {
    expect(calcStreak([], now)).toBe(0)
  })

  it('今日から連続している日数を数える', () => {
    expect(calcStreak(logs('2026-07-28', '2026-07-27', '2026-07-26'), now)).toBe(3)
  })

  it('今日が未記録でも昨日まで続いていれば途切れ扱いにしない', () => {
    // これがLanternの設計意図。当日の未記録で継続が0にならない
    expect(calcStreak(logs('2026-07-27', '2026-07-26'), now)).toBe(2)
  })

  it('今日も昨日も未記録なら0', () => {
    expect(calcStreak(logs('2026-07-26', '2026-07-25'), now)).toBe(0)
  })

  it('間が空いたらそこで止まる', () => {
    expect(calcStreak(logs('2026-07-28', '2026-07-27', '2026-07-25'), now)).toBe(2)
  })

  it('月をまたいでも数える', () => {
    const july1 = d(2026, 7, 1)
    expect(calcStreak(logs('2026-07-01', '2026-06-30', '2026-06-29'), july1)).toBe(3)
  })

  it('未来の記録は連続日数に含めない', () => {
    expect(calcStreak(logs('2026-07-30', '2026-07-28', '2026-07-27'), now)).toBe(2)
  })

  it('記録の順序に依存しない', () => {
    expect(calcStreak(logs('2026-07-26', '2026-07-28', '2026-07-27'), now)).toBe(3)
  })

  it('重複した日付を二重に数えない', () => {
    expect(calcStreak(logs('2026-07-28', '2026-07-28', '2026-07-27'), now)).toBe(2)
  })

  it('渡された now を書き換えない', () => {
    const arg = d(2026, 7, 28)
    const before = arg.getTime()
    calcStreak(logs('2026-07-27'), arg)
    expect(arg.getTime()).toBe(before)
  })

  it('365日でループを打ち切る', () => {
    const all = []
    const cur = new Date(now)
    for (let i = 0; i < 400; i++) {
      all.push(localDateStr(cur))
      cur.setDate(cur.getDate() - 1)
    }
    expect(calcStreak(logs(...all), now)).toBe(365)
  })
})

describe('monthsAgoStr', () => {
  it('Nヶ月前の同じ日を返す', () => {
    expect(monthsAgoStr(1, d(2026, 7, 28))).toBe('2026-06-28')
    expect(monthsAgoStr(3, d(2026, 7, 28))).toBe('2026-04-28')
    expect(monthsAgoStr(6, d(2026, 7, 28))).toBe('2026-01-28')
  })

  it('年をまたいでも正しく戻る', () => {
    expect(monthsAgoStr(12, d(2026, 7, 28))).toBe('2025-07-28')
    expect(monthsAgoStr(3, d(2026, 1, 15))).toBe('2025-10-15')
  })

  it('繰り上がる日付は月末に丸める（3月31日の1ヶ月前は2月28日）', () => {
    expect(monthsAgoStr(1, d(2026, 3, 31))).toBe('2026-02-28')
  })

  it('うるう年の2月末に丸める', () => {
    expect(monthsAgoStr(1, d(2028, 3, 31))).toBe('2028-02-29')
  })

  it('31日から30日しかない月へ戻ると30日になる', () => {
    expect(monthsAgoStr(1, d(2026, 7, 31))).toBe('2026-06-30')
  })

  it('Insightsが使う4つの期間すべてで有効な日付を返す', () => {
    for (const months of [1, 3, 6, 12]) {
      expect(monthsAgoStr(months, d(2026, 3, 31))).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})

describe('findNearestLog', () => {
  const sample = logs('2026-04-20', '2026-04-25', '2026-04-28', '2026-05-10')

  it('該当がなければ null', () => {
    expect(findNearestLog(sample, '2026-06-15')).toBeNull()
  })

  it('空配列なら null', () => {
    expect(findNearestLog([], '2026-04-28')).toBeNull()
  })

  it('完全一致を返す', () => {
    expect(findNearestLog(sample, '2026-04-28').date).toBe('2026-04-28')
  })

  it('範囲内で最も近い記録を返す', () => {
    // 2026-04-26 からの距離: 25日=1, 28日=2 → 25日が近い
    expect(findNearestLog(sample, '2026-04-26').date).toBe('2026-04-25')
  })

  it('前後どちらでも距離だけで選ぶ', () => {
    // 2026-04-22 からの距離: 20日=2, 25日=3 → 20日
    expect(findNearestLog(sample, '2026-04-22').date).toBe('2026-04-20')
  })

  it('デフォルトの許容は3日。境界のちょうど3日は含む', () => {
    expect(findNearestLog(logs('2026-04-25'), '2026-04-28').date).toBe('2026-04-25')
    expect(findNearestLog(logs('2026-04-24'), '2026-04-28')).toBeNull()
  })

  it('rangeInDays を広げれば遠い記録も拾う', () => {
    expect(findNearestLog(sample, '2026-05-01', 10).date).toBe('2026-04-28')
  })

  it('同じ距離なら先に見つかった方を返す', () => {
    // 2026-04-24 からの距離: 25日=1, 23日=1 → 配列で先の 25日
    expect(findNearestLog(logs('2026-04-25', '2026-04-23'), '2026-04-24').date).toBe('2026-04-25')
  })
})

describe('frontend と mobile の date.js', () => {
  it('内容が完全に一致している', () => {
    // 二重保守中のため、片方だけ直して他方が古いまま、という事故を防ぐ。
    // frontend/ を廃止して一本化したらこのテストは削除してよい。
    const here = dirname(fileURLToPath(import.meta.url))
    const read = (p) => readFileSync(resolve(here, p), 'utf8').replace(/\r\n/g, '\n')
    expect(read('./date.js')).toBe(read('../../../mobile/lib/date.js'))
  })
})
