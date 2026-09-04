import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  localDateStr,
  todayStr,
  calcStreak,
  monthsAgoStr,
  findNearestLog,
  logsOfDay,
  latestLogOf,
  countDays,
  isDayFull,
  MAX_RECORDS_PER_DAY,
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

// 1日に複数件（2026-09-02）。**上書きせずに別のことを書ける**ための土台。
// 書く紙は白紙で開き、保存は必ず新しい記録として入る
// （`app/(tabs)/index.jsx` / `components/RecordForm.jsx`）ので、
// 「その日の何件目か」「いちばん新しいのはどれか」はここが決める。
const at = (date, saved_at, extra = {}) => ({ date, saved_at, ...extra })

describe('logsOfDay', () => {
  const day = [
    at('2026-09-03', '2026-09-03T12:00:00Z', { id: 'b' }),
    at('2026-09-02', '2026-09-02T09:00:00Z', { id: 'x' }),
    at('2026-09-03', '2026-09-03T01:00:00Z', { id: 'a' }),
    at('2026-09-03', '2026-09-03T23:00:00Z', { id: 'c' }),
  ]

  it('その日のものだけを、保存した順に返す', () => {
    expect(logsOfDay(day, '2026-09-03').map((l) => l.id)).toEqual(['a', 'b', 'c'])
  })

  it('記録の無い日は空', () => {
    expect(logsOfDay(day, '2026-09-01')).toEqual([])
  })

  // 古い記録には `saved_at` が無い。並べ直す材料が無いので前に置く
  it('saved_at の無い記録は前に置く', () => {
    const mixed = [
      at('2026-09-03', '2026-09-03T10:00:00Z', { id: 'new' }),
      { date: '2026-09-03', id: 'old' },
    ]
    expect(logsOfDay(mixed, '2026-09-03').map((l) => l.id)).toEqual(['old', 'new'])
  })

  it('元の配列を書き換えない', () => {
    const before = day.map((l) => l.id)
    logsOfDay(day, '2026-09-03')
    expect(day.map((l) => l.id)).toEqual(before)
  })
})

describe('latestLogOf', () => {
  const day = [
    at('2026-09-03', '2026-09-03T01:00:00Z', { id: 'asa' }),
    at('2026-09-03', '2026-09-03T23:00:00Z', { id: 'yoru' }),
  ]

  // **手がかりが指す先。** ここが朝の記録を返すと、
  // 夜に書いた話について朝の話を探しにいくことになる
  it('その日のいちばん新しい記録を返す', () => {
    expect(latestLogOf(day, '2026-09-03').id).toBe('yoru')
  })

  it('記録の無い日は null', () => {
    expect(latestLogOf(day, '2026-09-01')).toBeNull()
  })
})

describe('countDays', () => {
  // 「N日間の記録」の N。**件数ではない**（`app/(tabs)/journal.jsx`）
  it('同じ日に何件あっても1日と数える', () => {
    const list = logs('2026-09-03', '2026-09-03', '2026-09-03', '2026-09-01')
    expect(countDays(list)).toBe(2)
    expect(list.length).toBe(4)
  })

  it('記録が無ければ0', () => {
    expect(countDays([])).toBe(0)
  })
})

// 書くボタンを出すかどうか（`components/WriteButton.jsx`）。
// **書く・ホーム・記録の3画面で同じ判定を使う**（2026-09-04・作者の指示）。
// 画面ごとに数えると、片方だけ古くなる。
describe('isDayFull', () => {
  const rec = (id) => ({ date: '2026-09-04', id, saved_at: `2026-09-04T0${id}:00:00Z` })

  it('上限に届いていなければ書ける', () => {
    expect(isDayFull([], '2026-09-04')).toBe(false)
    expect(isDayFull([rec(1), rec(2)], '2026-09-04')).toBe(false)
  })

  it('上限に届いたら書けない', () => {
    const day = Array.from({ length: MAX_RECORDS_PER_DAY }, (_, i) => rec(i + 1))
    expect(isDayFull(day, '2026-09-04')).toBe(true)
  })

  it('別の日は数えない', () => {
    const other = Array.from({ length: MAX_RECORDS_PER_DAY }, (_, i) => ({
      date: '2026-09-03',
      id: `x${i}`,
    }))
    expect(isDayFull(other, '2026-09-04')).toBe(false)
  })

  // **写真だけの日の札は数えない**（`lib/photoStore.js` の `attach`）。
  // `id` を持たず、行としては存在しない。混ぜるとサーバーの数え方と
  // ずれて、**まだ置けるのにボタンが消える**
  it('写真だけの札は数えない', () => {
    const withPhoto = [
      rec(1),
      rec(2),
      { date: '2026-09-04', created: '', photo_url: 'file://a.jpg' },
    ]
    expect(isDayFull(withPhoto, '2026-09-04')).toBe(false)
  })
})

