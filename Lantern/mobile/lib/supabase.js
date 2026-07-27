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

export async function authFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (res.status === 401) {
    // Web版は window.location.reload() で画面を作り直していたが、
    // RNには存在しない。サインアウトすると onAuthStateChange が発火し、
    // ルートレイアウトの認証ガードがLogin画面へ振り替える。
    await supabase.auth.signOut()
    throw new Error('Unauthorized')
  }

  return res
}
