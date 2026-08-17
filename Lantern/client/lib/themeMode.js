// 外観の決め方だけ。**`react-native` を読み込まない。**
//
// 分けているのは検査のため（`lib/keyboardMath.js` と同じ理由）。
// 実際に色を切り替える側は `lib/theme.js`。

/**
 * 選べる3つ。**`system` を先頭に置く**（既定であり、iOS の並びもこの順）。
 */
export const THEME_MODES = ['system', 'light', 'dark']

export const THEME_LABELS = {
  system: '端末に合わせる',
  light: 'ライト',
  dark: 'ダーク',
}

/**
 * 既定は `system`。
 *
 * 2026-08-17 まで「ライト固定・切り替えたらダーク」の2択だった。
 * 端末を夜モードにしている人が、Lantern だけ白いまま、という状態になる。
 * **記録は夜に書かれることが多い**ので、そこは端末に合わせる方がよい。
 *
 * すでに自分で選んだ人（`light` / `dark` が保存されている人）は
 * そのまま。変わるのは**一度も触っていない人**だけ。
 */
export const DEFAULT_MODE = 'system'

/** 保存されていた文字列を、選べる3つのどれかに直す。**知らない値は既定へ** */
export function normalizeMode(stored) {
  return THEME_MODES.includes(stored) ? stored : DEFAULT_MODE
}

/**
 * いま暗くするかどうか。
 *
 * `system` のときだけ端末の設定を見る。端末が答えられないこと
 * （`null` が来る）もあるので、そのときは明るい方に倒す。
 */
export function resolveIsDark(mode, deviceScheme) {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  return deviceScheme === 'dark'
}

/**
 * NativeWind に渡す値。**ネイティブと Web で渡すものが違う。**
 *
 * ネイティブ … `system` をそのまま渡す。中で `Appearance` の上書きを
 *   外してくれるので、アプリを開いたまま端末の設定を変えても追従する。
 *   ここで `light` / `dark` に潰すと、その上書きが残って追従しなくなる。
 *
 * Web … `system` を渡すと `<html>` から `dark` が**外れる**
 *   （react-native-css-interop の web 実装。`darkMode: 'class'` のとき、
 *   `dark` を付けるのは値が正確に `'dark'` のときだけ）。
 *   端末が夜モードでも Tailwind の `dark:` が効かなくなるので、
 *   Web にはこちらで解決済みの明暗を渡す。
 *
 * 追従は `resolveIsDark()` 側が端末の値を見ているので保たれる。
 */
export function nativewindScheme(mode, isDark, isWeb) {
  if (isWeb) return isDark ? 'dark' : 'light'
  return normalizeMode(mode)
}

/**
 * 明暗を1回で切り替えたときの行き先（Web のサイドバーのボタン）。
 *
 * **`system` からは、いま見えているものの逆へ。** 押した人が期待するのは
 * 「今と違う方」であって、「端末の設定」ではない。
 */
export function toggledMode(isDark) {
  return isDark ? 'light' : 'dark'
}
