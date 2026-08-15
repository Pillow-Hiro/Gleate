import '../global.css'

import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import Text from '../components/Text'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'
import { localDateStr } from '../lib/date'
import { ThemeProvider, useThemeContext } from '../lib/theme'
import { useAppFonts } from '../lib/fonts'
import * as NativeSplash from 'expo-splash-screen'
import SplashScreen from '../components/SplashScreen'
import { EditorToolbarProvider } from '../components/EditorToolbar'

// **起動画面が2回出ていた**（2026-08-14・実機）。
//
// OS の起動画面（`expo-splash-screen`）が消える → 読み込み中の丸が出る →
// Lantern の起動画面が出る、という3段になっていた。
// 目には「スプラッシュ → 別のスプラッシュ」と映る。
//
// OS の起動画面を**こちらで消すまで出したままにする。**
// 判定が終わってから消せば、下から Lantern の起動画面が現れる。
// 間に何も挟まらないので、1回に見える。
NativeSplash.preventAutoHideAsync().catch(() => {})

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
        <Text className="text-body text-ink text-center leading-relaxed">
          画面をうまく表示できませんでした。
        </Text>
        <Text className="text-aux text-ink-faint text-center leading-relaxed">
          これまでの記録は残っています。
        </Text>
        <Pressable onPress={retry} className="border border-sage/40 rounded-full px-3.5 py-1.5">
          <Text className="text-aux text-forest">読み込み直す</Text>
        </Pressable>
      </View>
    </View>
  )
}


// 起動画面は1日1回だけ出す。旧Web版はこの判定を持っていたが、
// Expo への移植時に落ちて毎回出る状態になっていた。
// 世界観としては強いが、1日に何度も開くと邪魔になる。
const SPLASH_SEEN_KEY = 'lantern_splash_date'

// セッションが無くても入れる画面。ここに足し忘れると、
// その画面を開いた瞬間に /login へ振り替えられる。
const AUTH_SCREENS = new Set(['login', 'signup', 'forgot', 'reset'])

// **セッションがあるときに追い出す画面。** 上とは別に持つ。
//
// パスワード再設定のリンクを踏むと、Supabase が一時的なセッションを作る。
// `/reset` を追い出す側に入れると、**パスワードを変える前に
// ホームへ飛ばされる。** 画面が一瞬で消えて、何が起きたか分からない。
const SIGNED_IN_LEAVES = new Set(['login', 'signup'])

function RootNavigator() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  // **null は「まだ判定していない」。**
  //
  // 2026-08-07 まで false で始めていた。読み込みは非同期なので、
  // 判定が終わる前に本画面が描画され、そのあとスプラッシュが
  // 上から被さっていた。実機では**画面が一瞬ちらついて見えた**。
  //
  // 判定が済むまで本画面を出さないことで解消する。
  // 読み込みは端末内なので、待つのは一瞬。
  const [showSplash, setShowSplash] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let next = false
      try {
        const seen = await AsyncStorage.getItem(SPLASH_SEEN_KEY)
        next = seen !== localDateStr()
      } catch (e) {
        // 読めなければ出さない。毎回出るより出ない方が邪魔にならない
        console.warn('[Splash] 表示履歴の読み込みに失敗', e)
      }
      if (cancelled) return
      setShowSplash(next)
      // **出すと決めた時点で記録する。** 閉じたときではない。
      // 閉じる前に画面が作り直されると、もう一度最初から出てしまう
      if (next) {
        AsyncStorage.setItem(SPLASH_SEEN_KEY, localDateStr()).catch((e) => {
          console.warn('[Splash] 表示履歴の保存に失敗', e)
        })
      }
    })()
    return () => { cancelled = true }
  }, [])

  function handleSplashClose() {
    setShowSplash(false)
  }
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
  //
  // 2026-08-08 に新規登録を別画面（`/signup`）に分けた。
  // **どちらも「まだ入っていない人がいる場所」として同じ扱いにする。**
  // login だけを見ていると、登録画面から本画面へ蹴り出される。
  useEffect(() => {
    if (loading) return
    const here = segments[0]
    if (!session && !AUTH_SCREENS.has(here)) {
      router.replace('/login')
    } else if (session && SIGNED_IN_LEAVES.has(here)) {
      router.replace('/')
    }
  }, [session, loading, segments, router])

  // 判定が済んだら OS の起動画面を下ろす。
  // **下ろすまで、この下で何を描いていても見えない。**
  useEffect(() => {
    if (loading || showSplash === null) return
    NativeSplash.hideAsync().catch(() => {})
  }, [loading, showSplash])

  // 認証とスプラッシュの判定が両方済むまで、本画面を描画しない。
  // どちらかが遅れて確定すると、その分だけ画面が入れ替わって見える。
  //
  // ここは OS の起動画面の裏になる。**読み込み中の丸を出さない。**
  // 出しても見えないうえ、消し忘れたときに「3枚目」として現れる。
  if (loading || showSplash === null) {
    return <View className="flex-1 bg-cream" />
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'auto'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="forgot" />
        <Stack.Screen name="reset" />
        <Stack.Screen name="account" />
      </Stack>
      {showSplash === true ? <SplashScreen onClose={handleSplashClose} /> : null}
    </>
  )
}

export default function RootLayout() {
  // フォントは待たない。読み込み中は端末の既定で描き、あとで差し替わる。
  // 13MBの読み込みを白画面で待たせるより、読める状態で待たせる方がよい。
  useAppFonts()

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        {/* 装飾の列はキーボードに貼り付く。**画面の一番外に置く。**
            記録フォームの中だと `ScrollView` と一緒に流れてしまう */}
        <EditorToolbarProvider>
          <RootNavigator />
        </EditorToolbarProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  )
}
