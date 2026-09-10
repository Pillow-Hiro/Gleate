import { useFonts } from 'expo-font'
// **ウェイトごとのパスから読むこと。パッケージ名から読まない。**
//
// `from '@expo-google-fonts/noto-sans-jp'` と書くと index.js を通り、
// そこは9ウェイト全部を require している。Metro は require を
// 木揺すりで落とさないため、**使わないウェイトまで全部同梱される。**
// 2026-08-08 に実測したところ web の書き出しが 114MB になっていた
// （フォントだけで 111MB・35ファイル）。
import { NotoSansJP_400Regular } from '@expo-google-fonts/noto-sans-jp/400Regular'
import { NotoSansJP_700Bold } from '@expo-google-fonts/noto-sans-jp/700Bold'
import { HankenGrotesk_700Bold } from '@expo-google-fonts/hanken-grotesk/700Bold'
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium'
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold'

// 読み込む書体。**ここが唯一の置き場所。**
//
// | 用途 | 書体 | クラス | 容量 |
// |---|---|---|---|
// | 見出し・強調（和文） | Noto Sans JP Bold | `font-display` / `font-strong` | 5.2MB |
// | 本文（和文） | Noto Sans JP Regular | `font-body` | 5.2MB |
// | ワードマーク（欧文） | Hanken Grotesk Bold | `font-latin` | 0.06MB |
// | ラベル（欧文・数字） | Inter Medium / SemiBold | `font-label` / `font-label-sm` | 0.7MB |
//
// **合計で約11MB。**
//
// ## DESIGN.md との違い
//
// 仕様は見出しに Hanken Grotesk、本文に Source Sans 3 を指定している。
// **どちらも和文の字を持たない。** Gleate の画面はほぼ全部日本語なので、
// 本文に指定すると和文だけ端末の既定フォントに落ち、
// iOS と Android で別の顔になる。
//
// そこで**和文は Noto Sans JP に読み替えた。** 仕様が求めている
// 「幾何学的なサンセリフ・600/700 の見出し・詰め気味の字送り」は、
// 書体の名前ではなく大きさ・太さ・字送りの側で満たしている。
// Hanken Grotesk は欧文だけの「Gleate」の綴りに使う。
//
// Source Sans 3 は入れていない。**出る場所が無い。**
// 数字と英字は Inter が受け持つ。
//
// Noto Serif JP も外した。仕様に明朝は無い。7.3MB 減った。
//
// **2026-09-04 に見出しだけ明朝で試し、作者が却下した**（「合わないです」）。
// 書体は入れず、端末が持っている Hiragino Mincho ProN を借りたので、
// **0バイトで試して 0バイトで戻せた。**7.3MB を配ってから
// 「合わない」と分かるのが一番高くつく。
//
// **`fontWeight` は使わない。** カスタムフォントに重ねると、
// その組み合わせの実体が無く Android で端末の既定に落ちる。
// 太字は書体そのものを差し替える（`font-strong`）。
const FONTS = {
  NotoSansJP_400Regular,
  NotoSansJP_700Bold,
  HankenGrotesk_700Bold,
  Inter_500Medium,
  Inter_600SemiBold,
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
