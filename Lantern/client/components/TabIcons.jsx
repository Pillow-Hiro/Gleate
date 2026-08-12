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

// 書く＝ペン。
//
// 2026-08-08 まで灯り（中心の点と四方の光）だった。タブの名前を
// 「今日」から「書く」に変えたあとも絵だけ残っていたため、
// **名前は行為なのに絵は時点を指したまま**になっていた。
// 隣の「記録」がノートなので、行為と置き場所で対になる。
export function WriteIcon({ color, size = 15 }) {
  return (
    <Svg {...ICON_PROPS} width={size} height={size} stroke={color}>
      {/* 軸。左下が先で、右上が尻 */}
      <Path d="M2.44 12.56 L3.22 10.22 L10.82 2.62 L12.38 4.18 L4.78 11.78 Z" />
      {/* 首の帯。これが無いと、ただの細長い四角に見える */}
      <Line x1="9.69" y1="3.75" x2="11.25" y2="5.31" />
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

// 設定＝歯車。
//
// 2026-08-08 まで、中心の円から八方へ短い線が出る形だった。
// 歯車のつもりだったが、**離れて見ると太陽（明るさ）に見える。**
// 歯を台形にして輪郭でつなぐと歯車になる。
//
// **歯は6枚。** 8枚にすると 15px の枠で谷が線幅に埋まり、
// 縁がぎざぎざの円にしか見えなくなる。
// 座標は中心 (7.5,7.5)・歯先 6.55・谷 4.95 で計算したもの。
export function SettingsIcon({ color, size = 15 }) {
  return (
    <Svg {...ICON_PROPS} width={size} height={size} stroke={color}>
      <Path d="M5.89 2.82 L6.14 1.09 L8.86 1.09 L9.11 2.82 A4.95 4.95 0 0 1 10.75 3.76 L12.37 3.12 L13.73 5.48 L12.36 6.56 A4.95 4.95 0 0 1 12.36 8.44 L13.73 9.52 L12.37 11.88 L10.75 11.24 A4.95 4.95 0 0 1 9.11 12.18 L8.86 13.91 L6.14 13.91 L5.89 12.18 A4.95 4.95 0 0 1 4.25 11.24 L2.63 11.88 L1.27 9.52 L2.64 8.44 A4.95 4.95 0 0 1 2.64 6.56 L1.27 5.48 L2.63 3.12 L4.25 3.76 A4.95 4.95 0 0 1 5.89 2.82 Z" />
      <Circle cx="7.5" cy="7.5" r="2" />
    </Svg>
  )
}

// ホーム＝家。直近の記録を眺める場所（2026-08-12 に新設）
export function HomeIcon({ color, size = 15 }) {
  return (
    <Svg {...ICON_PROPS} width={size} height={size} stroke={color}>
      <Path d="M1.9 6.6 L7.5 1.9 L13.1 6.6 L13.1 13 L1.9 13 Z" />
      <Path d="M5.9 13 L5.9 8.7 L9.1 8.7 L9.1 13" />
    </Svg>
  )
}

// ルート名で引く。expo-router のファイル名と一致させること
export const TAB_ICONS = {
  home: HomeIcon,
  index: WriteIcon,
  journal: JournalIcon,
  dashboard: DashboardIcon,
  settings: SettingsIcon,
}
