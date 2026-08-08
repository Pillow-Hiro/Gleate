import { Pressable, View } from 'react-native'
import Text from './Text'
import Svg, { Circle, Line, Path } from 'react-native-svg'
import { TAB_ICONS } from './TabIcons'
import { useThemeContext } from '../lib/theme'
import { APP_VERSION } from '../constants'

// 広い画面用のサイドバー。expo-router の Tabs に tabBar として渡す。
//
// 組み込みの tabBarPosition="left" でもサイドバーにはなるが、
// ロゴ・タグライン・バージョン・テーマ切替を差し込む場所が無く、
// アクティブ色も既定の青のままで Lantern の配色から外れる。
// そのため描画だけ自前で持つ。項目の状態と遷移は Tabs 側から受け取る。
//
// 旧 frontend/src/components/Sidebar.jsx の移植。
// 配色トークンは Web 版と同一のため className をそのまま使える。

// タブのアイコンは components/TabIcons.jsx に置いてある。
// ボトムタブ（(tabs)/_layout.jsx）と同じものを使う。
// 2026-08-07 まではここにだけ定義しており、ボトムタブには
// アイコンが無かった（実機で三角が並んでいた）。

function ThemeIcon({ isDark, color }) {
  if (isDark) {
    return (
      <Svg width={14} height={14} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" viewBox="0 0 14 14">
        <Circle cx="7" cy="7" r="2.5" />
        <Line x1="7" y1="1" x2="7" y2="2.5" />
        <Line x1="7" y1="11.5" x2="7" y2="13" />
        <Line x1="1" y1="7" x2="2.5" y2="7" />
        <Line x1="11.5" y1="7" x2="13" y2="7" />
        <Line x1="2.93" y1="2.93" x2="4.05" y2="4.05" />
        <Line x1="9.95" y1="9.95" x2="11.07" y2="11.07" />
        <Line x1="2.93" y1="11.07" x2="4.05" y2="9.95" />
        <Line x1="9.95" y1="4.05" x2="11.07" y2="2.93" />
      </Svg>
    )
  }
  return (
    <Svg width={14} height={14} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" viewBox="0 0 14 14">
      <Path d="M12 9.5A5.5 5.5 0 1 1 4.5 2a4 4 0 0 0 7.5 7.5z" />
    </Svg>
  )
}

// 旧 Web は w-56（224px）だったが、実機で見て広かったため w-48 まで詰めた。
const SIDEBAR_WIDTH = 192

export default function SidebarTabBar({ state, descriptors, navigation }) {
  const { isDark, toggleTheme } = useThemeContext()

  // アイコンの色は className では渡せないため、ここだけ値で持つ。
  // global.css の --color-forest / --color-ink-soft / --color-ink-faint に対応する。
  const activeColor = isDark ? '#5fa882' : '#2d4a3e'
  const inactiveColor = isDark ? '#8a8a8e' : '#6b6b66'
  const faintColor = isDark ? '#636366' : '#999999'

  return (
    <View
      className="bg-stone border-r border-border"
      style={{ width: SIDEBAR_WIDTH, borderRightWidth: 1 }}
    >
      <View className="px-5 py-6 border-b border-border" style={{ borderBottomWidth: 1 }}>
        <Text className="font-display text-body text-ink" style={{ letterSpacing: 3 }}>
          Lantern
        </Text>
        <Text className="text-[10px] text-ink-faint mt-1">あなたの道は、あなたが照らす。</Text>
      </View>

      <View className="flex-1 px-3 py-4 gap-0.5">
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]
          const label = options.title ?? route.name
          const isActive = state.index === index
          const Icon = TAB_ICONS[route.name]

          function handlePress() {
            // React Navigation の作法。既定動作を止められるようにイベントを発行する
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            })
            if (!isActive && !event.defaultPrevented) {
              navigation.navigate(route.name)
            }
          }

          return (
            <Pressable
              key={route.key}
              onPress={handlePress}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              className={`flex-row items-center gap-2.5 px-3 py-2 rounded ${
                isActive ? 'bg-sage-light' : ''
              }`}
            >
              {Icon ? <Icon color={isActive ? activeColor : inactiveColor} /> : null}
              <Text className={`text-body ${isActive ? 'text-forest' : 'text-ink-soft'}`}>
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <View
        className="px-4 pb-5 pt-3 border-t border-border flex-row items-center justify-between"
        style={{ borderTopWidth: 1 }}
      >
        <Text className="text-[10px] text-ink-faint">Lantern {APP_VERSION}</Text>
        <Pressable
          onPress={toggleTheme}
          className="p-1 rounded"
          accessibilityRole="button"
          accessibilityLabel={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
        >
          <ThemeIcon isDark={isDark} color={faintColor} />
        </Pressable>
      </View>
    </View>
  )
}
