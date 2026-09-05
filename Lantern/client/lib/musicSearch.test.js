import { describe, expect, it } from 'vitest'
import { normalizeTerm, parseSongs, searchPath } from './musicSearch'

describe('探す言葉を整える', () => {
  it('前後の空白を落とす', () => {
    expect(normalizeTerm('  坂本龍一  ')).toBe('坂本龍一')
  })

  it('あいだの空白は1つに潰す', () => {
    expect(normalizeTerm('坂本龍一   戦場のメリークリスマス')).toBe(
      '坂本龍一 戦場のメリークリスマス',
    )
  })

  it('改行も空白として扱う', () => {
    expect(normalizeTerm('坂本龍一\n\nBTTB')).toBe('坂本龍一 BTTB')
  })

  // **記録の一節を貼り付けた形。**曲名として打たれたとは考えにくい。
  // 切っても探せるが、切らずに送ると送らないと決めたものが混ざる
  it('長すぎるものは切る', () => {
    const long = 'あ'.repeat(200)
    expect(normalizeTerm(long)).toHaveLength(80)
  })

  it('空や null は空', () => {
    expect(normalizeTerm('')).toBe('')
    expect(normalizeTerm('   ')).toBe('')
    expect(normalizeTerm(null)).toBe('')
    expect(normalizeTerm(undefined)).toBe('')
  })
})

describe('探しに行く道', () => {
  it('言葉を包む', () => {
    expect(searchPath('坂本龍一')).toBe(
      '/api/apple-music/search?q=' + encodeURIComponent('坂本龍一'),
    )
  })

  // **包まないと道が壊れる。**& や # が混ざった曲名は珍しくない
  it('記号が混ざっても壊れない', () => {
    const p = searchPath('R&B #1 hits')
    expect(p).not.toContain('&B')
    expect(p).not.toContain('#1')
    expect(p.startsWith('/api/apple-music/search?q=')).toBe(true)
  })

  it('空なら道を作らない', () => {
    expect(searchPath('')).toBe('')
    expect(searchPath('   ')).toBe('')
    expect(searchPath(null)).toBe('')
  })
})

describe('返ってきたものを読む', () => {
  it('曲を並べる', () => {
    const out = parseSongs({
      songs: [
        { title: 'Merry Christmas Mr. Lawrence', artist: '坂本龍一', url: 'https://music.apple.com/jp/album/x/1?i=2' },
      ],
    })
    expect(out).toHaveLength(1)
    expect(out[0].title).toBe('Merry Christmas Mr. Lawrence')
    expect(out[0].artist).toBe('坂本龍一')
  })

  // **押せないものを並べても選べない**
  it('URL の無いものは捨てる', () => {
    const out = parseSongs({
      songs: [
        { title: '題名だけ', artist: '誰か' },
        { title: 'あるほう', artist: '誰か', url: 'https://music.apple.com/jp/album/x/1' },
      ],
    })
    expect(out).toHaveLength(1)
    expect(out[0].title).toBe('あるほう')
  })

  it('同じ URL は1つにする', () => {
    const u = 'https://music.apple.com/jp/album/x/1'
    const out = parseSongs({ songs: [{ title: 'a', url: u }, { title: 'b', url: u }] })
    expect(out).toHaveLength(1)
  })

  it('題名や演者が欠けていても落ちない', () => {
    const out = parseSongs({ songs: [{ url: 'https://music.apple.com/jp/album/x/1' }] })
    expect(out).toHaveLength(1)
    expect(out[0].title).toBe('')
    expect(out[0].artist).toBe('')
  })

  // **探せないことでアプリを止めない**
  it('形が違っても空を返す', () => {
    expect(parseSongs(null)).toEqual([])
    expect(parseSongs({})).toEqual([])
    expect(parseSongs({ songs: null })).toEqual([])
    expect(parseSongs({ songs: 'まとも でない' })).toEqual([])
  })
})
