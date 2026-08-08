import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { useRouter } from 'expo-router'
import Text from '../components/Text'
import AuthForm from '../components/AuthForm'
import { supabase } from '../lib/supabase'
import { authErrorMessage, isAlreadyRegistered } from '../lib/authError'

// 新規登録。ログインとは別の画面にしている（理由は `login.jsx`）。
//
// **登録の手間を減らすためにやっていること。**
//
// 1. パスワードの条件を、失敗する前に出す（`AuthForm` の hint）
// 2. 送ったあとの画面で、**宛先を名前で出す**。
//    打ち間違いはここでしか気づけない
// 3. 再送を置く。届かないときに登録し直させない
// 4. すでに登録済みのときは、ログイン画面への入口をその場に出す
//
// **確認メール自体は消していない。** Supabase の設定で切れるが、
// 切ると誰のものか分からないメールアドレスで記録が溜まる。
// 記録アプリで持ち主が確かめられないのは避ける。
export default function Signup() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [registered, setRegistered] = useState(false)
  const [taken, setTaken] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const [resent, setResent] = useState('')

  async function handleSignup(email, password) {
    setLoading(true)
    setError('')
    setRegistered(false)
    setTaken(false)
    try {
      const { data, error: err } = await supabase.auth.signUp({ email, password })
      if (err) throw err
      setSentTo(email)
      // 確認メールを切っている場合はその場でセッションが返る。
      // そのときは認証ガードが本画面へ振り替えるので、案内は出さない。
      if (!data?.session) setRegistered(true)
    } catch (err) {
      // すでに登録済みかどうかは、ここで分かるとは限らない。
      // 確認メールが有効なとき、Supabase は**わざとエラーを返さない**
      // （どのアドレスが登録済みか外から数えられないようにするため）。
      // その場合は下の「メールを確認してください」に合流する。
      setError(authErrorMessage(err))
      setTaken(isAlreadyRegistered(err))
    } finally {
      setLoading(false)
    }
  }

  // ログインへ戻る。
  // **`replace` だけにすると履歴に login が2枚積まれる。**
  // ログインから来た場合は戻るだけでよい。
  function goToLogin() {
    if (router.canGoBack()) router.back()
    else router.replace('/login')
  }

  async function handleResend() {
    setResent('')
    try {
      const { error: err } = await supabase.auth.resend({ type: 'signup', email: sentTo })
      if (err) throw err
      setResent('もう一度送りました。')
    } catch (err) {
      setResent(authErrorMessage(err))
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
          <Text className="font-display text-3xl text-ink tracking-[8px]">Lantern</Text>
          <Text className="text-aux text-ink-faint mt-2 tracking-wider">はじめる</Text>
        </View>

        {registered ? (
          // 送ったあとの画面。**宛先を出す。**
          // ここに出さないと、打ち間違いに気づく場所が無い。
          <View className="gap-4">
            <Text className="text-body text-ink leading-relaxed">
              {sentTo} に確認メールを送りました。
            </Text>
            <Text className="text-aux text-ink-faint leading-relaxed">
              メールの中のリンクを開くと、そのまま使いはじめられます。
            </Text>
            {resent ? <Text className="text-aux text-sage">{resent}</Text> : null}
            <View className="flex-row gap-3 justify-center pt-2">
              <Pressable
                onPress={handleResend}
                className="border border-sage/40 rounded-full px-3.5 py-1.5"
              >
                <Text className="text-aux text-forest">もう一度送る</Text>
              </Pressable>
              <Pressable
                onPress={goToLogin}
                className="border border-sage/40 rounded-full px-3.5 py-1.5"
              >
                <Text className="text-aux text-forest">ログインへ</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <AuthForm
            mode="signup"
            submitLabel="登録する"
            hint="パスワードは6文字以上"
            error={error}
            loading={loading}
            onSubmit={handleSignup}
          >
            {/* すでに登録済みだったときは、戻って探させない。
                その場からログインへ行けるようにする。 */}
            {taken ? (
              <Pressable onPress={goToLogin} className="items-center">
                <Text className="text-aux text-forest">このアドレスでログインする</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={goToLogin} className="items-center pt-2">
              <Text className="text-aux text-ink-faint">アカウントをお持ちの方</Text>
            </Pressable>
          </AuthForm>
        )}
      </View>
    </ScrollView>
  )
}
