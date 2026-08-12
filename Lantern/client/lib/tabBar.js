import { useSafeAreaInsets } from 'react-native-safe-area-context'

// タブバーまわりの寸法。**ネイティブ版。Web 版は `tabBar.web.js`。**
//
// ネイティブは `app/(tabs)/_layout.jsx` が本物の `UITabBar`
// （`NativeTabs`）を出す。**内容の余白は OS が持つ**ので、
// 画面側は下を空けない。空けると二重になる。
//
// Web は自前のタブバーを絶対配置で浮かせているため、
// 画面側が余白を持つ必要がある。そちらは `tabBar.web.js`。

export const WIDE_SCREEN_MIN_WIDTH = 768

// Web 版と同じ名前を出しておく。画面はどちらでも同じ書き方で済む。
export const TAB_BAR_HEIGHT = 56

// 画面の一番下と内容のあいだの余白（元は className の `pb-10`）。
export const BOTTOM_GAP = 40

/**
 * 画面の一番下に空ける余白。
 *
 * **ネイティブでは 0。** `NativeTabs` が内容の余白を入れる。
 */
export function useTabBarInset() {
  return 0
}

/**
 * 絶対配置で浮かせるもの（FAB）の下端。
 *
 * **スクロールの余白とは別の値が要る。**
 * `NativeTabs` が入れてくれるのは**中身の余白だけ**で、
 * 絶対配置の要素は面倒を見てくれない。
 * iOS 26 のタブバーは内容の上に浮くので、`bottom: 24` だと裏に隠れる。
 * 2026-08-12 に実機で「隠れていて押しづらい」と指摘された。
 *
 * ホームインジケータ＋タブバーの高さ＋余白の分だけ上げる。
 */
export function useFabOffset() {
  const insets = useSafeAreaInsets()
  return insets.bottom + 76
}
