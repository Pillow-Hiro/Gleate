import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const API_BASE = import.meta.env.VITE_API_URL || ''

export async function authFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  // Content-Type: undefined が渡されたらヘッダごと落とす。
  // FormData を送るときは境界文字列つきのヘッダをブラウザが自動で付けるため、
  // こちらで application/json を残すと本文を解釈できなくなる。
  Object.keys(headers).forEach(k => headers[k] === undefined && delete headers[k])

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (res.status === 401) {
    await supabase.auth.signOut()
    window.location.reload()
    throw new Error('Unauthorized')
  }

  return res
}

// 圧縮済みの写真とサムネイルを送る。
// パスはサーバーが g.user_id と date から組み立てるため、こちらからは渡さない。
export async function uploadPhoto(date, photoBlob, thumbBlob) {
  const body = new FormData()
  body.append('photo', photoBlob, 'photo.jpg')
  body.append('thumb', thumbBlob, 'thumb.jpg')

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
