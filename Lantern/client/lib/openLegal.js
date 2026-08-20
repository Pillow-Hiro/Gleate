import * as WebBrowser from 'expo-web-browser'

// 法務の文書を開く。
//
// **アプリの中にページを作らない。** 同じ文書が2か所にあると、
// App Store Connect に出したURLと中身がずれる。
// ずれた瞬間、どちらが本当かを外から確かめられなくなる。
//
// **2026-08-16 に `openPrivacy.js` から名前を変えた。**
// 有料化で利用規約と特定商取引法に基づく表記が要るようになり、
// 開く先が3つになったため。
//
// ネイティブはアプリ内ブラウザで開く。外のブラウザに飛ばすと
// アプリから出てしまい、戻り方が端末任せになる。
// Web は `openLegal.web.js` が別タブで開く。
// **自前のドメインに置く**（2026-08-20）。
//
// それまで `lantern-inky-three.vercel.app` という、Vercel が自動で
// 付けた名前を使っていた。App Store Connect に出すプライバシーポリシーの
// URL がこれになるうえ、**プロジェクト名が変わると切れる。**
// API は既に `api.golantern.app` なので、同じドメインに寄せる。
// **`www` に寄せる。** apex は 308 で `www` へ転送される構成なので、
// apex を書くと毎回1手増える。審査担当者が踏むリンクなので、
// 転送を挟まない方を出す。
const BASE = 'https://www.golantern.app'

export const PRIVACY_URL = `${BASE}/privacy.html`
export const TERMS_URL = `${BASE}/terms.html`
export const TOKUSHOHO_URL = `${BASE}/tokushoho.html`

export async function openPrivacy() {
  await WebBrowser.openBrowserAsync(PRIVACY_URL)
}

export async function openTerms() {
  await WebBrowser.openBrowserAsync(TERMS_URL)
}

export async function openTokushoho() {
  await WebBrowser.openBrowserAsync(TOKUSHOHO_URL)
}
