import { describe, expect, it } from 'vitest'
import {
  buildNames,
  isValidDate,
  latestByDate,
  latestById,
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
      date: '2026-08-04', stamp: 7, id: '', isThumb: false,
    })
    expect(parsePhotoName('2026-08-04__7.thumb.jpg')).toEqual({
      date: '2026-08-04', stamp: 7, id: '', isThumb: true,
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
    expect(parsePhotoName(photo)).toEqual({ date: '2026-01-31', stamp: 42, id: '', isThumb: false })
    expect(parsePhotoName(thumb)).toEqual({ date: '2026-01-31', stamp: 42, id: '', isThumb: true })
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

// 記録ごとに持つ（2026-09-05・作者の指示「写真は記録ごとに紐づける」）。
//
// 1日に複数件置けるようにしてから、**日付で持つと同じ写真が
// その日の全部の記録に付いていた。**
//
// **古い名前は読めるまま残す。** 写真は端末の中にしか無く、消したら
// 戻らない。名前を付け替える処理は書かない——途中で落ちたときに
// 失うものが大きすぎる。
describe('記録ごとの写真', () => {
  it('id を足した名前を組める', () => {
    const { photo, thumb } = buildNames('2026-09-05', 7, 'abc-1')
    expect(photo).toBe('2026-09-05__7__abc-1.jpg')
    expect(thumb).toBe('2026-09-05__7__abc-1.thumb.jpg')
  })

  it('id を渡さなければ今までの名前', () => {
    expect(buildNames('2026-09-05', 7).photo).toBe('2026-09-05__7.jpg')
  })

  it('ファイル名にできない id は断る', () => {
    expect(() => buildNames('2026-09-05', 7, 'a__b')).toThrow()
    expect(() => buildNames('2026-09-05', 7, '../x')).toThrow()
  })

  it('新しい名前も古い名前も読める', () => {
    expect(parsePhotoName('2026-09-05__7__abc.jpg')).toEqual({
      date: '2026-09-05', stamp: 7, id: 'abc', isThumb: false,
    })
    expect(parsePhotoName('2026-09-05__7.jpg')).toEqual({
      date: '2026-09-05', stamp: 7, id: '', isThumb: false,
    })
  })

  it('記録ごとに最新の世代を採る', () => {
    const names = [
      '2026-09-05__1__a.jpg', '2026-09-05__1__a.thumb.jpg',
      '2026-09-05__2__a.jpg', '2026-09-05__2__a.thumb.jpg',
      '2026-09-05__1__b.jpg',
    ]
    const best = latestById(names)
    expect(best.get('a').photo).toBe('2026-09-05__2__a.jpg')
    expect(best.get('b').photo).toBe('2026-09-05__1__b.jpg')
  })

  // **記録に紐づいたものは日付の側で数えない。**
  // 数えると、記録ごとの写真がその日の全部の記録にも付く
  it('日付の側は id 付きを拾わない', () => {
    const best = latestByDate(['2026-09-05__1__a.jpg', '2026-09-05__2.jpg'])
    expect(best.get('2026-09-05').photo).toBe('2026-09-05__2.jpg')
  })

  it('日付だけの写真しか無ければ、記録ごとの一覧は空', () => {
    expect(latestById(['2026-09-05__1.jpg']).size).toBe(0)
  })

  // **持ち主ごとに数える。** 混ぜると片方が片方を消す
  it('掃除は持ち主ごとに数える', () => {
    const names = [
      '2026-09-05__1.jpg',        // 日付のもの（1世代だけ）
      '2026-09-05__1__a.jpg',     // 記録 a の古い世代
      '2026-09-05__2__a.jpg',     // 記録 a の最新
    ]
    expect(staleNames(names)).toEqual(['2026-09-05__1__a.jpg'])
  })
})

