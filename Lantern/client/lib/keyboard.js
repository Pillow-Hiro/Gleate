import { useEffect, useState } from 'react'
import { Keyboard, Platform } from 'react-native'

// キーボードの高さを測る。
//
// ## なぜ要るのか
//
// 2026-08-17、作者から「よかったこと・困ったことを書くとき、
// 入力欄がキーボードに隠れる」と報告があった。
// 調べると、**記録を書く画面にキーボード避けが1つも無かった。**
//
// - 「書く」タブ … `ScrollView` が素のまま。下の欄が隠れる
// - 「記録」の窓 … 下に貼り付いた紙なので、**丸ごと隠れる**
//
// ## `KeyboardAvoidingView` を使わない
//
// この構成では当てにできない。`InputAccessoryView` が実機で出なかったのと
// 同じ理由（RN 0.86 / New Architecture）で、2026-08-14 に一度踏んでいる
// （`components/EditorToolbar.jsx`）。
// **測って自分で空ける**方が、何が起きているかを追える。
//
// ## `EditorToolbar` と別に持つ理由
//
// あちらも同じ出来事を聞いているが、**欲しい値が違う。**
// 列は「消える動きが終わるまで高さを保つ」必要があり、
// こちらは「いま何ピクセル隠れているか」だけが要る。
// 1つにまとめると、列が下へ跳ねる。
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0)

  useEffect(() => {
    // iOS は `Will`。動き出す前に分かるので、キーボードと一緒に動く。
    // `Did` だと、キーボードが出きってから画面が動いて2段になる
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const show = Keyboard.addListener(showEvent, (e) => {
      setHeight(e.endCoordinates?.height ?? 0)
    })
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0))

    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  return height
}
