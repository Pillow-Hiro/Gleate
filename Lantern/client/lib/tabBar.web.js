import { useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// タブバーの寸法と、画面側が空ける余白。**両方をここで決める。**
//
// 2026-08-08 にボトムタブをすりガラス（`expo-blur`）にした。
// すりガラスは**後ろに何か通らないと意味がない**ので、
// タブバーを絶対配置にして内容の上に浮かせている。
//
// 浮かせた結果、各画面の一番下がタブバーの裏に隠れる。
// React Navigation は自前の ScrollView に余白を入れてくれないので、
// 画面側が `useTabBarInset()` の分だけ下を空ける。
//
// **高さを固定しているのはそのため。** 既定のままだと実測しないと
// 分からず、画面側と食い違う。

export const WIDE_SCREEN_MIN_WIDTH = 768

// アイコン22px + ラベル11px + 上下の余白。
export const TAB_BAR_HEIGHT = 56

// 画面の一番下と内容のあいだの余白（元は className の `pb-10`）。
// **`contentContainerStyle` は className を上書きするため、
// ここに畳んで一緒に渡す。** 片方だけ残すと余白が消える。
export const BOTTOM_GAP = 40

/**
 * 画面の一番下に空ける余白。
 *
 * 広い画面ではサイドバーになり、下には何も無いので 0。
 */
export function useTabBarInset() {
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  if (width >= WIDE_SCREEN_MIN_WIDTH) return 0
  return TAB_BAR_HEIGHT + insets.bottom
}

/** 絶対配置で浮かせるもの（FAB）の下端。Web はタブバーの分だけ上げる。 */
export function useFabOffset() {
  return useTabBarInset() + 24
}
