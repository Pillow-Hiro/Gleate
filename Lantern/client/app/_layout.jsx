import '../global.css'

import { useEffect, useState } from 'react'
import { Platform, Pressable, View } from 'react-native'
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
import Onboarding from '../components/Onboarding'
import BootScreen from '../components/BootScreen'
import {
  hasSeen as hasSeenOnboarding,
  markSeen as markOnboardingSeen,
  onReset as onOnboardingReset,
} from '../lib/onboardingPref'
import { loadAlways } from '../lib/splashPref'
import { markShowing, markSkipped } from '../lib/splashHandoff'
import { configure as configurePurchases } from '../lib/purchases'
import { watchRecoveryLinks } from '../lib/recoverySession'
import { EditorToolbarProvider } from '../components/EditorToolbar'
import { vars } from 'nativewind'
import { accentVars } from '../lib/accent'
import { findPaper, paperVars } from '../lib/paper'

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
    <View className="flex-1 bg-surface items-center justify-center px-6">
      <View className="max-w-sm items-center gap-4">
        <Text className="text-3xl opacity-40">◇</Text>
        <Text className="text-body text-on-surface text-center leading-relaxed">
          画面をうまく表示できませんでした。
        </Text>
        <Text className="text-aux text-outline text-center leading-relaxed">
          これまでの記録は残っています。
        </Text>
        <Pressable onPress={retry} className="border border-ai-ink/40 rounded-full px-3.5 py-1.5">
          <Text className="text-aux text-primary">読み込み直す</Text>
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
  // 初回の案内。**null は「まだ分からない」。**
  // false と区別しないと、履歴を読む前に一瞬出てしまう
  const [showOnboarding, setShowOnboarding] = useState(null)

  useEffect(() => {
    let cancelled = false
    hasSeenOnboarding().then((seen) => {
      if (!cancelled) setShowOnboarding(!seen)
    })
    return () => { cancelled = true }
  }, [])

  // 設定の「もう一度見る」。**その場で出す**（開き直させない）
  useEffect(() => onOnboardingReset(() => setShowOnboarding(true)), [])

  function handleOnboardingDone() {
    setShowOnboarding(false)
    markOnboardingSeen()
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let next = false
      try {
        // **毎回出す設定なら、既読は見ない**（2026-08-15）。
        // 表示を確かめるために日付を跨ぐのを待たなくてよいようにする
        if (await loadAlways()) {
          if (!cancelled) {
            // **本画面より先に知らせる。** ログイン画面はこれを見て、
            // 自分の入り方を決める（起動画面を待つか、すぐ上がるか）。
            // 下の早期 return があるので、決まるまで本画面は描かれない
            markShowing()
            setShowSplash(true)
          }
          return
        }
        const seen = await AsyncStorage.getItem(SPLASH_SEEN_KEY)
        next = seen !== localDateStr()
      } catch (e) {
        // 読めなければ出さない。毎回出るより出ない方が邪魔にならない
        console.warn('[Splash] 表示履歴の読み込みに失敗', e)
      }
      if (cancelled) return
      if (next) markShowing()
      else markSkipped()
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
  const { isDark, paper } = useThemeContext()
  // 画面の下地。**全画面の記録が開くときの一瞬に効く**（下の `write`）
  const ground = `rgb(${findPaper(paper)[isDark ? 'dark' : 'light'].ground})`

  // **再設定の最中は、上に何も被せない**（2026-08-28・作者の指示）。
  //
  // メールのリンクからアプリが開くようになった（`lib/authLink.js`）。
  // 着いた先はパスワードを変えるための画面で、**用事が決まっている。**
  // 起動画面の写真も、初回の案内も、そこでは邪魔にしかならない。
  //
  // 覚えている「既読」には触らない。案内を消すのではなく、
  // **この一度だけ出さない。** 次にふつうに開いたときには出る。
  const isRecovering = segments[0] === 'reset'

  // **再設定リンクは根で受ける**（2026-08-28）。
  //
  // 画面の中で受けていたが、アプリが裏で起きていたときに取りこぼした。
  // 通知は画面が出来る前に飛ぶので、生えてから listener を付けても遅い
  // （`lib/recoverySession.js` に経緯）。
  //
  // Web は `detectSessionInUrl` が拾うので、ここでは何もしない。
  useEffect(() => {
    if (Platform.OS === 'web') return undefined
    return watchRecoveryLinks()
  }, [])

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

  // **買った人と記録の持ち主を結び付ける**（2026-08-16）。
  //
  // RevenueCat に Supabase の user_id を渡しておくと、webhook が
  // `app_user_id` として返してくる（`modules/billing.py`）。
  // 渡し忘れると、買ったことは分かっても**誰が買ったかが分からない。**
  //
  // 鍵が無い間は何もしない（`lib/purchases.js`）。
  useEffect(() => {
    if (!session?.user?.id) return
    configurePurchases(session.user.id)
  }, [session?.user?.id])

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
  //
  // 2026-08-28 まで無地の `View` だった。ふつうは見えないが、
  // 判定が伸びると OS の起動画面が固まったまま出続ける。
  // `BootScreen` は**その画面と見分けがつかない**ものを描き、
  // 待ちが伸びたときだけ灯りがゆっくり息をする。
  if (loading || showSplash === null) {
    return <BootScreen />
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
        <Stack.Screen name="plan" />
        {/* 記録を書く全画面。**上から被さる**（2026-09-03・作者の判断）。
            `modal` にすると下へ払っても閉じられる。書き終えて閉じるのと
            同じ形なので、戻り方を別に覚えなくていい。

            **滑らせず、薄く出す**（2026-09-04・作者の指示「入り込む演出」）。
            下からせり上がると「別の場所へ移った」に見える。入り込むのは
            面が広がる動きなので、そちらは画面の側でやる
            （`components/Motion.jsx` の `ZoomIn`）。
            ここが滑っていると、2つの動きが喧嘩する。

            **下地を紙の色にする**（2026-09-04・作者から「開くときに
            一瞬ノイズが入る。ダークモードだと顕著」）。

            被せ物の入れ物は、既定で**白**。中身は `ZoomIn` が薄いところ
            から現れるので、**現れ切るまでその白が見えていた。**
            暗いテーマだと白い板が一瞬光る。地の色と同じにすれば、
            何も無いところから広がったように見える。 */}
        <Stack.Screen
          name="write"
          options={{
            presentation: 'modal',
            animation: 'fade',
            contentStyle: { backgroundColor: ground },
          }}
        />
      </Stack>
      {/* 初回の案内。**起動画面のあと、ログイン済みのときだけ。**
          - 起動画面より下に置く（写真と一言を先に見せる）
          - ログイン前には出さない。まだ自分のものになっていない
            アプリの使い方を読まされても、頭に残らない
          - **パスワードの再設定で開かれたときは出さない**（下記） */}
      {session && showSplash === false && showOnboarding === true && !isRecovering ? (
        <Onboarding onDone={handleOnboardingDone} />
      ) : null}
      {showSplash === true && !isRecovering ? <SplashScreen onClose={handleSplashClose} /> : null}
    </>
  )
}

// 灯りの色を画面全体へ当てる（2026-09-04・`lib/accent.js`）。
//
// **`ThemeProvider` の中でなければ読めない**ので、部品に分けている。
// `vars()` は NativeWind の仕組みで、この `View` から下の全部に
// CSS 変数を効かせる。実行時に当たるので `global.css` の
// `.dark:root` より後に来る——だから明暗もこちらが決める。
//
// `flex-1` を落とさないこと。**この `View` が縦に潰れると
// 画面が丸ごと消える。**
function AccentVars({ children }) {
  const { accent, paper, isDark } = useThemeContext()
  // 紙が先、灯りが後。**重なる名前は無い**が、順を決めておくと
  // 後から片方に足したときに、どちらが勝つかが読んで分かる
  const style = vars({ ...paperVars(paper, isDark), ...accentVars(accent, isDark) })
  return (
    <View className="flex-1" style={style}>
      {children}
    </View>
  )
}

export default function RootLayout() {
  // フォントは待たない。読み込み中は端末の既定で描き、あとで差し替わる。
  // 13MBの読み込みを白画面で待たせるより、読める状態で待たせる方がよい。
  useAppFonts()

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AccentVars>
          {/* 装飾の列はキーボードに貼り付く。**画面の一番外に置く。**
              記録フォームの中だと `ScrollView` と一緒に流れてしまう */}
          <EditorToolbarProvider>
            <RootNavigator />
          </EditorToolbarProvider>
        </AccentVars>
      </SafeAreaProvider>
    </ThemeProvider>
  )
}
