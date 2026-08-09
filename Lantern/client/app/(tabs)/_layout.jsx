import { Tabs } from 'expo-router'
import { StyleSheet, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useColorScheme } from 'nativewind'
import { BlurView } from 'expo-blur'
import SidebarTabBar from '../../components/SidebarTabBar'
import { TAB_ICONS } from '../../components/TabIcons'
import { TAB_BAR_HEIGHT, WIDE_SCREEN_MIN_WIDTH } from '../../lib/tabBar'

// タブ項目は4つ。「振り返り」はJournal内のタブへ統合したためここには置かない。
//
// 画面が広いときはサイドバー、狭いときはボトムタブにする。
// ネイティブは実質すべて狭い側に入るのでボトムタブになる。
//
// 広いときは描画を SidebarTabBar に差し替える。
// 組み込みの tabBarPosition="left" だけでもサイドバーの形にはなるが、
// ロゴ・タグライン・バージョン・テーマ切替を差し込む場所が無く、
// 既定の幅が広すぎ、アクティブ色も青のままで Lantern の配色から外れる。

// **`expo-glass-effect` を静的 import しないこと。**
//
// このパッケージは読み込んだ時点でネイティブを要求する。
//
//     const NativeGlassView = requireNativeViewManager('ExpoGlassEffect', 'GlassView')
//     requireNativeModule('ExpoGlassEffect')   // 任意版ではない。無ければ throw
//
// ネイティブモジュールを持たないビルドにこのJSが届くと、
// **画面を描く前に import だけで落ちる。**
//
// **そして実際に届きうる。** 2026-08-09 に確かめたところ、
// `expo-glass-effect` を足したビルド #7 の指紋が、足していない #6 と
// 同一だった（どちらも `4ff774b0…`）。EAS Update はこの2つを区別できない。
//
//     build 7  fp=4ff774b0…  (e47a369・glass あり)
//     build 6  fp=4ff774b0…  (17135f4・glass なし)
//
// 指紋の側は直せないので、**JS の側で落ちないようにする。**
// 読み込みを遅らせ、失敗したら「使えない」として扱う。
let glassRuntime
function getGlass() {
  if (glassRuntime === undefined) {
    try {
      const m = require('expo-glass-effect')
      glassRuntime = { GlassView: m.GlassView, available: m.isLiquidGlassAvailable() }
    } catch (e) {
      // モジュールを持たないビルド。すりガラスで代替する
      glassRuntime = { GlassView: null, available: false }
    }
  }
  return glassRuntime
}

const THEME = {
  // 値は DESIGN.md（lantern-glow / outline / border）。
  // クラス名を渡せない場所なので、パレットを変えたらここも直す。
  light: { border: 'rgba(0,0,0,0.10)', active: '#825500', inactive: '#847563', blur: 'systemChromeMaterialLight' },
  dark: { border: 'rgba(255,255,255,0.12)', active: '#FFB953', inactive: '#988C7E', blur: 'systemChromeMaterialDark' },
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
  const insets = useSafeAreaInsets()
  const c = THEME[colorScheme === 'dark' ? 'dark' : 'light']
  const isWide = width >= WIDE_SCREEN_MIN_WIDTH
  // iOS 26 以上で、かつネイティブモジュールを持つビルドのときだけ true。
  // 読み込みに失敗しても false になる（上の getGlass を参照）。
  const { GlassView, available: liquidGlass } = getGlass()

  // **タブバーの素材（2026-08-09 に本物へ差し替えた）。**
  //
  // 実機で「下のタブを Liquid Glass に」と指摘された。
  // 2026-08-08 に `expo-blur` の `systemChromeMaterial` を入れたが、
  // **あれは iOS 7 以来の `UIVisualEffectView` で、Liquid Glass ではない。**
  // 屈折も鏡面ハイライトもスクロールに応じた変形も持たない。
  //
  // 本物は `UIGlassEffect`（iOS 26 以上）。`expo-glass-effect` が包んでいる。
  // **iOS 26 未満・Android・Web・モジュールを持たないビルド**では
  // 今までどおり `expo-blur` を出す。
  //
  // **濃さや色を自前で作らない。** OS が素材を更新したとき、そこだけ浮く。
  //
  // **透けさせるには絶対配置が要る。** そのぶん画面の一番下が
  // 裏に隠れるので、各画面が `useTabBarInset()` の分だけ下を空ける。
  // 高さをここで固定しているのは、画面側と食い違わせないため。
  const glassTabBar = {
    tabBarBackground: () =>
      liquidGlass ? (
        <GlassView glassEffectStyle="regular" style={StyleSheet.absoluteFill} />
      ) : (
        <BlurView
          tint={c.blur}
          intensity={80}
          // **Android は既定ではぼかさない。** これを渡さないと
          // 半透明の板になるだけで、下の文字がそのまま透けて読みにくい。
          // Modal の中では効かないという制約があるが、タブバーは Modal の外。
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
      ),
    tabBarStyle: {
      position: 'absolute',
      backgroundColor: 'transparent',
      // **Liquid Glass のときは自前の線を引かない。**
      // 素材が縁の扱いまで持っているので、上から線を重ねると二重になる。
      borderTopColor: liquidGlass ? 'transparent' : c.border,
      borderTopWidth: liquidGlass ? 0 : StyleSheet.hairlineWidth,
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
        ...(isWide ? {} : glassTabBar),
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
