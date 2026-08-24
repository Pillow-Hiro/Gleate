import { ScrollView } from 'react-native'
import { useKeyboardHeight } from '../lib/keyboard'

// ログイン・新規登録・パスワード再設定の外枠。**4画面で共有する。**
//
// 2026-08-24 まで4つとも同じ3行を各自で書いていた。
// 見た目は揃っていたが、**キーボードの扱いがどこにも無かった。**
//
// ## なぜ欄が隠れたか
//
// `justify-center` で中央に寄せ、`flex-grow` で画面いっぱいにしている。
// 内容は画面に収まるので、**スクロールできる余地が 0 になる。**
// キーボードが出ても押し上げる先が無く、下の欄は裏に留まったまま——
// **指でも引き出せない。** 「隠れる」より一段手前の問題。
//
// 一番深い新規登録（見出し＋3段の説明＋2欄＋ボタン）で最初に出た。
//
// ## `automaticallyAdjustKeyboardInsets` だけでは足りなかった
//
// 最初にそれだけを付けて出したが、**実機で変わらなかった。**
// この構成で組み込みのキーボード避けが当てにならないのは
// 2026-08-17 に書いてある通り（`lib/keyboard.js`）。
// RN 0.86 / New Architecture で `InputAccessoryView` が出なかったのと
// 同じ筋で、**捨てたはずの手をもう一度引いていた。**
//
// 残してはある（効く場面では焦点の欄まで運んでくれる）が、
// **頼りにはしない。** 高さは自分で測って空ける。
//
// ## 下余白が余地を作る
//
// `paddingBottom` を積むと内容が画面より高くなり、`justify-center` は
// 自然に上寄せへ変わる（配る余白が無くなるため）。
// **同じ1つの値で「余地を作る」と「上へ寄せる」が両方片づく。**
// キーボードが下りれば元の中央寄せに戻る。
//
// ## 200 は取りすぎだった
//
// `app/(tabs)/index.jsx` の 200 をそのまま持ってきたが、**あちらとは
// 中身が違う。** 記録を書く画面はチップから欄が開き、複数行に育つので、
// どこまで伸びるか分からないぶんを見込む必要がある。
//
// 認証の画面は**伸びない。** 2欄とボタンで、高さが最初から決まっている。
// 要るのはボタンがキーボードを越えるぶんだけで、それ以上は
// 何も無い場所へスクロールできてしまい、**下に続きがあるように見える。**
const KEYBOARD_GAP = 80

// 休んでいるときの下余白。`py-10` と同じ 40。
// **静止時の配置は動かさない。** ログイン画面は App Store の
// スクリーンショットに使っている。
const RESTING_PAD = 40

// `className` はログインのためにある。あの画面だけ**背景に写真**が敷いてあり、
// 地の色を塗ると写真が隠れる。変えられるのはそこだけで、
// 中の余白と寄せ方は渡せない——**揃っていてほしいのはそちら**なので。
export default function AuthScreen({ children, className = 'flex-1 bg-cream' }) {
  const keyboardHeight = useKeyboardHeight()

  return (
    <ScrollView
      className={className}
      contentContainerClassName="flex-grow justify-center px-5 pt-10"
      contentContainerStyle={{
        paddingBottom: keyboardHeight > 0 ? keyboardHeight + KEYBOARD_GAP : RESTING_PAD,
      }}
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      // 下向きになぞるとキーボードが指について降りる。
      // 閉じるために画面の外を探させない
      keyboardDismissMode="interactive"
    >
      {children}
    </ScrollView>
  )
}
