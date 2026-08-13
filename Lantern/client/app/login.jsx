import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { useRouter } from 'expo-router'
import Text from '../components/Text'
import AuthForm from '../components/AuthForm'
import LanternMark from '../components/LanternMark'
import { supabase } from '../lib/supabase'
import { authErrorMessage } from '../lib/authError'

// **ログインと新規登録を別の画面にしている（2026-08-08）。**
//
// それまでは1画面をモードで切り替えていた。実機で
// 「ログインなのか登録なのか分かりづらい」と指摘された。
// 見出しもボタンも入れ替わるだけなので、途中で切り替わったことに
// 気づかないまま送信してしまう。
//
// **2026-08-14 にデザイン案（`0_login`）へ寄せた。**
// しるし → 名前 → 一文 → カード → ボタン → 登録への入口。
//
// **登録への入口を画面の底に、独立して置く。**
// それまでは「パスワードを忘れた場合」と縦に並んでいて、
// どちらも同じ大きさの文字だった。**探すものと、通り過ぎるものが同じ形をしていた。**
export default function Login() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(email, password) {
    setLoading(true)
    setError('')
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) throw err
      // 成功したら _layout.jsx の認証ガードが本画面へ振り替える
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-cream"
      contentContainerClassName="flex-grow justify-center px-5 py-10"
      keyboardShouldPersistTaps="handled"
    >
      <View className="w-full max-w-sm self-center">
        <View className="items-center mb-8">
          <View className="w-16 h-16 rounded-full bg-surface-lowest items-center justify-center shadow-bloom mb-5">
            <LanternMark size={30} />
          </View>
          <Text className="font-latin text-display text-ink">Lantern</Text>
          {/* この一文は CLAUDE.md の書き出しと食い違って見えるが、
              2026-08-06 に作者が残すと決めた。直さないこと。 */}
          <Text className="text-body-md text-on-surface-variant mt-2">創作の道を照らす、AI伴走者</Text>
        </View>

        <AuthForm
          mode="login"
          submitLabel="ログイン"
          error={error}
          loading={loading}
          onSubmit={handleLogin}
          belowFields={
            // **パスワードを忘れた場合。** 2026-08-13 まで無く、忘れたら詰んだ
            <Pressable onPress={() => router.push('/forgot')} className="py-1">
              <Text className="text-label-md text-secondary">パスワードを忘れた場合</Text>
            </Pressable>
          }
        />

        {/* **登録への入口。**
            案の "Don't have an account? Create account" と同じ置き方。
            問いかけと操作を1行にし、操作の側だけを濃く・太くする。
            「はじめての方はこちら」だけでは、押せる場所なのか
            ただの説明なのかが読み取れなかった。 */}
        <View className="flex-row justify-center items-center gap-1.5 mt-10">
          <Text className="text-body-md text-on-surface-variant">アカウントをお持ちでない方は</Text>
          <Pressable
            onPress={() => router.push('/signup')}
            className="min-h-touch justify-center active:opacity-70"
          >
            <Text className="font-strong text-body-md text-primary underline">アカウントを作成</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  )
}
