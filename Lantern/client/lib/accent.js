// 灯りの色。**選べるようにした**（2026-09-04・作者の指示
// 「Muute みたいに他の色を選べるように」）。
//
// `react-native` を読み込まない。分けているのは検査のため
// （`lib/themeMode.js` と同じ理由。当てる側は `lib/theme.js`）。
//
// ## アクセントは1色ではない
//
// 灯り色は画面の中で**10の役目**に分かれている。1つの値を差し替える形に
// すると、選んだ色によっては字が読めなくなる。
//
// いちばん分かりやすいのが `onGlow`——**灯りのボタンに載る字**。
// いまが黒なのは琥珀が明るい色だから。深い藍を選べば白へ反転が要る。
// **式で1色から作らない。** 束ごと手で決めて、目で確かめる。
//
// ## 明暗で別に持つ
//
// 当てるのは実行時なので、`global.css` の `.dark:root` より後に効く。
// つまり**こちらが明暗の面倒も見る**。片方しか持たないと、
// 夜に琥珀以外を選んだ人の画面が昼のままになる。
//
// ## 既定は「蝋燭」＝いまの琥珀そのもの
//
// 値は `client/global.css` から**そのまま写した。**
// 既定を選んでいる限り、この仕組みが入る前と1ピクセルも変わらない。

// 色は空白区切りの RGB 三値。NativeWind が
// `rgb(var(--x) / <alpha-value>)` で不透明度を解くため（`global.css`）。
//
// | 役目 | どこに出るか |
// |---|---|
// | `glow` | 灯りそのもの。ボタンの地・選択中の印 |
// | `onGlow` | **その上に載る字** |
// | `ink` | 明るい地の上のリンク・小さい字 |
// | `onInk` | `ink` を地にしたときの字 |
// | `soft` | 淡い帯（節目・お知らせ） |
// | `softInk` | その上の字 |
// | `aiSurface` / `aiInk` | Lantern の言葉 |
// | `discoverySurface` / `discoveryInk` | 今週の発見 |
export const ACCENTS = [
  {
    id: 'candle',
    label: '蝋燭',
    light: {
      glow: '251 176 59',
      onGlow: '29 29 31',
      ink: '130 85 0',
      onInk: '255 255 255',
      soft: '255 221 180',
      softInk: '99 63 0',
      aiSurface: '255 240 219',
      aiInk: '108 69 0',
      discoverySurface: '242 230 214',
      discoveryInk: '81 69 53',
    },
    dark: {
      glow: '255 185 83',
      onGlow: '29 29 31',
      ink: '255 185 83',
      onInk: '41 24 0',
      soft: '60 42 12',
      softInk: '255 221 180',
      aiSurface: '56 42 20',
      aiInk: '255 221 180',
      discoverySurface: '45 38 28',
      discoveryInk: '226 214 196',
    },
  },
  {
    id: 'moon',
    label: '月',
    light: {
      glow: '124 179 232',
      onGlow: '29 29 31',
      ink: '31 92 153',
      onInk: '255 255 255',
      soft: '215 231 247',
      softInk: '20 69 111',
      aiSurface: '232 241 250',
      aiInk: '23 83 127',
      discoverySurface: '222 231 239',
      discoveryInk: '64 81 94',
    },
    dark: {
      glow: '143 195 240',
      onGlow: '29 29 31',
      ink: '143 195 240',
      onInk: '6 36 61',
      soft: '23 50 74',
      softInk: '207 227 245',
      aiSurface: '22 41 58',
      aiInk: '207 227 245',
      discoverySurface: '30 42 51',
      discoveryInk: '195 207 216',
    },
  },
  {
    id: 'fire',
    label: '焚火',
    light: {
      glow: '242 118 75',
      onGlow: '29 29 31',
      ink: '163 54 18',
      onInk: '255 255 255',
      soft: '255 217 200',
      softInk: '122 39 8',
      aiSurface: '255 237 227',
      aiInk: '143 51 18',
      discoverySurface: '240 224 214',
      discoveryInk: '107 75 62',
    },
    dark: {
      glow: '255 154 110',
      onGlow: '29 29 31',
      ink: '255 154 110',
      onInk: '58 18 0',
      soft: '74 33 19',
      softInk: '255 217 200',
      aiSurface: '64 32 22',
      aiInk: '255 217 200',
      discoverySurface: '51 37 31',
      discoveryInk: '220 200 190',
    },
  },
  {
    id: 'firefly',
    label: '蛍',
    light: {
      glow: '163 198 68',
      onGlow: '29 29 31',
      ink: '76 107 18',
      onInk: '255 255 255',
      soft: '226 239 194',
      softInk: '53 76 10',
      aiSurface: '239 245 226',
      aiInk: '76 107 18',
      discoverySurface: '228 234 218',
      discoveryInk: '78 87 69',
    },
    dark: {
      glow: '188 217 106',
      onGlow: '29 29 31',
      ink: '188 217 106',
      onInk: '27 38 0',
      soft: '44 58 21',
      softInk: '226 239 194',
      aiSurface: '40 51 26',
      aiInk: '226 239 194',
      discoverySurface: '38 43 32',
      discoveryInk: '203 210 190',
    },
  },
  {
    id: 'ash',
    label: '灰',
    light: {
      glow: '207 202 194',
      onGlow: '29 29 31',
      ink: '74 69 61',
      onInk: '255 255 255',
      soft: '230 227 222',
      softInk: '58 54 47',
      aiSurface: '239 237 233',
      aiInk: '74 69 61',
      discoverySurface: '230 227 222',
      discoveryInk: '85 80 74',
    },
    dark: {
      glow: '201 196 187',
      onGlow: '29 29 31',
      ink: '201 196 187',
      onInk: '35 32 25',
      soft: '53 50 44',
      softInk: '222 218 211',
      aiSurface: '46 43 38',
      aiInk: '222 218 211',
      discoverySurface: '41 39 34',
      discoveryInk: '196 191 184',
    },
  },
]

export const DEFAULT_ACCENT = 'candle'

/** 覚えていた値を確かめる。知らない名前なら既定へ落とす */
export function normalizeAccent(id) {
  return ACCENTS.some((a) => a.id === id) ? id : DEFAULT_ACCENT
}

/** 見本や名前を引く。**必ず何かを返す** */
export function findAccent(id) {
  return ACCENTS.find((a) => a.id === normalizeAccent(id)) || ACCENTS[0]
}

/**
 * 設定に出す見本の色。**いま見ている側を出す**（2026-09-04）。
 *
 * 明るい側で固定していたら、暗いテーマでは**実際より淡い丸**が並んだ。
 * 選ぶ前にどうなるかを見せるための丸なので、いまの明暗に合わせる。
 */
export function accentSwatch(id, isDark) {
  const accent = findAccent(id)
  return (isDark ? accent.dark : accent.light).glow
}

/**
 * 灯り色を**そのまま使える形**で返す（2026-09-09）。
 *
 * `accentSwatch` が返すのは `"251 176 59"` という空白区切りの三つ組。
 * CSS 変数に流し込むための形で、**色として渡すと無効になる。**
 * `SwatchPicker` は `rgb(${swatch})` と包んでいたが、**包むことを
 * 知らずに SVG の `stroke` へ直に渡し、記号が消えた**（`Tile`・`Horizon`）。
 *
 * 包む側が知っていなければいけない、という作りが間違っていた。
 * **色が要るところはこちらを呼ぶ。**
 */
export function accentColor(id, isDark) {
  return `rgb(${accentSwatch(id, isDark)})`
}

// 役目 → `global.css` の変数名。**1つの役目が複数の名前を持つ。**
//
// 名前が重なっているのは移行の名残り（`global.css` の表）。
// 値はどれも同じものを指しているので、ここで一緒に塗る。
// 片方だけ塗ると、**同じ色のはずの2つが画面上で食い違う。**
const SLOT_VARS = {
  glow: ['--color-lantern-glow', '--color-lantern', '--color-primary-container'],
  onGlow: ['--color-on-lantern'],
  ink: ['--color-primary', '--color-forest', '--color-accent', '--color-amber', '--color-home-warm'],
  onInk: ['--color-primary-text', '--color-on-primary'],
  soft: ['--color-amber-light', '--color-background-info'],
  softInk: ['--color-text-info', '--color-on-primary-container', '--color-primary-hover'],
  aiSurface: ['--color-ai-surface', '--color-sage-light'],
  aiInk: ['--color-ai-ink', '--color-sage'],
  discoverySurface: ['--color-discovery-surface'],
  discoveryInk: ['--color-discovery-ink'],
}

/**
 * 当てる値の一覧を作る。**`nativewind` の `vars()` に渡す形。**
 *
 * 明暗どちらを使うかはここで決める。実行時に当てるので
 * `global.css` の `.dark:root` より後に効く（このファイルの冒頭）。
 */
export function accentVars(id, isDark) {
  const accent = findAccent(id)
  const slots = isDark ? accent.dark : accent.light
  const out = {}
  for (const [slot, names] of Object.entries(SLOT_VARS)) {
    const value = slots[slot]
    if (!value) continue
    for (const name of names) out[name] = value
  }
  return out
}
