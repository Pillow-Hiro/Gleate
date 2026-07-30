import { Tabs } from 'expo-router'
import { useColorScheme } from 'nativewind'

// タブ項目はWeb版のSidebar/HamburgerMenuと同じ4つを維持する。
// 表示形態のみサイドバー→ボトムタブに変わる。
// 「振り返り」はJournal内のタブへ統合したため、ここには置かない。
const THEME = {
  light: { bg: '#faf9f7', border: 'rgba(0,0,0,0.08)', active: '#2d4a3e', inactive: '#999999' },
  dark: { bg: '#1c1c1e', border: 'rgba(255,255,255,0.10)', active: '#5fa882', inactive: '#636366' },
}

export default function TabsLayout() {
  const { colorScheme } = useColorScheme()
  const c = THEME[colorScheme === 'dark' ? 'dark' : 'light']

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.active,
        tabBarInactiveTintColor: c.inactive,
        tabBarStyle: { backgroundColor: c.bg, borderTopColor: c.border },
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
