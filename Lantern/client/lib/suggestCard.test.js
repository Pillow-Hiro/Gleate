import { describe, expect, it } from 'vitest'
import { CARD, readCard, readCards } from './suggestCard'

describe('一行をカードに読み解く', () => {
  // **こちらの Swift が作っている形。**外から来たものを当てているのではない
  it('繋ぎで題名と添え字に割る', () => {
    const c = readCard('Creep — レディオヘッド')
    expect(c.kind).toBe(CARD.item)
    expect(c.title).toBe('Creep')
    expect(c.sub).toBe('レディオヘッド')
  })

  it('問いは問いとして扱う', () => {
    const c = readCard('今日聴いたミュージックについてどう思いますか?')
    expect(c.kind).toBe(CARD.ask)
    expect(c.sub).toBe('')
  })

  // **曲と場所は同じ形で来る。**見分けられないものを見分けたと言わない
  it('繋ぎがあっても音楽だとは言わない', () => {
    expect(readCard('渋谷 — 東京').kind).toBe(CARD.item)
    expect(readCard('Creep — レディオヘッド').kind).toBe(CARD.item)
  })

  it('短い一言はそのまま', () => {
    expect(readCard('渋谷').kind).toBe(CARD.item)
  })

  it('繋ぎが無ければ題名だけ', () => {
    const c = readCard('TUIDE')
    expect(c.title).toBe('TUIDE')
    expect(c.sub).toBe('')
  })

  it('空は何も返さない', () => {
    expect(readCard('')).toBe(null)
    expect(readCard('   ')).toBe(null)
    expect(readCard(null)).toBe(null)
  })
})

describe('溜めてあるものを並べる', () => {
  // **行ごとに1枚。**まとめて1枚にすると、外すときに全部消える
  it('複数行は複数枚になる', () => {
    const out = readCards([{ text: '今日はどうでしたか?\nCreep — レディオヘッド' }])
    expect(out).toHaveLength(2)
    expect(out[0].kind).toBe(CARD.ask)
    expect(out[1].title).toBe('Creep')
  })

  // 外すときのために、元の一行を覚えている
  it('元の文字列を持っている', () => {
    const src = 'a\nb'
    const out = readCards([{ text: src }])
    expect(out.every((c) => c.source === src)).toBe(true)
  })

  it('文字列だけでも読める', () => {
    expect(readCards(['Creep — レディオヘッド'])).toHaveLength(1)
  })

  it('空でも落ちない', () => {
    expect(readCards([])).toEqual([])
    expect(readCards(null)).toEqual([])
    expect(readCards([{ text: '' }, null])).toEqual([])
  })
})

describe('Swift が種類を付けてきたとき', () => {
  // **推し量らない。**言えるようになったので言う
  it('付いた種類をそのまま使う', () => {
    const out = readCards([{ text: '渋谷', kind: 'place', sub: '東京' }])
    expect(out).toHaveLength(1)
    expect(out[0].kind).toBe(CARD.place)
    expect(out[0].title).toBe('渋谷')
    expect(out[0].sub).toBe('東京')
  })

  it('曲と場所を取り違えない', () => {
    const out = readCards([
      { text: 'Creep', kind: 'song', sub: 'レディオヘッド' },
      { text: '渋谷', kind: 'place', sub: '東京' },
    ])
    expect(out.map((c) => c.kind)).toEqual([CARD.song, CARD.place])
  })

  // **知らない名前は嘘を言わない側に倒す**
  it('知らない種類は item にする', () => {
    const out = readCards([{ text: 'なにか', kind: 'まだ無い種類', sub: '' }])
    expect(out[0].kind).toBe(CARD.item)
  })

  // 古いビルド・古い覚え
  it('種類が無ければ形から推し量る', () => {
    const out = readCards([{ text: 'Creep — レディオヘッド' }])
    expect(out[0].kind).toBe(CARD.item)
    expect(out[0].title).toBe('Creep')
    expect(out[0].sub).toBe('レディオヘッド')
  })

  it('種類が付いていれば改行では割らない', () => {
    // 付いてくるものは1件1枚。**割ると題名が壊れる**
    const out = readCards([{ text: '一行目\n二行目', kind: 'ask' }])
    expect(out).toHaveLength(1)
  })
})
