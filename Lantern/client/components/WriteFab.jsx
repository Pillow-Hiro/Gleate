import { Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import Svg, { Line, Path } from 'react-native-svg'
import { useFabOffset } from '../lib/tabBar'

// 一覧から書き始めるためのボタン。**唯一の浮いた要素**
// （DESIGN.md「Floating Action Button」）。
//
// 影は "Natural Bloom"（`shadow-bloom`）を上限にする。
// これ以上濃くすると、影の無い他の面から浮きすぎる。
//
// **押すと「書く」タブへ移る。** 新しい画面を積まない。
// 積むとタブバーの選択と現在地が食い違う。
//
// **タブバーの裏に隠れないよう、下端は `useFabOffset()` から取る。**
// スクロールの余白とは別の値。`NativeTabs` が入れてくれるのは
// 中身の余白だけで、絶対配置の要素は面倒を見てくれない。
// 2026-08-12 に実機で「隠れていて押しづらい」と指摘された。
export default function WriteFab() {
  const router = useRouter()
  const bottom = useFabOffset()

  return (
    <Pressable
      onPress={() => router.navigate('/')}
      accessibilityLabel="書く"
      className="absolute right-5 w-14 h-14 rounded-full bg-lantern-glow items-center justify-center shadow-bloom active:opacity-80"
      style={{ bottom }}
    >
      {/* タブのアイコンと同じペン。線だけで組む */}
      <Svg width={24} height={24} viewBox="0 0 15 15" fill="none" stroke="#1D1D1F"
           strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M2.44 12.56 L3.22 10.22 L10.82 2.62 L12.38 4.18 L4.78 11.78 Z" />
        <Line x1="9.69" y1="3.75" x2="11.25" y2="5.31" />
      </Svg>
    </Pressable>
  )
}
