import { Tabs } from 'expo-router'
import { StyleSheet, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useColorScheme } from 'nativewind'
import { BlurView } from 'expo-blur'
import SidebarTabBar from '../../components/SidebarTabBar'
import { TAB_ICONS } from '../../components/TabIcons'
import { TAB_BAR_HEIGHT, WIDE_SCREEN_MIN_WIDTH } from '../../lib/tabBar'

// **Web 専用。ネイティブは `_layout.jsx` が本物の `UITabBar` を出す。**
//
// 分けたのは、ロゴ・タグライン・バージョン・テーマ切替を持つサイドバーを
// `NativeTabs` に差し込めないため。Web は今までどおり自前で描く。
//
// タブ項目は4つ。「振り返り」はJournal内のタブへ統合したためここには置かない。
// 画面が広いときはサイドバー、狭いときはボトムタブにする。

const THEME = {
  // 値は DESIGN.md（lantern-glow / outline / border）。
  // クラス名を渡せない場所なので、パレットを変えたらここも直す。
  light: { border: 'rgba(0,0,0,0.10)', active: '#825500', inactive: '#847563', blur: 'systemChromeMaterialLight' },
  dark: { border: 'rgba(255,255,255,0.12)', active: '#FFB953', inactive: '#988C7E', blur: 'systemChromeMaterialDark' },
}

// **並びとラベルはネイティブ版（`_layout.jsx`）と揃える。**
// 片方だけ直すと、Web と実機で並びが食い違う。
//
// 起動時に開くのは「書く」（`index`）。並びの1番目ではない。
// 「振り返り」という名前は使わない。隣の「記録」と意味が近いため。
const TABS = [
  { name: 'home', title: 'ホーム' },
  { name: 'journal', title: '記録' },
  { name: 'index', title: '書く' },
  { name: 'dashboard', title: 'ダッシュボード' },
  { name: 'settings', title: '設定' },
]

export default function TabsLayout() {
  const { colorScheme } = useColorScheme()
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const c = THEME[colorScheme === 'dark' ? 'dark' : 'light']
  const isWide = width >= WIDE_SCREEN_MIN_WIDTH

  // **Web のタブバーはすりガラス（`backdrop-filter`）。**
  //
  // Liquid Glass は iOS の素材なので Web には無い。
  // ネイティブは `_layout.jsx` が本物の `UITabBar` を出す。
  //
  // **透けさせるには絶対配置が要る。** そのぶん画面の一番下が
  // 裏に隠れるので、各画面が `useTabBarInset()` の分だけ下を空ける。
  // 高さをここで固定しているのは、画面側と食い違わせないため。
  const frostedTabBar = {
    tabBarBackground: () => (
      <BlurView tint={c.blur} intensity={80} style={StyleSheet.absoluteFill} />
    ),
    tabBarStyle: {
      position: 'absolute',
      backgroundColor: 'transparent',
      borderTopColor: c.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      // Android の影。すりガラスの上に落ちると濁って見える
      elevation: 0,
      height: TAB_BAR_HEIGHT + insets.bottom,
      paddingBottom: insets.bottom,
      paddingTop: 6,
    },
  }

  return (
    <Tabs
      tabBar={isWide ? (props) => <SidebarTabBar {...props} /> : undefined}
      screenOptions={{
        headerShown: false,
        tabBarPosition: isWide ? 'left' : 'bottom',
        tabBarActiveTintColor: c.active,
        tabBarInactiveTintColor: c.inactive,
        tabBarLabelStyle: { fontSize: 11 },
        // 広いときの描画は SidebarTabBar が持つので、すりガラスは渡さない
        ...(isWide ? {} : frostedTabBar),
      }}
    >
      {TABS.map(({ name, title }) => {
        const Icon = TAB_ICONS[name]
        return (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title,
              // **これを渡さないと、React Navigation の既定表示（塗りつぶした
              // 三角）が出る。** 2026-08-07 まで渡しておらず、実機で
              // 4つとも同じ三角が並んでいた。
              // サイドバーは自前で描くので、ここはボトムタブ用。
              tabBarIcon: ({ color }) => <Icon color={color} size={22} />,
            }}
          />
        )
      })}
    </Tabs>
  )
}
