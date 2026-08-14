import { describe, it, expect } from 'vitest'
import {
  notifyBody,
  allNotifyBodies,
  plannedTimes,
  timeLabel,
  DEFAULT_NOTIFY_HOUR,
  DEFAULT_NOTIFY_MINUTE,
  SCHEDULE_DAYS,
} from './notifyText'

const EVERY_HOUR = Array.from({ length: 24 }, (_, h) => h)

describe('通知の文面', () => {
  it('日ごとに順に選ぶ', () => {
    const n = allNotifyBodies().length
    expect(notifyBody(0)).toBe(notifyBody(n))
    expect(notifyBody(0)).not.toBe(notifyBody(1))
  })

  it('どの日でも文面が返る', () => {
    for (let d = -5; d < 400; d += 1) {
      expect(notifyBody(d).length).toBeGreaterThan(0)
    }
  })

  // AI憲法の禁止ワードと、習慣化の節が名指しで禁じている言い回し
  it('禁止された言葉を含まない', () => {
    const banned = [
      '頑張', '素晴らし', 'よく', '必ず', 'きっと',
      '継続', '一歩', '前進', '成長', '充実',
      '途切れ', 'ぶりですね', 'お久しぶり', 'また始め',
      '日連続', 'ストリーク',
    ]
    for (const body of allNotifyBodies()) {
      for (const w of banned) expect(body).not.toContain(w)
    }
  })

  // **数を持ち込まない。** 「3日ぶり」「5件」は離脱期間と多寡の評価になる
  it('数字を含まない', () => {
    for (const body of allNotifyBodies()) {
      expect(body).not.toMatch(/[0-9０-９一二三四五六七八九十]/)
    }
  })

  it('時刻は hh:mm で表示する', () => {
    expect(timeLabel(8)).toBe('08:00')
    expect(timeLabel(21, 30)).toBe('21:30')
    expect(timeLabel(0, 5)).toBe('00:05')
  })

  it('既定の時刻は 24 時間の中にある', () => {
    expect(EVERY_HOUR).toContain(DEFAULT_NOTIFY_HOUR)
    expect(DEFAULT_NOTIFY_MINUTE).toBe(0)
  })
})

describe('plannedTimes', () => {
  const hour = 21

  it('時刻より前なら今日ぶんが入る', () => {
    const now = new Date(2026, 7, 13, 9, 0)
    const times = plannedTimes({ now, hour, recordedToday: false })
    expect(times).toHaveLength(SCHEDULE_DAYS)
    expect(times[0].getDate()).toBe(13)
    expect(times[0].getHours()).toBe(21)
  })

  it('時刻を過ぎていれば今日ぶんは入らない', () => {
    const now = new Date(2026, 7, 13, 22, 0)
    const times = plannedTimes({ now, hour, recordedToday: false })
    expect(times).toHaveLength(SCHEDULE_DAYS - 1)
    expect(times[0].getDate()).toBe(14)
  })

  // **書いた日には送らない。** 書いた人に「残してみませんか」は届かない
  it('今日すでに書いていれば今日ぶんは入らない', () => {
    const now = new Date(2026, 7, 13, 9, 0)
    const times = plannedTimes({ now, hour, recordedToday: true })
    expect(times).toHaveLength(SCHEDULE_DAYS - 1)
    expect(times[0].getDate()).toBe(14)
  })

  it('すべて未来を指す', () => {
    const now = new Date(2026, 7, 13, 9, 0)
    for (const t of plannedTimes({ now, hour, recordedToday: false })) {
      expect(t.getTime()).toBeGreaterThan(now.getTime())
    }
  })

  it('月をまたいでも壊れない', () => {
    const now = new Date(2026, 7, 29, 9, 0)
    const times = plannedTimes({ now, hour, recordedToday: false })
    expect(times[times.length - 1].getMonth()).toBe(8)
  })

  // 24時間すべてが選べる（2026-08-14）。**0時も選べる。**
  // 0時30分に 0時を選べば今日ぶんは過ぎているので1本減る。
  // 「どの時刻でも同じ本数」ではなくなった
  it('まだ来ていない時刻なら今日ぶんを含む', () => {
    const now = new Date(2026, 7, 13, 0, 30)
    for (const h of EVERY_HOUR) {
      const expected = h > 0 ? SCHEDULE_DAYS : SCHEDULE_DAYS - 1
      expect(plannedTimes({ now, hour: h, recordedToday: false })).toHaveLength(expected)
    }
  })

  // 分も指定できる（2026-08-14）
  it('分を指定できる', () => {
    const now = new Date(2026, 7, 13, 9, 0)
    const times = plannedTimes({ now, hour: 21, minute: 35, recordedToday: false })
    expect(times[0].getHours()).toBe(21)
    expect(times[0].getMinutes()).toBe(35)
  })

  it('分を省くと 0 分になる', () => {
    const now = new Date(2026, 7, 13, 9, 0)
    const times = plannedTimes({ now, hour: 21, recordedToday: false })
    expect(times[0].getMinutes()).toBe(0)
  })

  // 同じ時の中でも、分が来ていなければ今日ぶんが入る
  it('同じ時でも分が来ていなければ今日ぶんを含む', () => {
    const now = new Date(2026, 7, 13, 21, 10)
    expect(
      plannedTimes({ now, hour: 21, minute: 30, recordedToday: false })[0].getDate()
    ).toBe(13)
    expect(
      plannedTimes({ now, hour: 21, minute: 5, recordedToday: false })[0].getDate()
    ).toBe(14)
  })
})
