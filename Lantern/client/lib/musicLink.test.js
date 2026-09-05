import { describe, expect, it } from 'vitest'
import { firstLink, musicKey, parseMusicLink } from './musicLink'

describe('貼られた文からリンクを拾う', () => {
  // 共有シートから貼ると、題名や説明が前後に付く。
  // **貼り方を人に合わせさせない**
  it('文の中の URL を拾う', () => {
    expect(firstLink('この曲 https://open.spotify.com/track/abc よかった')).toBe(
      'https://open.spotify.com/track/abc',
    )
  })

  it('Spotify の URI も拾う', () => {
    expect(firstLink('spotify:track:abc')).toBe('spotify:track:abc')
  })

  it('無ければ空', () => {
    expect(firstLink('ただの文')).toBe('')
    expect(firstLink('')).toBe('')
    expect(firstLink(null)).toBe('')
  })
})

describe('Spotify', () => {
  it('曲を読む', () => {
    const m = parseMusicLink('https://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6')
    expect(m.service).toBe('spotify')
    expect(m.kind).toBe('track')
    // **id しか無いので題名は出せない。**取りに行かないと決めてある
    expect(m.title).toBe('')
    expect(m.label).toBe('Spotifyの曲')
  })

  it('言語の段を読み飛ばす', () => {
    expect(parseMusicLink('https://open.spotify.com/intl-ja/album/xyz').kind).toBe('album')
  })

  it('URI を URL に直す', () => {
    expect(parseMusicLink('spotify:playlist:abc').url).toBe(
      'https://open.spotify.com/playlist/abc',
    )
  })

  // `?si=` が付いても同じものと見なす
  it('付き物を除いた鍵で見分ける', () => {
    const a = 'https://open.spotify.com/track/abc?si=1111'
    const b = 'https://open.spotify.com/track/abc'
    expect(musicKey(a)).toBe(musicKey(b))
  })
})

describe('Apple Music', () => {
  it('道筋から題名を読む', () => {
    const m = parseMusicLink('https://music.apple.com/jp/album/blue-moon/1234567890?i=987')
    expect(m.service).toBe('apple')
    expect(m.kind).toBe('album')
    expect(m.title).toBe('blue moon')
    expect(m.label).toBe('blue moon')
  })

  it('題名が無ければ種類で出す', () => {
    const m = parseMusicLink('https://music.apple.com/jp/playlist/123456')
    expect(m.serviceLabel).toBe('Apple Music')
    expect(m.label).toBe('Apple Musicのプレイリスト')
  })

  it('日本語の題名も読める', () => {
    const m = parseMusicLink('https://music.apple.com/jp/album/%E6%9C%88%E3%81%AE%E6%9B%B2/1')
    expect(m.title).toBe('月の曲')
  })
})

describe('読めないもの', () => {
  it('別の場所のリンクは受けない', () => {
    expect(parseMusicLink('https://example.com/track/abc')).toBeNull()
    expect(parseMusicLink('https://youtube.com/watch?v=abc')).toBeNull()
  })

  it('URL でなければ null', () => {
    expect(parseMusicLink('聴いた曲')).toBeNull()
    expect(parseMusicLink('')).toBeNull()
    expect(parseMusicLink(null)).toBeNull()
  })

  it('壊れた URL でも落ちない', () => {
    expect(parseMusicLink('https://')).toBeNull()
  })
})
