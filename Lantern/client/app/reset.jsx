import { useEffect, useState } from 'react'
import { Pressable, ScrollView, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import Text from '../components/Text'
import FormShell from '../components/FormShell'
import { supabase } from '../lib/supabase'
import { authErrorMessage } from '../lib/authError'

// 新しいパスワードを決める画面。
//
// **メールのリンクから開かれる。** Supabase が URL に載せた情報で
// 一時的なセッションを作り、`PASSWORD_RECOVERY` を投げてくる。
// そのセッションがある間だけ `updateUser` でパスワードを変えられる。
//
// **リンクを踏まずにここへ来ることもある**（URLを直接開いた・期限切れ）。
// そのときは何も変えられないので、やり直す入口だけ出す。
//
// 戻り先は Web に固定している（`lib/resetLink.js`）。
// この画面は主に Web で開かれるが、ネイティブでも同じ実装で動く。
export default function Reset() {
  const router = useRouter()
  const [ready, setReady] = useState(null) // null = 判定中
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false

    // 復帰用のセッションが URL から作られる。少し遅れて届くので両方見る
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true)
    })

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setReady((r) => (r === true ? r : Boolean(data.session)))
    })

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [])

  async function submit() {
    if (password.length < 6) {
      setError('パスワードは6文字以上で設定してください')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) throw err
      setDone(true)
    } catch (e) {
      setError(authErrorMessage(e))
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
          <Text className="text-aux text-ink-faint mt-2 tracking-wider">新しいパスワード</Text>
        </View>

        {done ? (
          <View className="gap-4">
            <Text className="text-body-md text-ink leading-relaxed">
              新しいパスワードを設定しました。
            </Text>
            <Pressable
              onPress={() => router.replace('/login')}
              className="bg-lantern-glow rounded-full py-3 min-h-touch justify-center items-center active:opacity-80"
            >
              <Text className="font-strong text-body text-on-lantern">ログインへ</Text>
            </Pressable>
          </View>
        ) : ready === false ? (
          <View className="gap-4">
            {/* **理由を推測して書かない。** 期限切れなのか、リンクを
                踏まずに来たのかは、ここからは分からない */}
            <Text className="text-body-md text-ink leading-relaxed">
              この画面からはパスワードを変えられません。
            </Text>
            <Text className="text-label-md text-outline leading-relaxed">
              メールのリンクから開き直してください。
            </Text>
            <Pressable
              onPress={() => router.replace('/forgot')}
              className="border border-sage/40 rounded-full px-3.5 min-h-touch justify-center items-center"
            >
              <Text className="text-label-md text-forest">もう一度メールを送る</Text>
            </Pressable>
          </View>
        ) : (
          <FormShell className="gap-4" onSubmit={submit}>
            <View>
              <Text className="text-aux text-ink-faint mb-1.5 tracking-wide">新しいパスワード</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={submit}
                className="bg-stone border border-border rounded px-3 py-3 font-body text-body text-ink"
                placeholderTextColor="#8E8478"
              />
              {/* 条件は失敗する前に出す */}
              <Text className="text-label-md text-outline mt-1.5">パスワードは6文字以上</Text>
            </View>

            {error ? <Text className="text-label-md text-error">{error}</Text> : null}

            <Pressable
              onPress={submit}
              disabled={loading || ready !== true}
              className="bg-lantern-glow rounded-full py-3 min-h-touch justify-center items-center active:opacity-80 disabled:opacity-50"
            >
              <Text className="font-strong text-body text-on-lantern">
                {loading ? '変更中...' : ready === null ? '確認中...' : '変更する'}
              </Text>
            </Pressable>
          </FormShell>
        )}
      </View>
    </ScrollView>
  )
}
