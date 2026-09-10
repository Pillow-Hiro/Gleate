import { describe, expect, it } from 'vitest'
import { ACCENTS, DEFAULT_ACCENT, accentVars, findAccent, normalizeAccent } from './accent'

const SLOTS = [
  'glow',
  'onGlow',
  'ink',
  'onInk',
  'soft',
  'softInk',
  'aiSurface',
  'aiInk',
  'discoverySurface',
  'discoveryInk',
]

function rgb(value) {
  return value.split(' ').map(Number)
}

// WCAG の相対輝度。**コントラストを目で決めない。**
// 灯りの色は選べるようにしたので、選んだ結果 字が読めなくなる組み合わせを
// 混ぜてしまう余地ができた。ここで塞ぐ。
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

describe('灯りの色', () => {
  it('既定は蝋燭', () => {
    expect(DEFAULT_ACCENT).toBe('candle')
    expect(ACCENTS[0].id).toBe('candle')
  })

  it('知らない名前は既定へ落とす', () => {
    expect(normalizeAccent('no-such-color')).toBe(DEFAULT_ACCENT)
    expect(normalizeAccent(null)).toBe(DEFAULT_ACCENT)
    expect(normalizeAccent(undefined)).toBe(DEFAULT_ACCENT)
    expect(normalizeAccent('moon')).toBe('moon')
  })

  it('findAccent は必ず何かを返す', () => {
    expect(findAccent('nope').id).toBe(DEFAULT_ACCENT)
    expect(findAccent('fire').label).toBe('焚火')
  })

  // **役目が1つでも欠けると、その場所だけ前の色のまま残る。**
  // 明暗どちらも持つこと——実行時に当てるので `.dark:root` より後に効き、
  // 片方しか無いと夜の画面が昼のままになる（`lib/accent.js`）
  it.each(ACCENTS.map((a) => [a.id, a]))('%s は10の役目を明暗ともに持つ', (_id, accent) => {
    for (const scheme of ['light', 'dark']) {
      for (const slot of SLOTS) {
        expect(accent[scheme][slot], `${accent.id}.${scheme}.${slot}`).toMatch(
          /^\d{1,3} \d{1,3} \d{1,3}$/,
        )
      }
    }
  })

  // **灯りのボタンに載る字が読めること。**
  // いまが黒なのは琥珀が明るいから。暗い色を `glow` に選ぶと破綻する
  it.each(ACCENTS.map((a) => [a.id, a]))('%s は灯りの上の字が読める', (_id, accent) => {
    for (const scheme of ['light', 'dark']) {
      const c = contrast(accent[scheme].glow, accent[scheme].onGlow)
      expect(c, `${accent.id}.${scheme} glow/onGlow = ${c.toFixed(2)}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  // 明るい地の上の小さい字（リンク・ラベル）。地は `--color-surface`
  it.each(ACCENTS.map((a) => [a.id, a]))('%s は地の上の字が読める', (_id, accent) => {
    const grounds = { light: '249 249 251', dark: '26 28 29' }
    for (const scheme of ['light', 'dark']) {
      const c = contrast(accent[scheme].ink, grounds[scheme])
      expect(c, `${accent.id}.${scheme} ink/surface = ${c.toFixed(2)}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it.each(ACCENTS.map((a) => [a.id, a]))('%s は Gleate の言葉が読める', (_id, accent) => {
    for (const scheme of ['light', 'dark']) {
      const c = contrast(accent[scheme].aiInk, accent[scheme].aiSurface)
      expect(c, `${accent.id}.${scheme} aiInk/aiSurface = ${c.toFixed(2)}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it.each(ACCENTS.map((a) => [a.id, a]))('%s は今週の発見が読める', (_id, accent) => {
    for (const scheme of ['light', 'dark']) {
      const c = contrast(accent[scheme].discoveryInk, accent[scheme].discoverySurface)
      expect(c, `${accent.id}.${scheme} discovery = ${c.toFixed(2)}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it.each(ACCENTS.map((a) => [a.id, a]))('%s は淡い帯の上の字が読める', (_id, accent) => {
    for (const scheme of ['light', 'dark']) {
      const c = contrast(accent[scheme].softInk, accent[scheme].soft)
      expect(c, `${accent.id}.${scheme} softInk/soft = ${c.toFixed(2)}`).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('当てる値', () => {
  // **既定を選んでいる限り、この仕組みが入る前と変わらないこと。**
  // 値は `client/global.css` から写した（`lib/accent.js`）
  it('蝋燭は global.css と同じ値を出す', () => {
    const light = accentVars('candle', false)
    expect(light['--color-lantern-glow']).toBe('251 176 59')
    expect(light['--color-on-lantern']).toBe('29 29 31')
    expect(light['--color-primary']).toBe('130 85 0')
    expect(light['--color-ai-surface']).toBe('255 240 219')
    expect(light['--color-ai-ink']).toBe('108 69 0')
    expect(light['--color-sage']).toBe('108 69 0')
    expect(light['--color-sage-light']).toBe('255 240 219')
    expect(light['--color-amber-light']).toBe('255 221 180')
    expect(light['--color-discovery-surface']).toBe('242 230 214')

    const dark = accentVars('candle', true)
    expect(dark['--color-lantern-glow']).toBe('255 185 83')
    expect(dark['--color-primary']).toBe('255 185 83')
    expect(dark['--color-ai-surface']).toBe('56 42 20')
    expect(dark['--color-sage']).toBe('255 221 180')
  })

  // 名前が重なっているのは移行の名残り（`global.css` の表）。
  // **片方だけ塗ると、同じ色のはずの2つが画面上で食い違う**
  it('重なった名前も一緒に塗る', () => {
    const v = accentVars('moon', false)
    expect(v['--color-primary']).toBe(v['--color-forest'])
    expect(v['--color-primary']).toBe(v['--color-accent'])
    expect(v['--color-primary']).toBe(v['--color-amber'])
    expect(v['--color-ai-ink']).toBe(v['--color-sage'])
    expect(v['--color-ai-surface']).toBe(v['--color-sage-light'])
    expect(v['--color-lantern-glow']).toBe(v['--color-lantern'])
  })

  it('明暗で別の値が出る', () => {
    expect(accentVars('fire', false)['--color-lantern-glow']).not.toBe(
      accentVars('fire', true)['--color-lantern-glow'],
    )
  })

  it('知らない名前でも既定で塗る', () => {
    expect(accentVars('nope', false)).toEqual(accentVars('candle', false))
  })
})
