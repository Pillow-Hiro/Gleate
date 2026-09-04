// 紙の色。**白以外も選べる**（2026-09-04・作者の指示）。
//
// `react-native` を読み込まない。検査のために分けている
// （`lib/accent.js` と対。当てる側は `lib/theme.js` / `app/_layout.jsx`）。
//
// ## 一枚ではなく梯子
//
// 地は6段ある。`DESIGN.md` は**深さを影ではなく地の色の段差で出す**
// （Tonal Layers）。1段だけ替えると段差が壊れて、沈んでいたものが
// 浮いて見える。**梯子ごと持つ。**
//
//     ground   … 画面の地
//     lowest   … カード（地より明るい side）
//     low / mid / high / highest … 沈む面
//
// ## カードは白のままに寄せる
//
// 地を暖色に振っても、**カードは紙の白さを保つ。**
// Lantern の言葉（`ai-surface`）はカードの中に敷かれるので、
// カードまで暖色にすると両方が溶けて境目が消える。
// 検査で全部の組み合わせを見ている（`paper.test.js`）。
//
// ## 既定は「白」＝いまのまま
//
// 値は `client/global.css` から写した。既定を選んでいる限り、
// この仕組みが入る前と変わらない。

export const PAPERS = [
  {
    id: 'white',
    label: '白',
    swatch: '249 249 251',
    light: {
      ground: '249 249 251',
      lowest: '255 255 255',
      low: '243 243 245',
      mid: '238 238 240',
      high: '232 232 234',
      highest: '226 226 228',
    },
    dark: {
      ground: '26 28 29',
      lowest: '18 20 21',
      low: '34 36 37',
      mid: '40 42 43',
      high: '47 49 50',
      highest: '55 57 58',
    },
  },
  {
    id: 'natural',
    label: '生成り',
    swatch: '250 246 238',
    light: {
      ground: '250 246 238',
      lowest: '255 253 248',
      low: '245 240 230',
      mid: '240 234 223',
      high: '234 228 216',
      highest: '228 221 209',
    },
    dark: {
      ground: '28 26 23',
      lowest: '20 19 17',
      low: '36 34 30',
      mid: '42 40 35',
      high: '49 46 41',
      highest: '57 54 48',
    },
  },
  {
    id: 'ivory',
    label: '象牙',
    swatch: '247 242 230',
    light: {
      ground: '247 242 230',
      lowest: '255 251 242',
      low: '242 236 222',
      mid: '237 230 214',
      high: '231 223 206',
      highest: '225 216 198',
    },
    dark: {
      ground: '31 28 23',
      lowest: '22 20 16',
      low: '40 36 30',
      mid: '46 42 35',
      high: '53 48 40',
      highest: '61 55 46',
    },
  },
  {
    id: 'grey',
    label: '灰白',
    swatch: '244 244 246',
    light: {
      ground: '244 244 246',
      lowest: '253 253 255',
      low: '238 238 241',
      mid: '233 233 236',
      high: '227 227 230',
      highest: '221 221 225',
    },
    dark: {
      ground: '24 25 27',
      lowest: '16 17 19',
      low: '32 33 35',
      mid: '38 39 41',
      high: '45 46 48',
      highest: '53 54 56',
    },
  },
]

export const DEFAULT_PAPER = 'white'

/** 覚えていた値を確かめる。知らない名前なら既定へ落とす */
export function normalizePaper(id) {
  return PAPERS.some((p) => p.id === id) ? id : DEFAULT_PAPER
}

/** 見本や名前を引く。**必ず何かを返す** */
export function findPaper(id) {
  return PAPERS.find((p) => p.id === normalizePaper(id)) || PAPERS[0]
}

// 段 → `global.css` の変数名。**古い名前も一緒に塗る。**
// 名前が重なっているのは移行の名残り（`global.css` の表）で、
// 片方だけ塗ると同じはずの2つが画面上で食い違う。
const STEP_VARS = {
  ground: ['--color-surface', '--color-cream', '--color-home-bg'],
  lowest: ['--color-surface-container-lowest'],
  low: ['--color-surface-container-low', '--color-stone'],
  mid: ['--color-surface-container'],
  high: ['--color-surface-container-high', '--color-parchment'],
  highest: ['--color-surface-container-highest'],
}

/** 当てる値の一覧。**`nativewind` の `vars()` に渡す形** */
export function paperVars(id, isDark) {
  const paper = findPaper(id)
  const steps = isDark ? paper.dark : paper.light
  const out = {}
  for (const [step, names] of Object.entries(STEP_VARS)) {
    const value = steps[step]
    if (!value) continue
    for (const name of names) out[name] = value
  }
  return out
}
