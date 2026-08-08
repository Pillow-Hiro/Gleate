import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { useRouter } from 'expo-router'
import Text from '../components/Text'
import AuthForm from '../components/AuthForm'
import { supabase } from '../lib/supabase'
import { authErrorMessage } from '../lib/authError'

// **ログインと新規登録を別の画面にしている（2026-08-08）。**
//
// それまでは1画面をモードで切り替えていた。実機で
// 「ログインなのか登録なのか分かりづらい」と指摘された。
// 見出しもボタンも入れ替わるだけなので、途中で切り替わったことに
// 気づかないまま送信してしまう。
//
// 画面を分ければ、見出し・説明・失敗したときの案内を
// それぞれの文脈で書ける。入力欄は `AuthForm` で共有する。
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
        <View className="items-center mb-10">
          <Text className="font-latin text-display text-ink">Lantern</Text>
          {/* この一文は CLAUDE.md の書き出しと食い違って見えるが、
              2026-08-06 に作者が残すと決めた。直さないこと。 */}
          <Text className="text-aux text-ink-faint mt-2 tracking-wider">創作の道を照らす、AI伴走者</Text>
        </View>

        <AuthForm
          mode="login"
          submitLabel="ログイン"
          error={error}
          loading={loading}
          onSubmit={handleLogin}
        >
          <Pressable onPress={() => router.push('/signup')} className="items-center pt-2">
            <Text className="text-aux text-forest">はじめての方はこちら</Text>
          </Pressable>
        </AuthForm>
      </View>
    </ScrollView>
  )
}
