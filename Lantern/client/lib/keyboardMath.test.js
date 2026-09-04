import { describe, expect, it } from 'vitest'
import { bodyRowsFor, keyboardHeadroom, sheetMaxHeight } from './keyboardMath'

describe('下に空ける高さ', () => {
  it('キーボードと装飾の列を足す', () => {
    expect(keyboardHeadroom({ keyboardHeight: 300, toolbarHeight: 52 })).toBe(352)
  })

  it('キーボードが出ていなければ安全域だけ', () => {
    expect(keyboardHeadroom({ keyboardHeight: 0, safeBottom: 34 })).toBe(34)
    expect(keyboardHeadroom({ keyboardHeight: 0, toolbarHeight: 52, safeBottom: 34 })).toBe(34)
  })

  it('安全域を二重に数えない', () => {
    // キーボードが出ている間、下端の余白はキーボードに含まれる。
    // 足すと空けすぎて画面が不自然に持ち上がる
    expect(keyboardHeadroom({ keyboardHeight: 300, toolbarHeight: 52, safeBottom: 34 })).toBe(352)
  })

  it('何も渡さなくても落ちない', () => {
    expect(keyboardHeadroom()).toBe(0)
    expect(keyboardHeadroom({})).toBe(0)
  })

  it('おかしな値でも負にしない', () => {
    expect(keyboardHeadroom({ keyboardHeight: null, safeBottom: -10 })).toBe(0)
    expect(keyboardHeadroom({ keyboardHeight: 'あ', safeBottom: 34 })).toBe(34)
  })
})

describe('窓の高さ', () => {
  const H = 844 // iPhone 14 くらい

  it('キーボードが無ければ画面の7割', () => {
    expect(sheetMaxHeight({ windowHeight: H })).toBeCloseTo(H * 0.7, 0)
  })

  it('キーボードが出たら縮む', () => {
    const open = sheetMaxHeight({ windowHeight: H, keyboardHeight: 336, toolbarHeight: 52 })
    expect(open).toBeLessThan(H * 0.7)
  })

  it('画面からはみ出さない', () => {
    // 紙の高さ ＋ キーボード ＋ 列 が画面を超えない
    const kb = 336
    const bar = 52
    const open = sheetMaxHeight({ windowHeight: H, keyboardHeight: kb, toolbarHeight: bar })
    expect(open + kb + bar).toBeLessThanOrEqual(H)
  })

  it('狭すぎても最低限は残す', () => {
    // **0 にすると欄が消えて、何も書けない窓になる**
    const tiny = sheetMaxHeight({ windowHeight: 500, keyboardHeight: 400, toolbarHeight: 52 })
    expect(tiny).toBeGreaterThanOrEqual(160)
  })

  it('何も渡さなくても落ちない', () => {
    expect(sheetMaxHeight()).toBe(160)
  })
})

// 全画面で書くときの主欄の行数（`app/write.jsx`）。
// **画面いっぱいに見せるための数字**で、`RecordForm` の `bodyRows` に入る。
describe('全画面の欄の行数', () => {
  it('画面が高いほど行数が増える', () => {
    // iPhone 15 Pro（852）… (852-220)/32 = 19.75 → 19
    expect(bodyRowsFor(852)).toBe(19)
    // iPad（1180）… (1180-220)/32 = 30
    expect(bodyRowsFor(1180)).toBe(30)
  })

  // **元の紙と同じ高さを下回らない。**
  // 小さい端末で「全画面にしたら今より狭くなった」が起きない
  it('小さい端末でも7行を下回らない', () => {
    expect(bodyRowsFor(400)).toBe(7)
    expect(bodyRowsFor(0)).toBe(7)
  })

  it('何も渡さなくても落ちない', () => {
    expect(bodyRowsFor()).toBe(7)
  })
})
