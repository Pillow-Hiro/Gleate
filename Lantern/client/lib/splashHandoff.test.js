import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isWaiting,
  markLeaving,
  markShowing,
  markSkipped,
  onLeave,
  reset,
} from './splashHandoff'

describe('起動画面からログイン画面への受け渡し', () => {
  beforeEach(() => reset())

  it('何も決まっていなければ待たない', () => {
    expect(isWaiting()).toBe(false)
  })

  it('起動画面を出すなら待つ', () => {
    markShowing()
    expect(isWaiting()).toBe(true)
  })

  it('出さないと決まったら待たない', () => {
    markShowing()
    markSkipped()
    expect(isWaiting()).toBe(false)
  })

  it('去り始めたら待たない', () => {
    markShowing()
    markLeaving()
    expect(isWaiting()).toBe(false)
  })

  it('去り始めたことを知らせる', () => {
    const seen = vi.fn()
    markShowing()
    onLeave(seen)
    markLeaving()
    expect(seen).toHaveBeenCalledTimes(1)
  })

  it('2回目は知らせない（去るのは1度きり）', () => {
    const seen = vi.fn()
    onLeave(seen)
    markLeaving()
    markLeaving()
    expect(seen).toHaveBeenCalledTimes(1)
  })

  it('解除したら知らせない', () => {
    const seen = vi.fn()
    const off = onLeave(seen)
    off()
    markLeaving()
    expect(seen).not.toHaveBeenCalled()
  })

  it('1つが投げても残りに知らせる（起動画面は必ず去る）', () => {
    const ok = vi.fn()
    onLeave(() => {
      throw new Error('聞き手が壊れている')
    })
    onLeave(ok)
    expect(() => markLeaving()).not.toThrow()
    expect(ok).toHaveBeenCalledTimes(1)
    expect(isWaiting()).toBe(false)
  })

  it('去ったあとに「出さない」と言われても巻き戻さない', () => {
    markShowing()
    markLeaving()
    markSkipped()
    expect(isWaiting()).toBe(false)
  })
})
