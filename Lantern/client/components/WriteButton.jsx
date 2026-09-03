import { Pressable } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { useRouter } from 'expo-router'
import { useTabBarInset } from '../lib/tabBar'

// 右下の書くボタン。**ペンだけ**（2026-09-03・作者の指示）。
//
// 字を添えていたが「ペンマークだけでいい」。丸1つの方が場所を取らず、
// **記録の上に浮いても読む邪魔にならない。**
// 字が無いぶん記号を大きく描く。読み上げには名前が要るので
// `accessibilityLabel` は残す。
//
// ## 置く場所（作者の指示）
//
// **ホーム・記録・書くの3つだけ。** 分析と設定には置かない。
// あの2つは眺める場所で、そこから書き始める流れが無い。
//
// ## なぜ浮かせるか
//
// 「書く」の入口の紙は押せるが、**紙に見えるので押せると分からない。**
// 押す場所がはっきりしているものを、いつもの位置に置く。
// 流れないので、下へ送っても残る。
//
// すりガラスのタブバーは内容の上に重なるので、その高さぶん持ち上げる
// （`lib/tabBar.js`）。
//
// ## 問いを連れていく
//
// `question` を渡すと、全画面の欄のプレースホルダになる。
// **渡せる画面だけ渡す。**「記録」タブは問いを取っていないので、
// そこからは決まり文句に落ちる（`app/write.jsx`）。
// 中身は WebView に焼き付くので、あとから差し替えられない——
// 開いてから取りに行くと、間に合わずに決まり文句のままになる。

// **絵文字は使わない**ので図形で描く（`components/RecordForm.jsx` の暦と同じ）
function PencilIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 20h4L19.5 8.5a2.1 2.1 0 00-3-3L5 17v3z"
        stroke="#1D1D1F"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export default function WriteButton({ question = '', date = '' }) {
  const router = useRouter()
  const tabInset = useTabBarInset()

  function open() {
    // **空の値は渡さない。** `undefined` を渡すと文字列 "undefined" になる
    const params = {}
    if (date) params.date = date
    if (question) params.question = question
    router.push({ pathname: '/write', params })
  }

  return (
    <Pressable
      onPress={open}
      accessibilityLabel="記録を書く"
      style={{ position: 'absolute', right: 20, bottom: tabInset + 16, width: 56, height: 56 }}
      className="bg-lantern-glow rounded-full items-center justify-center shadow-bloom active:opacity-80"
    >
      <PencilIcon />
    </Pressable>
  )
}
