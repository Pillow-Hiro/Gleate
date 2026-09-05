import { describe, expect, it } from 'vitest'
import { KINDS, firstLink, linkKey, parseAttachLink } from './attachLink'

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
    const m = parseAttachLink('https://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6')
    expect(m.service).toBe('spotify')
    expect(m.kind).toBe('track')
    // **id しか無いので題名は出せない。**取りに行かないと決めてある
    expect(m.title).toBe('')
    expect(m.label).toBe('Spotifyの曲')
  })

  it('言語の段を読み飛ばす', () => {
    expect(parseAttachLink('https://open.spotify.com/intl-ja/album/xyz').kind).toBe('album')
  })

  it('URI を URL に直す', () => {
    expect(parseAttachLink('spotify:playlist:abc').url).toBe(
      'https://open.spotify.com/playlist/abc',
    )
  })

  // `?si=` が付いても同じものと見なす
  it('付き物を除いた鍵で見分ける', () => {
    const a = 'https://open.spotify.com/track/abc?si=1111'
    const b = 'https://open.spotify.com/track/abc'
    expect(linkKey(a)).toBe(linkKey(b))
  })
})

describe('Apple Music', () => {
  it('道筋から題名を読む', () => {
    const m = parseAttachLink('https://music.apple.com/jp/album/blue-moon/1234567890?i=987')
    expect(m.service).toBe('apple')
    expect(m.kind).toBe('album')
    expect(m.title).toBe('blue moon')
    expect(m.label).toBe('blue moon')
  })

  it('題名が無ければ種類で出す', () => {
    const m = parseAttachLink('https://music.apple.com/jp/playlist/123456')
    expect(m.serviceLabel).toBe('Apple Music')
    expect(m.label).toBe('Apple Musicのプレイリスト')
  })

  it('日本語の題名も読める', () => {
    const m = parseAttachLink('https://music.apple.com/jp/album/%E6%9C%88%E3%81%AE%E6%9B%B2/1')
    expect(m.title).toBe('月の曲')
  })
})

// **YouTube と、知らない場所も受ける**（2026-09-05・作者から
// 「spotify のほかに youtube や他のリンクも添えることはできるよね？」）。
// 音楽に限る理由が無かった。知っている場所しか受けないと、
// **書いている人の世界の方が狭くなる。**
describe('YouTube', () => {
  it('動画を読む', () => {
    const m = parseAttachLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(m.service).toBe('youtube')
    expect(m.family).toBe(KINDS.video)
    expect(m.label).toBe('YouTubeの動画')
  })

  it('短い形も動画', () => {
    expect(parseAttachLink('https://youtu.be/dQw4w9WgXcQ').kind).toBe('video')
  })

  it('ショートとライブを見分ける', () => {
    expect(parseAttachLink('https://youtube.com/shorts/abc').label).toBe('YouTubeのショート')
    expect(parseAttachLink('https://youtube.com/live/abc').label).toBe('YouTubeのライブ')
  })

  it('チャンネルを見分ける', () => {
    expect(parseAttachLink('https://youtube.com/@someone').label).toBe('YouTubeのチャンネル')
  })

  // YouTube Music は**音**の側。並べる印が変わる
  it('YouTube Music は音として扱う', () => {
    const m = parseAttachLink('https://music.youtube.com/watch?v=abc')
    expect(m.serviceLabel).toBe('YouTube Music')
    expect(m.family).toBe(KINDS.sound)
  })

  // `?v=` は本体なので鍵に残す。**落とすと別の動画が同じものになる**
  it('動画の id は鍵に残す', () => {
    expect(linkKey('https://youtube.com/watch?v=aaa')).not.toBe(
      linkKey('https://youtube.com/watch?v=bbb'),
    )
  })
})

describe('知らない場所', () => {
  it('出どころだけを出す', () => {
    const m = parseAttachLink('https://note.com/someone/n/abc')
    expect(m.service).toBe('other')
    expect(m.family).toBe(KINDS.link)
    expect(m.label).toBe('note.com')
  })

  it('www は落とす', () => {
    expect(parseAttachLink('https://www.example.com/x').label).toBe('example.com')
  })
})

describe('読めないもの', () => {

  it('URL でなければ null', () => {
    expect(parseAttachLink('聴いた曲')).toBeNull()
    expect(parseAttachLink('')).toBeNull()
    expect(parseAttachLink(null)).toBeNull()
  })

  it('壊れた URL でも落ちない', () => {
    expect(parseAttachLink('https://')).toBeNull()
  })
})
