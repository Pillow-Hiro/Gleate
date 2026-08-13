import { describe, it, expect } from 'vitest'
import {
  notifyBody,
  allNotifyBodies,
  plannedTimes,
  hourLabel,
  NOTIFY_HOURS,
  DEFAULT_NOTIFY_HOUR,
  SCHEDULE_DAYS,
} from './notifyText'

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

  it('時刻の表示は分を持たない', () => {
    expect(hourLabel(8)).toBe('08:00')
    expect(hourLabel(21)).toBe('21:00')
    for (const h of NOTIFY_HOURS) expect(hourLabel(h).endsWith(':00')).toBe(true)
  })

  it('既定の時刻は選べる時刻の中にある', () => {
    expect(NOTIFY_HOURS).toContain(DEFAULT_NOTIFY_HOUR)
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

  it('選べるどの時刻でも同じ本数になる', () => {
    const now = new Date(2026, 7, 13, 0, 30)
    for (const h of NOTIFY_HOURS) {
      expect(plannedTimes({ now, hour: h, recordedToday: false })).toHaveLength(SCHEDULE_DAYS)
    }
  })
})
