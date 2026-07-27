import '../global.css'

import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import { ThemeProvider, useThemeContext } from '../lib/theme'
import SplashScreen from '../components/SplashScreen'

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
