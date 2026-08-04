// Twitch 連携の認可フロー（ネイティブ）。
// Web 版は twitchConnect.web.js にある。Metro がプラットフォームで選ぶため、
// 呼び出し側は分岐を持たない（youtubeConnect と同じ作り）。

import * as WebBrowser from 'expo-web-browser'
import { authFetch } from './supabase'

// app.json の scheme と一致させること。バックエンドの _APP_SCHEME_ORIGIN と対になる。
const RETURN_URL = 'lantern://dashboard'

// 認可フローを開始する。
// 戻り値: 'connected' | 'failed' | 'cancelled'
export async function startConnect() {
  const res = await authFetch('/api/twitch/auth-url?platform=app')
  const data = await res.json()
  if (!data.url) throw new Error('no auth url')

  const result = await WebBrowser.openAuthSessionAsync(data.url, RETURN_URL)
  if (result.type !== 'success') return 'cancelled'
  return result.url?.includes('twitch=connected') ? 'connected' : 'failed'
}

// 画面を開いた時点で「連携から戻ってきた直後」かを判定する。
// ネイティブは startConnect の戻り値で分かるため常に null。
export function readConnectResult() {
  return null
}

// 戻り直後の印を消す。ネイティブでは何もしない。
export function clearConnectResult() {}
