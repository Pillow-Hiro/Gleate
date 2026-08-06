import { describe, expect, it } from 'vitest'
import {
  buildNames,
  isValidDate,
  latestByDate,
  parsePhotoName,
  staleNames,
} from './photoPath'

describe('isValidDate', () => {
  it('YYYY-MM-DD だけを受け付ける', () => {
    expect(isValidDate('2026-08-04')).toBe(true)
    expect(isValidDate('20260804')).toBe(false)
    expect(isValidDate('2026-8-4')).toBe(false)
    expect(isValidDate('')).toBe(false)
    expect(isValidDate(null)).toBe(false)
  })

  it('実在しない日は受け付けない', () => {
    // 形式が合っていても通すと、同じ日の写真が別名で二重に残る
    expect(isValidDate('2026-02-30')).toBe(false)
    expect(isValidDate('2026-13-01')).toBe(false)
  })

  it('パス区切りを含む文字列を受け付けない', () => {
    expect(isValidDate('../../etc')).toBe(false)
    expect(isValidDate('2026-08-04/x')).toBe(false)
  })
})

describe('buildNames', () => {
  it('日付と時刻から名前を作る', () => {
    expect(buildNames('2026-08-04', 1754460000000)).toEqual({
      photo: '2026-08-04__1754460000000.jpg',
      thumb: '2026-08-04__1754460000000.thumb.jpg',
    })
  })

  it('保存のたびに違う名前になる', () => {
    // 同じ名前に上書きすると Image が古い画像をキャッシュから出し続ける
    const a = buildNames('2026-08-04', 1)
    const b = buildNames('2026-08-04', 2)
    expect(a.photo).not.toBe(b.photo)
  })

  it('不正な日付は投げる', () => {
    expect(() => buildNames('2026-02-30', 1)).toThrow()
    expect(() => buildNames('../x', 1)).toThrow()
  })

  it('不正な stamp は投げる', () => {
    expect(() => buildNames('2026-08-04', -1)).toThrow()
    expect(() => buildNames('2026-08-04', 1.5)).toThrow()
  })
})

describe('parsePhotoName', () => {
  it('本体とサムネイルを見分ける', () => {
    expect(parsePhotoName('2026-08-04__7.jpg')).toEqual({
      date: '2026-08-04', stamp: 7, isThumb: false,
    })
    expect(parsePhotoName('2026-08-04__7.thumb.jpg')).toEqual({
      date: '2026-08-04', stamp: 7, isThumb: true,
    })
  })

  it('読めない名前は null', () => {
    // 想定外のファイルが混ざっても一覧全体を落とさない
    expect(parsePhotoName('メモ.txt')).toBeNull()
    expect(parsePhotoName('2026-08-04.jpg')).toBeNull()
    expect(parsePhotoName('2026-02-30__7.jpg')).toBeNull()
    expect(parsePhotoName('2026-08-04__abc.jpg')).toBeNull()
    expect(parsePhotoName(null)).toBeNull()
  })

  it('buildNames の出力を読み戻せる', () => {
    const { photo, thumb } = buildNames('2026-01-31', 42)
    expect(parsePhotoName(photo)).toEqual({ date: '2026-01-31', stamp: 42, isThumb: false })
    expect(parsePhotoName(thumb)).toEqual({ date: '2026-01-31', stamp: 42, isThumb: true })
  })
})

describe('latestByDate', () => {
  it('日付ごとに本体とサムネイルを組にする', () => {
    const m = latestByDate(['2026-08-04__1.jpg', '2026-08-04__1.thumb.jpg'])
    expect(m.get('2026-08-04')).toEqual({
      stamp: 1, photo: '2026-08-04__1.jpg', thumb: '2026-08-04__1.thumb.jpg',
    })
  })

  it('同じ日に複数の世代があれば新しい方を採る', () => {
    // 削除に失敗して古い世代が残っても、表示は最新に寄る
    const m = latestByDate([
      '2026-08-04__1.jpg', '2026-08-04__1.thumb.jpg',
      '2026-08-04__9.jpg', '2026-08-04__9.thumb.jpg',
    ])
    expect(m.get('2026-08-04').stamp).toBe(9)
    expect(m.get('2026-08-04').photo).toBe('2026-08-04__9.jpg')
  })

  it('並び順に依存しない', () => {
    const m = latestByDate(['2026-08-04__9.jpg', '2026-08-04__1.jpg'])
    expect(m.get('2026-08-04').stamp).toBe(9)
  })

  it('複数の日を扱える', () => {
    const m = latestByDate(['2026-08-04__1.jpg', '2026-08-05__1.jpg'])
    expect([...m.keys()].sort()).toEqual(['2026-08-04', '2026-08-05'])
  })

  it('サムネイルだけでも日付は現れる', () => {
    // 本体の保存に失敗した場合。一覧には出したい
    const m = latestByDate(['2026-08-04__1.thumb.jpg'])
    expect(m.get('2026-08-04').photo).toBeNull()
    expect(m.get('2026-08-04').thumb).toBe('2026-08-04__1.thumb.jpg')
  })

  it('読めない名前は無視する', () => {
    expect(latestByDate(['メモ.txt']).size).toBe(0)
  })
})

describe('staleNames', () => {
  it('採用しなかった世代だけを返す', () => {
    const names = [
      '2026-08-04__1.jpg', '2026-08-04__1.thumb.jpg',
      '2026-08-04__9.jpg', '2026-08-04__9.thumb.jpg',
    ]
    expect(staleNames(names).sort()).toEqual(
      ['2026-08-04__1.jpg', '2026-08-04__1.thumb.jpg'],
    )
  })

  it('世代が1つなら何も返さない', () => {
    expect(staleNames(['2026-08-04__1.jpg', '2026-08-04__1.thumb.jpg'])).toEqual([])
  })

  it('別の日を巻き込まない', () => {
    const names = ['2026-08-04__1.jpg', '2026-08-04__9.jpg', '2026-08-05__1.jpg']
    expect(staleNames(names)).toEqual(['2026-08-04__1.jpg'])
  })

  it('読めない名前は消さない', () => {
    // 何のファイルか分からないものを消しに行かない
    expect(staleNames(['メモ.txt', '2026-08-04__1.jpg'])).toEqual([])
  })
})
