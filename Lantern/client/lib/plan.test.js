import { describe, expect, it } from 'vitest'
import {
  PAYWALL_FALLBACK,
  isPaidRequired,
  paywallMessage,
  readMaybePaywall,
} from './plan'

describe('断られたかの見分け', () => {
  it('402 かつ paid_required のときだけ', () => {
    expect(isPaidRequired(402, { error: 'paid_required' })).toBe(true)
  })

  it('番号だけでは決めない', () => {
    // 他の理由で 402 が来る余地を残す
    expect(isPaidRequired(402, { error: 'something_else' })).toBe(false)
    expect(isPaidRequired(402, null)).toBe(false)
    expect(isPaidRequired(402, {})).toBe(false)
  })

  it('他の番号は違う', () => {
    expect(isPaidRequired(200, { error: 'paid_required' })).toBe(false)
    expect(isPaidRequired(429, { error: 'paid_required' })).toBe(false)
    expect(isPaidRequired(500, { error: 'paid_required' })).toBe(false)
  })
})

describe('応答の読み取り', () => {
  function res(status, body, broken = false) {
    return {
      status,
      json: async () => {
        if (broken) throw new Error('not json')
        return body
      },
    }
  }

  it('断られていれば true', async () => {
    const r = await readMaybePaywall(res(402, { error: 'paid_required', message: 'x' }))
    expect(r.paidRequired).toBe(true)
    expect(r.body.message).toBe('x')
  })

  it('通っていれば false で本文を返す', async () => {
    const r = await readMaybePaywall(res(200, { reflection: 'ある' }))
    expect(r.paidRequired).toBe(false)
    expect(r.body.reflection).toBe('ある')
  })

  it('本文が読めなくても落ちない', async () => {
    const r = await readMaybePaywall(res(402, null, true))
    expect(r.paidRequired).toBe(true)
    expect(r.body).toBe(null)
  })

  it('本文が読めず 200 なら断られていない', async () => {
    const r = await readMaybePaywall(res(200, null, true))
    expect(r.paidRequired).toBe(false)
  })
})

describe('出す一文', () => {
  it('サーバーの文があればそれを使う', () => {
    expect(paywallMessage({ message: '月次の振り返りはプランに含まれています。' }))
      .toBe('月次の振り返りはプランに含まれています。')
  })

  it('無ければ既定の一文', () => {
    expect(paywallMessage(null)).toBe(PAYWALL_FALLBACK)
    expect(paywallMessage({})).toBe(PAYWALL_FALLBACK)
    expect(paywallMessage({ message: '   ' })).toBe(PAYWALL_FALLBACK)
  })

  it('煽らない', () => {
    // 断る場所はいちばん煽りたくなる。機械に見張らせる
    for (const w of ['今すぐ', 'お得', '限定', '見逃', 'しましょう']) {
      expect(PAYWALL_FALLBACK).not.toContain(w)
    }
  })
})
