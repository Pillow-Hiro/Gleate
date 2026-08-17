import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MODE,
  THEME_LABELS,
  THEME_MODES,
  nativewindScheme,
  normalizeMode,
  resolveIsDark,
  toggledMode,
} from './themeMode'

describe('選べるもの', () => {
  it('3つある', () => {
    expect(THEME_MODES).toEqual(['system', 'light', 'dark'])
  })

  it('どれにも名前がある', () => {
    for (const m of THEME_MODES) {
      expect(THEME_LABELS[m]).toBeTruthy()
    }
  })

  it('既定は端末に合わせる', () => {
    expect(DEFAULT_MODE).toBe('system')
  })
})

describe('保存されていた値の読み直し', () => {
  it('選べる3つはそのまま', () => {
    for (const m of THEME_MODES) expect(normalizeMode(m)).toBe(m)
  })

  it('知らない値は既定へ', () => {
    // **一度も触っていない人はここを通る**
    expect(normalizeMode(null)).toBe(DEFAULT_MODE)
    expect(normalizeMode(undefined)).toBe(DEFAULT_MODE)
    expect(normalizeMode('')).toBe(DEFAULT_MODE)
    expect(normalizeMode('sepia')).toBe(DEFAULT_MODE)
  })
})

describe('暗くするかどうか', () => {
  it('自分で選んだときは端末を見ない', () => {
    expect(resolveIsDark('dark', 'light')).toBe(true)
    expect(resolveIsDark('light', 'dark')).toBe(false)
  })

  it('端末に合わせるときだけ端末を見る', () => {
    expect(resolveIsDark('system', 'dark')).toBe(true)
    expect(resolveIsDark('system', 'light')).toBe(false)
  })

  it('端末が答えないときは明るい方', () => {
    // `useColorScheme()` は null を返すことがある
    expect(resolveIsDark('system', null)).toBe(false)
    expect(resolveIsDark('system', undefined)).toBe(false)
  })
})

describe('NativeWind に渡す値（ネイティブ）', () => {
  it('system をそのまま渡す', () => {
    // **こちらで潰すと Appearance の上書きが残り、端末の設定に追従しない**
    expect(nativewindScheme('system', true, false)).toBe('system')
    expect(nativewindScheme('system', false, false)).toBe('system')
  })

  it('自分で選んだものはそのまま', () => {
    expect(nativewindScheme('light', false, false)).toBe('light')
    expect(nativewindScheme('dark', true, false)).toBe('dark')
  })

  it('知らない値は既定へ', () => {
    expect(nativewindScheme('sepia', false, false)).toBe('system')
  })
})

describe('NativeWind に渡す値（Web）', () => {
  it('system でも、解決済みの明暗を渡す', () => {
    // Web に 'system' を渡すと <html> から dark が外れ、
    // 端末が夜モードでも dark: が効かなくなる
    expect(nativewindScheme('system', true, true)).toBe('dark')
    expect(nativewindScheme('system', false, true)).toBe('light')
  })

  it('自分で選んだときも同じ道を通る', () => {
    expect(nativewindScheme('dark', true, true)).toBe('dark')
    expect(nativewindScheme('light', false, true)).toBe('light')
  })
})

describe('1回で切り替えたときの行き先', () => {
  it('いま見えているものの逆へ', () => {
    expect(toggledMode(true)).toBe('light')
    expect(toggledMode(false)).toBe('dark')
  })

  it('端末に合わせるからでも、逆へ行く', () => {
    // 押した人が期待するのは「今と違う方」であって「端末の設定」ではない。
    // 端末が暗い状態で system なら、押したら明るくなる
    const isDarkNow = resolveIsDark('system', 'dark')
    expect(toggledMode(isDarkNow)).toBe('light')
  })
})
