// Twitch 連携の認可フロー（Web）。
// ネイティブ版は twitchConnect.js にある。
//
// スキームURL（lantern://）は Web では意味を持たない。
// platform を指定しないとバックエンドは _FRONTEND_ORIGIN/dashboard?twitch=... へ
// リダイレクトしてくるので、それを受ける。

import { authFetch } from './supabase'

// 認可フローを開始する。ページ遷移するため呼び出し元には戻らない。
// 戻り値: 'redirecting'
export async function startConnect() {
  const res = await authFetch('/api/twitch/auth-url')
  const data = await res.json()
  if (!data.url) throw new Error('no auth url')
  window.location.href = data.url
  return 'redirecting'
}

// 連携から戻ってきた直後かを URL のクエリで判定する。副作用は持たない。
// 戻り値: 'connected' | null
export function readConnectResult() {
  return new URLSearchParams(window.location.search).get('twitch') === 'connected'
    ? 'connected'
    : null
}

// クエリを消す。残すとリロードのたびに接続完了扱いになる。
export function clearConnectResult() {
  window.history.replaceState({}, '', '/dashboard')
}
