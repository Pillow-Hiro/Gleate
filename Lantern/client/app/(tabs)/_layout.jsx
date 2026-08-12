import { NativeTabs } from 'expo-router/unstable-native-tabs'
import { useColorScheme } from 'nativewind'

// **ネイティブは本物の `UITabBar` を出す（2026-08-09）。**
//
// それまでは `Tabs` に `expo-blur` や `expo-glass-effect` を敷いていた。
// 実機で「Liquid Glass になっていない」と2度指摘された。
//
// **素材だけでは Liquid Glass にならない。**
// iOS 26 のタブバーがああ見えるのは、素材に加えて
//
// - 浮いたカプセル形（左右に余白があり、画面幅いっぱいではない）
// - 縁の鏡面ハイライト
// - スクロールに応じて縮む・変形する
//
// があるため。画面幅いっぱいの長方形にガラスを敷いても、
// 遠目には前のすりガラスと変わらない。**OS に描かせるしかない。**
//
// 引き換えに自作の SVG アイコンは使えず、SF Symbols になる。
// ただし求められていたのはペンと歯車で、`pencil` と `gearshape` は
// まさにそれなので、失うものは実質ない。
//
// **Web はこの実装を使わない。** `_layout.web.jsx` が
// `Tabs` + `SidebarTabBar` を出す。ロゴ・タグライン・バージョン・
// テーマ切替を持つサイドバーは `NativeTabs` に差し込めないため。
// iPad と macOS では `sidebarAdaptable` で OS がサイドバーにする。
//
// **画面側は下に余白を空けない。** `NativeTabs` が内容の余白を持つ。
// `lib/tabBar.js` の `useTabBarInset()` はネイティブでは 0 を返す。

// 値は DESIGN.md（primary / lantern-glow）。
// クラス名を渡せない場所なので、パレットを変えたらここも直す。
const TINT = { light: '#825500', dark: '#FFB953' }

// **5つ。iOS の上限なので、これ以上は増やせない。**
//
// 並びは 2026-08-12 に作者が決めたもの。
// 「書く」を真ん中に置くのはデザイン案と同じで、押しやすい位置にある。
//
// **起動時に開くのは「書く」（`index`）。** 並びの1番目ではない。
// 一覧から始めると書くまでに1タップ増えるため、
// 「開いた画面でそのまま書き始められる」を優先している。
//
// ラベルは「そこで何をするか」にする。
// 2026-08-07 まで「今日」だった。**「今日」は時点であって行為ではない。**
//
// **4つ目は「分析」。** 継続の可視化と、外の世界に届いた形跡。
// 振り返り（言葉を読む）は「記録」のタブにある。
// **煽らない。** 進捗バー・炎・達成率・気分の分類は入れない
// （`REQUIREMENTS.md`「やらないこと」）。
//
// アイコンは iOS が SF Symbols、Android が Material。
// 選択時に塗りへ変わるものは `selected` を指定する
// （`pencil` に塗り版は無いので単独）。
const TABS = [
  {
    name: 'home',
    title: 'ホーム',
    sf: { default: 'house', selected: 'house.fill' },
    md: 'home',
  },
  {
    name: 'journal',
    title: '記録',
    sf: { default: 'book.closed', selected: 'book.closed.fill' },
    md: 'book',
  },
  { name: 'index', title: '書く', sf: 'pencil', md: 'edit' },
  {
    name: 'dashboard',
    title: '分析',
    sf: { default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' },
    md: 'grid_view',
  },
  {
    name: 'settings',
    title: '設定',
    sf: { default: 'gearshape', selected: 'gearshape.fill' },
    md: 'settings',
  },
]

export default function TabsLayout() {
  const { colorScheme } = useColorScheme()
  const tint = TINT[colorScheme === 'dark' ? 'dark' : 'light']

  return (
    <NativeTabs
      tintColor={tint}
      // 下へスクロールすると縮み、戻すと開く。iOS 26 の作法。
      // **これが付いて初めて Liquid Glass らしく動く。**
      minimizeBehavior="onScrollDown"
      // iPad と macOS では OS がサイドバーに変える
      sidebarAdaptable
    >
      {TABS.map(({ name, title, sf, md }) => (
        <NativeTabs.Trigger key={name} name={name}>
          <NativeTabs.Trigger.Icon sf={sf} md={md} />
          <NativeTabs.Trigger.Label>{title}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  )
}
