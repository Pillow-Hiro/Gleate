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
