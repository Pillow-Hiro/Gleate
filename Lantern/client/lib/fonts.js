import { useFonts } from 'expo-font'
// **ウェイトごとのパスから読むこと。パッケージ名から読まない。**
//
// `from '@expo-google-fonts/noto-serif-jp'` と書くと index.js を通り、
// そこは9ウェイト全部を require している。Metro は require を
// 木揺すりで落とさないため、**使わないウェイトまで全部同梱される。**
// 2026-08-08 に実測したところ web の書き出しが 114MB になっていた
// （フォントだけで 111MB・35ファイル）。
import { NotoSansJP_400Regular } from '@expo-google-fonts/noto-sans-jp/400Regular'
import { NotoSerifJP_600SemiBold } from '@expo-google-fonts/noto-serif-jp/600SemiBold'
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular'

// 読み込むフォント。**ここが唯一の置き場所。**
//
// | 用途 | フォント | 容量 |
// |---|---|---|
// | 見出し（和文） | Noto Serif JP SemiBold | 7.7MB |
// | 本文（和文） | Noto Sans JP Regular | 5.6MB |
// | 英数字が混ざる箇所 | Inter Regular | 0.3MB |
//
// **合計で約13MB がアプリに載る。**
// 日本語フォントは全字形を持つため、1ウェイトでこの大きさになる。
// ウェイトを増やすほど比例して増えるので、**必要になるまで足さない。**
//
// 減らしたくなったら、字形を絞った派生フォントを作る手がある。
// ただし利用者の記録に何の字が出るかは分からないため、
// **絞ると書いた字が出ない事故が起きる。** 記録アプリでは避ける。
const FONTS = {
  NotoSerifJP_600SemiBold,
  NotoSansJP_400Regular,
  Inter_400Regular,
}

/**
 * フォントの読み込み状態を返す。
 *
 * 読み込みが終わるまで `false`。**その間も画面は描く。**
 * 端末の既定フォントで一瞬表示され、そのあと差し替わる。
 * 真っ白な画面で待たせるより、読める状態で待たせる方がよい。
 */
export function useAppFonts() {
  const [loaded, error] = useFonts(FONTS)
  if (error) {
    // 落とさない。既定フォントのままでもアプリは使える
    console.warn('[Fonts] 読み込みに失敗', error)
  }
  return loaded || Boolean(error)
}

export const FONT_NAMES = Object.keys(FONTS)
