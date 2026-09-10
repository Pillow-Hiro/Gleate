import { describe, expect, it } from 'vitest'
import {
  PLATFORMS,
  UNKNOWN,
  emptyState,
  formatCount,
  platformById,
} from './platforms'

describe('つないでいる場所の表', () => {
  it('id が重複しない', () => {
    const ids = PLATFORMS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('どの場所も同じ形をしている', () => {
    // **3つ目を足す人がここで気づけるように。**
    // 1つでも欠けると横断の画面が静かに空欄になる
    for (const p of PLATFORMS) {
      expect(typeof p.id).toBe('string')
      expect(typeof p.label).toBe('string')
      expect(p.statusPath.startsWith('/api/')).toBe(true)
      expect(p.summaryPath.startsWith('/api/')).toBe(true)
      expect(typeof p.nameOf).toBe('function')
      expect(typeof p.statsOf).toBe('function')
    }
  })

  it('数字は3つまで', () => {
    // 横に並べて読める上限。**4つ目は入れない**
    for (const p of PLATFORMS) {
      const stats = p.statsOf({})
      expect(stats.length).toBeGreaterThan(0)
      expect(stats.length).toBeLessThanOrEqual(3)
      for (const s of stats) expect(typeof s.label).toBe('string')
    }
  })

  it('空を渡しても落ちない', () => {
    // 連携していない場所には null が来る
    for (const p of PLATFORMS) {
      expect(() => p.nameOf(null)).not.toThrow()
      expect(() => p.statsOf(null)).not.toThrow()
      expect(p.nameOf(null)).toBe(null)
    }
  })

  it('id から引ける', () => {
    expect(platformById('youtube').label).toBe('YouTube')
    expect(platformById('twitch').label).toBe('Twitch')
    expect(platformById('mixi')).toBe(null)
  })
})

describe('YouTube の読み取り', () => {
  const res = {
    connected: true,
    channel_name: 'Gleate',
    subscriber_count: 1200,
    total_view_count: 340000,
    video_count: 42,
  }

  it('名前を拾う', () => {
    expect(PLATFORMS[0].nameOf(res)).toBe('Gleate')
  })

  it('数字を3つ拾う', () => {
    expect(PLATFORMS[0].statsOf(res).map((s) => s.value)).toEqual([1200, 340000, 42])
  })

  it('total_view_count を使う（view_count ではない）', () => {
    // 2026-08 に一度ここを取り違えて総再生が空欄になった
    const labels = PLATFORMS[0].statsOf({ view_count: 999 }).map((s) => s.value)
    expect(labels).toEqual([undefined, undefined, undefined])
  })
})

describe('Twitch の読み取り', () => {
  it('フォロワーだけ返す', () => {
    const stats = PLATFORMS[1].statsOf({ display_name: 'hiro', follower_count: 88 })
    expect(stats).toEqual([{ label: 'フォロワー', value: 88 }])
  })

  it('取得できなかったフォロワー数は null のまま渡す', () => {
    // サーバーは失敗時に null を返す。0 に潰さない
    expect(PLATFORMS[1].statsOf({ follower_count: null })[0].value).toBe(null)
  })
})

describe('数の見せ方', () => {
  it('1万未満はそのまま区切る', () => {
    expect(formatCount(0)).toBe('0')
    expect(formatCount(1200)).toBe('1,200')
    expect(formatCount(9999)).toBe('9,999')
  })

  it('1万以上は万で書く', () => {
    expect(formatCount(10000)).toBe('1万')
    expect(formatCount(12000)).toBe('1.2万')
    expect(formatCount(340000)).toBe('34万')
  })

  it('切り上げない', () => {
    // 1.9万を2万と書くと、実際より多く見える
    expect(formatCount(19999)).toBe('1.9万')
  })

  it('無いものは — にする', () => {
    // **0 とは書かない。** 0件と未取得は違う
    expect(formatCount(null)).toBe(UNKNOWN)
    expect(formatCount(undefined)).toBe(UNKNOWN)
    expect(formatCount('たくさん')).toBe(UNKNOWN)
  })
})

describe('取得前の状態', () => {
  it('未連携と取得前を区別する', () => {
    const s = emptyState(PLATFORMS[0])
    expect(s.loading).toBe(true)
    expect(s.connected).toBe(false)
    expect(s.failed).toBe(false)
  })
})
