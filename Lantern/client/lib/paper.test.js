import { describe, expect, it } from 'vitest'
import { PAPERS, DEFAULT_PAPER, findPaper, normalizePaper, paperVars } from './paper'
import { ACCENTS } from './accent'

const STEPS = ['ground', 'lowest', 'low', 'mid', 'high', 'highest']

function rgb(value) {
  return value.split(' ').map(Number)
}

function luminance([r, g, b]) {
  const f = (c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

function contrast(a, b) {
  const [x, y] = [luminance(rgb(a)), luminance(rgb(b))]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

// 本文の色（`global.css`）。紙を替えても、これは替わらない
const BODY = { light: '29 29 31', dark: '240 240 242' }
// 弱いラベル。**いちばん薄い字**なので、ここが通れば他も通る
const FAINT = { light: '132 117 99', dark: '152 140 126' }

describe('紙の色', () => {
  it('既定は白', () => {
    expect(DEFAULT_PAPER).toBe('white')
    expect(PAPERS[0].id).toBe('white')
  })

  it('知らない名前は既定へ落とす', () => {
    expect(normalizePaper('sepia')).toBe(DEFAULT_PAPER)
    expect(normalizePaper(null)).toBe(DEFAULT_PAPER)
    expect(findPaper('nope').id).toBe(DEFAULT_PAPER)
  })

  it.each(PAPERS.map((p) => [p.id, p]))('%s は6段を明暗ともに持つ', (_id, paper) => {
    for (const scheme of ['light', 'dark']) {
      for (const step of STEPS) {
        expect(paper[scheme][step], `${paper.id}.${scheme}.${step}`).toMatch(
          /^\d{1,3} \d{1,3} \d{1,3}$/,
        )
      }
    }
  })

  // **本文が読めること。** 紙を替えても字の色は替わらないので、
  // 暗い紙を混ぜると本文が沈む
  it.each(PAPERS.map((p) => [p.id, p]))('%s の上で本文が読める', (_id, paper) => {
    for (const scheme of ['light', 'dark']) {
      for (const step of STEPS) {
        const c = contrast(BODY[scheme], paper[scheme][step])
        expect(c, `${paper.id}.${scheme}.${step} = ${c.toFixed(2)}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it.each(PAPERS.map((p) => [p.id, p]))('%s の上で弱いラベルも読める', (_id, paper) => {
    for (const scheme of ['light', 'dark']) {
      const c = contrast(FAINT[scheme], paper[scheme].ground)
      expect(c, `${paper.id}.${scheme} faint = ${c.toFixed(2)}`).toBeGreaterThanOrEqual(3)
    }
  })

  // **梯子が潰れていないこと。** 深さは影ではなく地の段差で出す
  // （`DESIGN.md` の Tonal Layers）。同じ値が並ぶと沈んだ面が浮く
  it.each(PAPERS.map((p) => [p.id, p]))('%s は段が重ならない', (_id, paper) => {
    for (const scheme of ['light', 'dark']) {
      const values = STEPS.map((s) => paper[scheme][s])
      expect(new Set(values).size, `${paper.id}.${scheme}`).toBe(STEPS.length)
    }
  })
})

// **紙と灯りは別々に選べる。** 20通りの組み合わせが起きる。
// 片方だけ見て決めると、混ぜたときに溶ける組み合わせを見逃す。
describe('紙と灯りの組み合わせ', () => {
  const combos = PAPERS.flatMap((p) => ACCENTS.map((a) => [`${p.id}+${a.id}`, p, a]))

  // Lantern の言葉は**カードの中**に敷かれる（`HomeCard` / `LogDetail`）。
  // だから比べる相手は地ではなくカード（`lowest`）。
  // ここが 1.0 に近いと、返事の面が消えて字だけが浮く
  it.each(combos)('%s は Lantern の面がカードから見分けられる', (_name, paper, accent) => {
    for (const scheme of ['light', 'dark']) {
      const c = contrast(accent[scheme].aiSurface, paper[scheme].lowest)
      expect(c, `${paper.id}+${accent.id}.${scheme} = ${c.toFixed(3)}`).toBeGreaterThanOrEqual(1.04)
    }
  })

  it.each(combos)('%s は今週の発見の面が見分けられる', (_name, paper, accent) => {
    for (const scheme of ['light', 'dark']) {
      const c = contrast(accent[scheme].discoverySurface, paper[scheme].lowest)
      expect(c, `${paper.id}+${accent.id}.${scheme} = ${c.toFixed(3)}`).toBeGreaterThanOrEqual(1.04)
    }
  })

  // 灯り色の字は**地の上にもカードの上にも**載る。両方で読めること
  it.each(combos)('%s は灯り色の字が地でもカードでも読める', (_name, paper, accent) => {
    for (const scheme of ['light', 'dark']) {
      for (const step of ['ground', 'lowest']) {
        const c = contrast(accent[scheme].ink, paper[scheme][step])
        expect(
          c,
          `${paper.id}+${accent.id}.${scheme}.${step} = ${c.toFixed(2)}`,
        ).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})

describe('当てる値', () => {
  // **既定を選んでいる限り、この仕組みが入る前と変わらないこと。**
  // 値は `client/global.css` から写した
  it('白は global.css と同じ値を出す', () => {
    const light = paperVars('white', false)
    expect(light['--color-surface']).toBe('249 249 251')
    expect(light['--color-surface-container-lowest']).toBe('255 255 255')
    expect(light['--color-surface-container-low']).toBe('243 243 245')
    expect(light['--color-surface-container-high']).toBe('232 232 234')

    const dark = paperVars('white', true)
    expect(dark['--color-surface']).toBe('26 28 29')
    expect(dark['--color-surface-container-lowest']).toBe('18 20 21')
  })

  it('古い名前も一緒に塗る', () => {
    const v = paperVars('natural', false)
    expect(v['--color-cream']).toBe(v['--color-surface'])
    expect(v['--color-home-bg']).toBe(v['--color-surface'])
    expect(v['--color-stone']).toBe(v['--color-surface-container-low'])
    expect(v['--color-parchment']).toBe(v['--color-surface-container-high'])
  })

  it('知らない名前でも既定で塗る', () => {
    expect(paperVars('nope', false)).toEqual(paperVars('white', false))
  })
})
