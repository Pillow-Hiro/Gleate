import Svg, { Circle, Line, Path, Rect } from 'react-native-svg'

// タブのアイコン。**サイドバーとボトムタブの両方がここを使う。**
//
// 2026-08-07 まで、この4つは SidebarTabBar.jsx の中に閉じていた。
// 広い画面（768px以上）ではアイコンが出ていたのに、
// ボトムタブには `tabBarIcon` を渡しておらず、
// **実機では React Navigation の既定表示（塗りつぶした三角）が出ていた。**
//
// 実機で「アプリ感がない」と言われた主因がこれ。
// 同じ絵を2か所で持たないよう、切り出して共有する。
//
// 線だけで組む。塗りを使うと、小さいサイズで潰れて団子になる。

const ICON_PROPS = {
  fill: 'none',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 15 15',
}

// 今日＝灯り。中心の点と、四方へ伸びる光
export function TodayIcon({ color, size = 15 }) {
  return (
    <Svg {...ICON_PROPS} width={size} height={size} stroke={color}>
      <Circle cx="7.5" cy="7.5" r="2.5" />
      <Line x1="7.5" y1="1" x2="7.5" y2="2.5" />
      <Line x1="7.5" y1="12.5" x2="7.5" y2="14" />
      <Line x1="1" y1="7.5" x2="2.5" y2="7.5" />
      <Line x1="12.5" y1="7.5" x2="14" y2="7.5" />
    </Svg>
  )
}

// 記録＝書かれたもの
export function JournalIcon({ color, size = 15 }) {
  return (
    <Svg {...ICON_PROPS} width={size} height={size} stroke={color}>
      <Rect x="2" y="1.5" width="11" height="12" rx="1.5" />
      <Line x1="5" y1="5" x2="10" y2="5" />
      <Line x1="5" y1="7.5" x2="10" y2="7.5" />
      <Line x1="5" y1="10" x2="8" y2="10" />
    </Svg>
  )
}

// ダッシュボード＝外の世界に届いた形跡
export function DashboardIcon({ color, size = 15 }) {
  return (
    <Svg {...ICON_PROPS} width={size} height={size} stroke={color}>
      <Rect x="1.5" y="1.5" width="5" height="5" rx="1" />
      <Rect x="8.5" y="1.5" width="5" height="5" rx="1" />
      <Rect x="1.5" y="8.5" width="5" height="5" rx="1" />
      <Rect x="8.5" y="8.5" width="5" height="5" rx="1" />
    </Svg>
  )
}

export function SettingsIcon({ color, size = 15 }) {
  return (
    <Svg {...ICON_PROPS} width={size} height={size} stroke={color}>
      <Circle cx="7.5" cy="7.5" r="1.75" />
      <Path d="M7.5 1.5v1.25M7.5 12.25v1.25M1.5 7.5h1.25M12.25 7.5h1.25M3.4 3.4l.88.88M10.72 10.72l.88.88M3.4 11.6l.88-.88M10.72 4.28l.88-.88" />
    </Svg>
  )
}

// ルート名で引く。expo-router のファイル名と一致させること
export const TAB_ICONS = {
  index: TodayIcon,
  journal: JournalIcon,
  dashboard: DashboardIcon,
  settings: SettingsIcon,
}
