// タブバーまわりの寸法。**ネイティブ版。Web 版は `tabBar.web.js`。**
//
// ネイティブは `app/(tabs)/_layout.jsx` が本物の `UITabBar`
// （`NativeTabs`）を出す。
//
// **2026-08-14 まで 0 を返していた。** OS が内容の余白を入れる前提だったが、
// 実機で「ボトムバーが他の要素と被る」と言われた。
// iOS 26 のタブバーは**浮いたカプセル**で、内容の上に重なる。
// 素の `ScrollView` には余白が入らない。
//
// **足りないより余る方がよい。** 下に空きができるだけで済むが、
// 足りないと最後の記録が読めない。
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export const WIDE_SCREEN_MIN_WIDTH = 768

// Web 版と同じ名前を出しておく。画面はどちらでも同じ書き方で済む。
export const TAB_BAR_HEIGHT = 56

// 画面の一番下と内容のあいだの余白（元は className の `pb-10`）。
export const BOTTOM_GAP = 40

/**
 * 画面の一番下に空ける余白。
 *
 * タブバーの高さ ＋ ホームインジケータの分。
 */
export function useTabBarInset() {
  const insets = useSafeAreaInsets()
  return TAB_BAR_HEIGHT + insets.bottom
}

