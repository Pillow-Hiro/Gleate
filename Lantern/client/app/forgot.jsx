import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { useRouter } from 'expo-router'
import Text from '../components/Text'
import FormShell from '../components/FormShell'
import AuthField from '../components/AuthField'
import { supabase } from '../lib/supabase'
import { authErrorMessage } from '../lib/authError'
import { resetRedirectTo } from '../lib/resetLink'

// パスワードを忘れたとき。
//
// **2026-08-13 まで無かった。** 忘れたら詰む状態だった。
//
// 送ったあとの作りは新規登録と同じ考え方（`signup.jsx`）。
// **宛先を画面に出す。** 打ち間違いに気づく場所がここしかない。
// 再送を置く。届かないときにやり直させない。
//
// **メールがあるかどうかを言わない。** 「登録されていません」と返すと、
// どのアドレスが登録済みかを外から数えられる。
// Supabase も同じ理由でエラーを返さない。送った体で同じ画面を出す。
export default function Forgot() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [resent, setResent] = useState('')

  async function send() {
    const address = email.trim()
    if (!address) {
      setError('メールアドレスを入れてください')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(address, {
        redirectTo: resetRedirectTo(),
      })
      if (err) throw err
      setSent(true)
    } catch (e) {
      setError(authErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  async function resend() {
    setResent('')
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: resetRedirectTo(),
      })
      if (err) throw err
      setResent('もう一度送りました。')
    } catch (e) {
      setResent(authErrorMessage(e))
    }
  }

  function back() {
    if (router.canGoBack()) router.back()
    else router.replace('/login')
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
          <Text className="text-aux text-ink-faint mt-2 tracking-wider">パスワードの再設定</Text>
        </View>

        {sent ? (
          <View className="gap-4">
            <Text className="text-body-md text-ink leading-relaxed">
              {email.trim()} に再設定のメールを送りました。
            </Text>
            {/* **ブラウザで開くことを先に言う。** 何も言わずに
                アプリへ戻ってこないと、壊れているように見える */}
            <Text className="text-label-md text-outline leading-relaxed">
              メールのリンクはブラウザで開きます。新しいパスワードを決めたら、
              このアプリに戻って、そのパスワードでログインしてください。
            </Text>
            {resent ? <Text className="text-label-md text-sage">{resent}</Text> : null}
            <View className="flex-row gap-3 justify-center pt-2">
              <Pressable onPress={resend} className="border border-sage/40 rounded-full px-3.5 min-h-touch justify-center">
                <Text className="text-label-md text-forest">もう一度送る</Text>
              </Pressable>
              <Pressable onPress={back} className="border border-sage/40 rounded-full px-3.5 min-h-touch justify-center">
                <Text className="text-label-md text-forest">ログインへ</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <FormShell className="gap-4" onSubmit={send}>
            <View className="bg-surface-lowest rounded-lg px-4 shadow-bloom">
              <AuthField
                icon="mail"
                label="メールアドレス"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                textContentType="username"
                keyboardType="email-address"
                returnKeyType="go"
                onSubmitEditing={send}
                isLast
              />
            </View>

            {error ? <Text className="text-label-md text-error">{error}</Text> : null}

            <Pressable
              onPress={send}
              disabled={loading}
              className="bg-lantern-glow rounded-full py-3 min-h-touch justify-center items-center active:opacity-80 disabled:opacity-50"
            >
              <Text className="font-strong text-body text-on-lantern">
                {loading ? '送信中...' : '再設定のメールを送る'}
              </Text>
            </Pressable>

            <Pressable onPress={back} className="items-center pt-2">
              <Text className="text-label-md text-outline">ログインに戻る</Text>
            </Pressable>
          </FormShell>
        )}
      </View>
    </ScrollView>
  )
}
