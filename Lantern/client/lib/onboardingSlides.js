// 初回に見せる3枚。**中身と進み方だけ。`react-native` を読み込まない。**
//
// 分けているのは検査のため（`lib/themeMode.js` と同じ理由）。
// 描く側は `components/Onboarding.jsx`。

// 何を伝えるか。**2つに絞った**（2026-08-20・作者の選択）。
//
// 写真が端末の中だけであることと、無料の範囲も候補にあったが外した。
// **初回に4つ読ませると、どれも残らない。** 写真の話は使うときに
// 分かる場所にあり（設定・アカウント）、料金はペイウォールが説明する。
//
// 3枚目は伝える内容ではなく、始める場所。
// **押して終わる**という区切りが要る。
export const SLIDES = [
  {
    key: 'record',
    title: '今日のことを、ひとつ残す',
    body: 'やったこと、よかったこと、困ったこと、次にやること。\n'
      + '全部書かなくて構いません。ひとつでも残ります。\n\n'
      + '何を書くか浮かばない日は、問いが出ます。',
  },
  {
    key: 'quiet',
    title: 'Lanternは、評価しません',
    body: '褒めません。励ましません。意味づけもしません。\n\n'
      + 'することは2つだけです。書いたものを並べ直すこと。\n'
      + '変わったところを示すこと。\n\n'
      + 'そこに意味を見つけるのは、あなたです。',
  },
  {
    key: 'start',
    title: '灯りは、外から来るのではない',
    body: '書いた言葉が、そのまま残っていきます。',
    action: 'はじめる',
  },
]

/** 何枚あるか。 */
export const SLIDE_COUNT = SLIDES.length

/** 最後の1枚か。**ここだけボタンが「はじめる」になる。** */
export function isLast(index) {
  return index >= SLIDE_COUNT - 1
}

/**
 * 次に行く先。**最後からは動かない。**
 *
 * 端をはみ出さないのを呼ぶ側の注意に任せると、
 * 画面が空白になる事故が起きる。
 */
export function nextIndex(index) {
  const i = Number(index) || 0
  if (i < 0) return 0
  return Math.min(i + 1, SLIDE_COUNT - 1)
}

/** 横に流れた量から、いま何枚目かを出す。**幅が0でも落ちない。** */
export function indexFromOffset(offsetX, width) {
  const w = Number(width) || 0
  if (w <= 0) return 0
  const i = Math.round((Number(offsetX) || 0) / w)
  return Math.min(Math.max(i, 0), SLIDE_COUNT - 1)
}
