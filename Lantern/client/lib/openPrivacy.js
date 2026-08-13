import * as WebBrowser from 'expo-web-browser'

// プライバシーポリシーを開く。
//
// **アプリの中にページを作らない。** 同じ文書が2か所にあると、
// App Store Connect に出したURLと中身がずれる。
// ずれた瞬間、どちらが本当かを外から確かめられなくなる。
//
// ネイティブはアプリ内ブラウザで開く。外のブラウザに飛ばすと
// アプリから出てしまい、戻り方が端末任せになる。
// Web は `openPrivacy.web.js` が同じタブで開く。
export const PRIVACY_URL = 'https://lantern-inky-three.vercel.app/privacy.html'

export async function openPrivacy() {
  await WebBrowser.openBrowserAsync(PRIVACY_URL)
}
