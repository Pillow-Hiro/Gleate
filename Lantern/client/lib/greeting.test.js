import { describe, it, expect } from 'vitest'
import { greetingFor } from './greeting'

function at(hour) {
  return greetingFor(new Date(2026, 7, 13, hour, 30))
}

describe('greetingFor', () => {
  it('朝は「おはようございます」', () => {
    expect(at(5)).toBe('おはようございます')
    expect(at(7)).toBe('おはようございます')
    expect(at(10)).toBe('おはようございます')
  })

  it('昼は「こんにちは」', () => {
    expect(at(11)).toBe('こんにちは')
    expect(at(14)).toBe('こんにちは')
    expect(at(16)).toBe('こんにちは')
  })

  it('夕方から朝までは「こんばんは」', () => {
    expect(at(17)).toBe('こんばんは')
    expect(at(21)).toBe('こんばんは')
    expect(at(23)).toBe('こんばんは')
    expect(at(0)).toBe('こんばんは')
    expect(at(4)).toBe('こんばんは')
  })

  it('24時間すべてで何かを返す', () => {
    for (let h = 0; h < 24; h += 1) {
      expect(at(h).length).toBeGreaterThan(0)
    }
  })

  // **深夜に専用の言葉を作らない。** 時刻から相手の状態を推し量ると
  // 「まだ起きているんですね」に向かう。
  it('深夜は夜と同じ言葉', () => {
    expect(at(2)).toBe(at(20))
  })

  it('境目で言葉が変わる', () => {
    expect(greetingFor(new Date(2026, 7, 13, 4, 59))).toBe('こんばんは')
    expect(greetingFor(new Date(2026, 7, 13, 5, 0))).toBe('おはようございます')
    expect(greetingFor(new Date(2026, 7, 13, 10, 59))).toBe('おはようございます')
    expect(greetingFor(new Date(2026, 7, 13, 11, 0))).toBe('こんにちは')
    expect(greetingFor(new Date(2026, 7, 13, 16, 59))).toBe('こんにちは')
    expect(greetingFor(new Date(2026, 7, 13, 17, 0))).toBe('こんばんは')
  })

  // 材料は時計だけ。**記録の有無や経過日数を受け取らない。**
  // 引数が増えたらここが落ちる。
  it('引数は日付ひとつだけ', () => {
    expect(greetingFor.length).toBeLessThanOrEqual(1)
  })

  it('挨拶は3種類しかない', () => {
    const all = new Set()
    for (let h = 0; h < 24; h += 1) all.add(at(h))
    expect(all.size).toBe(3)
  })

  // 禁止ワードと、離脱期間・頑張りへの言及を持ち込まない
  it('評価する言葉を含まない', () => {
    const banned = ['お疲れ', '頑張', 'お久しぶり', '継続', '成長', '一歩', 'ぶりですね']
    for (let h = 0; h < 24; h += 1) {
      for (const w of banned) expect(at(h)).not.toContain(w)
    }
  })
})
