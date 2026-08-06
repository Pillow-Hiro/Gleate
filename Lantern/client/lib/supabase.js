import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // ネイティブにはURLのセッションフラグメントが存在しないため無効化する
    detectSessionInUrl: false,
  },
})

const API_BASE = process.env.EXPO_PUBLIC_API_URL || ''

function _buildHeaders(options, token) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  // Content-Type: undefined が渡されたらヘッダごと落とす。
  // FormData を送るときは境界文字列つきのヘッダが自動で付くため、
  // こちらで application/json を残すと本文を解釈できなくなる。
  Object.keys(headers).forEach((k) => headers[k] === undefined && delete headers[k])
  return headers
}

export async function authFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: _buildHeaders(options, session?.access_token),
  })

  if (res.status !== 401) return res

  // 401 でいきなりサインアウトしない。
  // アクセストークンの寿命は1時間で、しばらく開いていないと
  // 自動更新が走る前に古いトークンで最初の呼び出しが飛ぶ。
  // 以前はここで signOut していたため、そのたびにログイン画面へ戻されていた。
  // まず更新を試み、それでも駄目なときだけサインアウトする。
  const { data, error } = await supabase.auth.refreshSession()
  const refreshed = data?.session?.access_token
  if (error || !refreshed) {
    await supabase.auth.signOut()
    throw new Error('Unauthorized')
  }

  const retry = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: _buildHeaders(options, refreshed),
  })
  if (retry.status === 401) {
    // 更新後のトークンでも弾かれる＝本当に無効
    await supabase.auth.signOut()
    throw new Error('Unauthorized')
  }
  return retry
}

// 圧縮済みの写真とサムネイルを送る。
// パスはサーバーが g.user_id と date から組み立てるため、こちらからは渡さない。
// React Native の FormData は Blob ではなく { uri, name, type } を受け取る。
export async function uploadPhoto(date, photoUri, thumbUri) {
  const body = new FormData()
  body.append('photo', { uri: photoUri, name: 'photo.jpg', type: 'image/jpeg' })
  body.append('thumb', { uri: thumbUri, name: 'thumb.jpg', type: 'image/jpeg' })

  const res = await authFetch(`/api/logs/${date}/photo`, {
    method: 'PUT',
    body,
    headers: { 'Content-Type': undefined },
  })
  if (!res.ok) throw new Error(`写真のアップロードに失敗しました (${res.status})`)
  return res.json()
}

export async function removePhoto(date) {
  const res = await authFetch(`/api/logs/${date}/photo`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`写真の削除に失敗しました (${res.status})`)
  return res.json()
}
