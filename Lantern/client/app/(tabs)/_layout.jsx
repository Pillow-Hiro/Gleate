import { Tabs } from 'expo-router'
import { useWindowDimensions } from 'react-native'
import { useColorScheme } from 'nativewind'
import SidebarTabBar from '../../components/SidebarTabBar'

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
      <Tabs.Screen name="index" options={{ title: '今日' }} />
      <Tabs.Screen name="journal" options={{ title: '記録' }} />
      <Tabs.Screen name="dashboard" options={{ title: 'ダッシュボード' }} />
      <Tabs.Screen name="settings" options={{ title: '設定' }} />
    </Tabs>
  )
}
