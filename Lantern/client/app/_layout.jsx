import '../global.css'

import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import { ThemeProvider, useThemeContext } from '../lib/theme'
import SplashScreen from '../components/SplashScreen'

// Web版 components/ErrorBoundary.jsx と同じ役割。
// expo-router は _layout から ErrorBoundary という名前で export すると
// そのルートを包む（props は error と retry）。
//
// error.message は出さない。記録アプリで技術的な文字列を見せても
// 利用者にできることが増えないため、状態だけを事実として伝える。
export function ErrorBoundary({ error, retry }) {
  console.error('[Lantern] 画面の描画に失敗', error)

  return (
    <View className="flex-1 bg-cream items-center justify-center px-6">
      <View className="max-w-sm items-center gap-4">
        <Text className="text-3xl opacity-40">◇</Text>
        <Text className="text-sm text-ink text-center leading-relaxed">
          画面をうまく表示できませんでした。
        </Text>
        <Text className="text-xs text-ink-faint text-center leading-relaxed">
          これまでの記録は残っています。
        </Text>
        <Pressable onPress={retry} className="border border-sage/40 rounded-full px-3.5 py-1.5">
          <Text className="text-xs text-forest">読み込み直す</Text>
        </Pressable>
      </View>
    </View>
  )
}


function RootNavigator() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSplash, setShowSplash] = useState(true)
  const segments = useSegments()
  const router = useRouter()
  const { isDark } = useThemeContext()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // 認証ガード。セッションの有無と現在地が食い違っていれば振り替える。
  useEffect(() => {
    if (loading) return
    const onLoginScreen = segments[0] === 'login'
    if (!session && !onLoginScreen) {
      router.replace('/login')
    } else if (session && onLoginScreen) {
      router.replace('/')
    }
  }, [session, loading, segments, router])

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-cream">
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'auto'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
      </Stack>
      {showSplash ? <SplashScreen onClose={() => setShowSplash(false)} /> : null}
    </>
  )
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <RootNavigator />
      </SafeAreaProvider>
    </ThemeProvider>
  )
}
