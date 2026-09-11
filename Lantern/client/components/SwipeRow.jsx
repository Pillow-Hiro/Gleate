import { useRef, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

// 横に払うとゴミ箱が出る行。
//
// ## 自分で判定を書いて、また外した（2026-09-11）
//
// はじめ `PanResponder` で「横が縦より動いていたら奪う」と書いた。
// **このアプリは同じことを 2026-08-15 に三度やって捨てている**
// （`IdeasPanel.jsx` の註釈）。比率を 2倍 → 1.2倍 → 同数と緩めても、
// 実機では一覧の縦スクロールに取られ続けた、と記録が残っていた。
//
// **書く前に読めば分かったこと。**採るべきは、そのとき辿り着いた形。
//
//     行そのものを横スクロールにして、縦か横かは **OS に裁かせる。**
//
// iOS の「メール」も同じ作り（入れ子のスクロール）で、縦に流れている
// 最中でも横に払える。自分で角度を測るより端末の裁定のほうが強い。
//
// ## ここに1つだけ置く
//
// アイデアの一覧（`IdeasPanel`）と、前に添えた曲（`AttachRow`）で
// 同じものを使う。**2つ持つと、片方だけ直る。**
//
// 幅は測って渡す。`onLayout` を待つあいだは行だけを描く
// （0 のまま横に並べると、ゴミ箱が画面の左端に見えてしまう）。

// ゴミ箱の面の幅
const TRASH_WIDTH = 80

/** 削除の記号。**アイデアを消すときと同じもの**（作者の指示） */
export function TrashIcon({ color = '#FFFFFF' }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 7h16M10 4h4M6 7l1 13h10l1-13M10 11v6M14 11v6"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export default function SwipeRow({
  onDelete,
  label,
  className = '',
  rowClassName = 'bg-surface-lowest',
  children,
}) {
  const [width, setWidth] = useState(0)
  const scroller = useRef(null)

  function handleDelete() {
    // 消す前に閉じておく。開いたまま次の行が繰り上がると、
    // **触っていない行のゴミ箱が出ているように見える**
    scroller.current?.scrollTo({ x: 0, animated: false })
    onDelete()
  }

  const row = (
    <View style={width ? { width } : undefined} className={rowClassName}>
      {children}
    </View>
  )

  return (
    <View className={className} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width === 0 ? (
        row
      ) : (
        <ScrollView
          ref={scroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          // **吸い付く位置は2つだけ。** 閉じているか、開いているか
          snapToOffsets={[0, TRASH_WIDTH]}
          snapToEnd={false}
          decelerationRate="fast"
          bounces={false}
          overScrollMode="never"
          // 行の中の押せるものは押せたままにする
          keyboardShouldPersistTaps="handled"
        >
          {row}
          <Pressable
            onPress={handleDelete}
            accessibilityLabel={label}
            style={{ width: TRASH_WIDTH }}
            className="bg-error items-center justify-center"
          >
            <TrashIcon />
          </Pressable>
        </ScrollView>
      )}
    </View>
  )
}
