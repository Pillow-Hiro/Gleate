import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { useRouter } from 'expo-router'
import Text from '../components/Text'
import AuthForm from '../components/AuthForm'
import { supabase } from '../lib/supabase'
import { authErrorMessage, isAlreadyRegistered } from '../lib/authError'

// 新規登録。ログインとは別の画面にしている（理由は `login.jsx`）。
//
// **2026-08-14 に作りを変えた。**
// 画面は分けてあったのに、実機で「まだ迷う」と言われた。
// 原因は、**分けた2枚が同じ形をしていた**こと。
// どちらも中央に大きな Lantern があり、下に同じ欄が2つ並び、
// 変わるのは見出しとボタンの文字だけだった。
// **文字を読み比べないと、どちらの画面か分からない。**
//
// だから形の方を変えた。
//
// 1. 中央寄せの大きなロゴを置かない。**左寄せの見出し**にする
// 2. 上に「ログインに戻る」を置く。**来た道が見えている**
// 3. **これから何が起きるかを3段で先に書く。**
//    確認メールが届くことを、送ってから知らせない
//
// 登録の手間を減らすためにやっていることは変えていない。
// パスワードの条件を先に出す・宛先を名前で出す・再送を置く・
// すでに登録済みならその場からログインへ行ける。
//
// **確認メール自体は消していない。** Supabase の設定で切れるが、
// 切ると誰のものか分からないメールアドレスで記録が溜まる。
// 記録アプリで持ち主が確かめられないのは避ける。
function Step({ n, children, isLast }) {
  return (
    <View className="flex-row gap-3 items-start">
      <View className="w-6 h-6 rounded-full bg-lantern-glow items-center justify-center mt-0.5">
        <Text className="font-label-sm text-label-sm text-on-lantern">{n}</Text>
      </View>
      <Text className={`flex-1 text-body-md text-on-surface-variant ${isLast ? '' : 'mb-3'}`}>
        {children}
      </Text>
    </View>
  )
}

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
        {/* 来た道を見せる。ここが「ログインとは別の場所」だと分かる */}
        <Pressable
          onPress={goToLogin}
          className="self-start min-h-touch justify-center active:opacity-70"
        >
          <Text className="text-body-md text-primary">← ログイン</Text>
        </Pressable>

        <View className="mt-4 mb-7">
          <Text className="font-display text-headline-lg text-ink">アカウントを作成</Text>
          <Text className="text-body-md text-on-surface-variant mt-2 leading-relaxed">
            メールアドレスとパスワードだけで始められます。
          </Text>
        </View>

        {registered ? (
          // 送ったあとの画面。**宛先を出す。**
          // ここに出さないと、打ち間違いに気づく場所が無い。
          <View className="gap-4">
            <View className="bg-surface-lowest rounded-lg p-4 shadow-bloom">
              <Text className="text-body-md text-on-surface leading-relaxed">
                {sentTo} に確認メールを送りました。
              </Text>
              <Text className="text-label-md text-outline mt-2 leading-relaxed">
                メールの中のリンクを開くと、そのまま使いはじめられます。
              </Text>
            </View>
            {resent ? <Text className="text-label-md text-ai-ink">{resent}</Text> : null}
            <View className="flex-row gap-3 justify-center pt-2">
              <Pressable
                onPress={handleResend}
                className="border border-outline-variant rounded-full px-3.5 min-h-touch justify-center"
              >
                <Text className="text-label-md text-primary">もう一度送る</Text>
              </Pressable>
              <Pressable
                onPress={goToLogin}
                className="border border-outline-variant rounded-full px-3.5 min-h-touch justify-center"
              >
                <Text className="text-label-md text-primary">ログインへ</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            {/* **これから何が起きるかを先に書く。**
                確認メールが届くことを、送ってから知らせない */}
            <View className="mb-7">
              <Step n="1">メールアドレスとパスワードを決める</Step>
              <Step n="2">届いたメールのリンクを開く</Step>
              <Step n="3" isLast>
                今日のことを書きはじめる
              </Step>
            </View>

            <AuthForm
              mode="signup"
              submitLabel="アカウントを作成"
              hint="パスワードは6文字以上"
              error={error}
              loading={loading}
              onSubmit={handleSignup}
            >
              {/* すでに登録済みだったときは、戻って探させない。
                  その場からログインへ行けるようにする。 */}
              {taken ? (
                <Pressable onPress={goToLogin} className="items-center min-h-touch justify-center">
                  <Text className="font-strong text-body-md text-primary underline">
                    このアドレスでログインする
                  </Text>
                </Pressable>
              ) : null}
            </AuthForm>
          </>
        )}
      </View>
    </ScrollView>
  )
}
