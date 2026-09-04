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
// ## 暗いときは、はっきり振る（2026-09-04）
//
// 作者から「白と灰白の違いが分からない」「ダークモードになったときに
// 分かりにくい」。**どちらもそのとおりだった。**
//
// 最初に置いた4つは、暗い側の値が互いに 2〜5 しか違わなかった。
// 明るい側と同じ加減で振ったせいで、**暗い地では差が見えない。**
// 灰白は明るい側でも白と見分けがつかず、落とした。
//
// 暗い地は振れる幅が広い。字が明るい側にあるので、地を深くしても
// 読みやすさが減らない。**明暗で振り幅を変える。**
//
// 残したのは、**方向の違う4つ**——中立（白）・暖（生成り／象牙）・
// 寒（月白）。同じ方向で濃さだけ違うものは並べない。見分けられない。
//
// ## 既定は「白」＝いまのまま
//
// 値は `client/global.css` から写した。既定を選んでいる限り、
// この仕組みが入る前と変わらない。

export const PAPERS = [
  {
    id: 'white',
    label: '白',
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
    light: {
      ground: '250 246 238',
      lowest: '255 253 248',
      low: '245 240 230',
      mid: '240 234 223',
      high: '234 228 216',
      highest: '228 221 209',
    },
    dark: {
      ground: '36 30 22',
      lowest: '25 21 15',
      low: '45 38 28',
      mid: '52 44 33',
      high: '60 51 39',
      highest: '68 58 45',
    },
  },
  {
    id: 'ivory',
    label: '象牙',
    light: {
      ground: '247 241 227',
      lowest: '255 251 241',
      low: '242 235 219',
      mid: '237 229 211',
      high: '231 222 202',
      highest: '225 215 193',
    },
    dark: {
      ground: '56 45 30',
      lowest: '42 34 22',
      low: '66 54 36',
      mid: '74 61 41',
      high: '84 69 47',
      highest: '94 77 53',
    },
  },
  {
    id: 'moonwhite',
    label: '月白',
    light: {
      ground: '240 244 250',
      lowest: '252 253 255',
      low: '233 238 246',
      mid: '226 232 242',
      high: '218 226 238',
      highest: '210 219 233',
    },
    dark: {
      ground: '20 25 40',
      lowest: '14 17 28',
      low: '28 34 50',
      mid: '34 41 58',
      high: '41 49 67',
      highest: '49 57 76',
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

/**
 * 設定に出す見本の色。**いま見ている側を出す**（2026-09-04）。
 *
 * 明るい側の色で固定していたら、**暗いテーマでは白い丸が4つ並んだ。**
 * 選ぶ前にどうなるかを見せるための丸なので、いまの明暗に合わせる。
 */
export function paperSwatch(id, isDark) {
  const paper = findPaper(id)
  return (isDark ? paper.dark : paper.light).ground
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
