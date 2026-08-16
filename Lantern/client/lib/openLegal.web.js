// Web ではブラウザで開くだけ。`expo-web-browser` を Web バンドルに乗せない。
export const PRIVACY_URL = '/privacy.html'
export const TERMS_URL = '/terms.html'
export const TOKUSHOHO_URL = '/tokushoho.html'

function open(url) {
  window.open(url, '_blank', 'noopener')
}

export async function openPrivacy() {
  open(PRIVACY_URL)
}

export async function openTerms() {
  open(TERMS_URL)
}

export async function openTokushoho() {
  open(TOKUSHOHO_URL)
}
