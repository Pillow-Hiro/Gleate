// Web ではブラウザで開くだけ。`expo-web-browser` を Web バンドルに乗せない。
export const PRIVACY_URL = '/privacy.html'

export async function openPrivacy() {
  window.open(PRIVACY_URL, '_blank', 'noopener')
}
