import { describe, expect, it } from 'vitest'
import {
  SLIDES, SLIDE_COUNT, indexFromOffset, isLast, nextIndex,
} from './onboardingSlides'

describe('3枚', () => {
  it('3枚ある', () => {
    expect(SLIDE_COUNT).toBe(3)
  })

  it('どれにも題と本文がある', () => {
    for (const s of SLIDES) {
      expect(s.key).toBeTruthy()
      expect(s.title).toBeTruthy()
      expect(s.body).toBeTruthy()
    }
  })

  it('鍵が重複していない', () => {
    expect(new Set(SLIDES.map((s) => s.key)).size).toBe(SLIDE_COUNT)
  })

  it('最後の1枚だけがボタンを持つ', () => {
    expect(SLIDES.filter((s) => s.action)).toHaveLength(1)
    expect(SLIDES[SLIDE_COUNT - 1].action).toBeTruthy()
  })

  // AI憲法の禁止ワード。**初回に読ませる言葉こそ守る**
  it('禁止された言葉を含まない', () => {
    const banned = ['頑張', '素晴らし', '成長', '一歩', '前進', '充実',
                    'しましょう', 'してみてください', '必ず', 'きっと']
    for (const s of SLIDES) {
      const text = s.title + s.body + (s.action || '')
      for (const w of banned) expect(text).not.toContain(w)
    }
  })
})

describe('最後かどうか', () => {
  it('最後だけ true', () => {
    expect(isLast(0)).toBe(false)
    expect(isLast(1)).toBe(false)
    expect(isLast(2)).toBe(true)
  })
  it('はみ出しても true', () => {
    expect(isLast(99)).toBe(true)
  })
})

describe('次に行く先', () => {
  it('1つ進む', () => {
    expect(nextIndex(0)).toBe(1)
    expect(nextIndex(1)).toBe(2)
  })
  it('最後からは動かない', () => {
    expect(nextIndex(2)).toBe(2)
    expect(nextIndex(99)).toBe(2)
  })
  it('負の値でも落ちない', () => {
    expect(nextIndex(-5)).toBe(0)
    expect(nextIndex(undefined)).toBe(1)
  })
})

describe('流れた量から何枚目か', () => {
  it('幅で割って四捨五入する', () => {
    expect(indexFromOffset(0, 390)).toBe(0)
    expect(indexFromOffset(390, 390)).toBe(1)
    expect(indexFromOffset(400, 390)).toBe(1)
    expect(indexFromOffset(780, 390)).toBe(2)
  })
  it('端をはみ出さない', () => {
    expect(indexFromOffset(-100, 390)).toBe(0)
    expect(indexFromOffset(99999, 390)).toBe(2)
  })
  it('幅が0でも落ちない', () => {
    // **測る前に流れが起きることがある**（最初の描画）
    expect(indexFromOffset(100, 0)).toBe(0)
  })
})
