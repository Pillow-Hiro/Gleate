import { Tabs } from 'expo-router'
import { useWindowDimensions } from 'react-native'
import { useColorScheme } from 'nativewind'
import SidebarTabBar from '../../components/SidebarTabBar'
import { TAB_ICONS } from '../../components/TabIcons'

// タブ項目は4つ。「振り返り」はJournal内のタブへ統合したためここには置かない。
//
// 画面が広いときはサイドバー、狭いときはボトムタブにする。
// ネイティブは実質すべて狭い側に入るのでボトムタブになる。
//
// 広いときは描画を SidebarTabBar に差し替える。
// 組み込みの tabBarPosition="left" だけでもサイドバーの形にはなるが、
// ロゴ・タグライン・バージョン・テーマ切替を差し込む場所が無く、
// 既定の幅が広すぎ、アクティブ色も青のままで Lantern の配色から外れる。
const WIDE_SCREEN_MIN_WIDTH = 768

const THEME = {
  light: { bg: '#faf9f7', border: 'rgba(0,0,0,0.08)', active: '#2d4a3e', inactive: '#999999' },
  dark: { bg: '#1c1c1e', border: 'rgba(255,255,255,0.10)', active: '#5fa882', inactive: '#636366' },
}

// ラベルは「そこで何をするか」にする。
//
// 2026-08-07 まで「今日」だった。実機で「何をするセクションなのか
// 分からない」と指摘された。**「今日」は時点であって、行為ではない。**
// 隣が「記録」なので、どちらも記録に関する場所に見えてしまう。
//
// 「書く」（これから残す）と「記録」（残したもの）で役割が分かれる。
const TABS = [
  { name: 'index', title: '書く' },
  { name: 'journal', title: '記録' },
  { name: 'dashboard', title: 'ダッシュボード' },
  { name: 'settings', title: '設定' },
]

export default function TabsLayout() {
  const { colorScheme } = useColorScheme()
  const { width } = useWindowDimensions()
  const c = THEME[colorScheme === 'dark' ? 'dark' : 'light']
  const isWide = width >= WIDE_SCREEN_MIN_WIDTH

  return (
    <Tabs
      tabBar={isWide ? (props) => <SidebarTabBar {...props} /> : undefined}
      screenOptions={{
        headerShown: false,
        tabBarPosition: isWide ? 'left' : 'bottom',
        tabBarActiveTintColor: c.active,
        tabBarInactiveTintColor: c.inactive,
        tabBarStyle: {
          backgroundColor: c.bg,
          // サイドバーのときは右側、ボトムタブのときは上側に境界線が出る
          borderTopColor: c.border,
          borderRightColor: c.border,
        },
        tabBarLabelStyle: { fontSize: 11 },
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
