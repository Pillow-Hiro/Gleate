import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import AuthScreen from '../components/AuthScreen'
import { useRouter } from 'expo-router'
import Text from '../components/Text'
import FormShell from '../components/FormShell'
import AuthField from '../components/AuthField'
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
// 戻り先は Web に固定している（`lib/authLink.js`）。
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

  // **URL はここで読まない**（2026-08-28）。
  //
  // 一度この画面で読んでいたが、**取りこぼす窓があった。**
  // アプリが裏で起きていた場合、リンクの通知は画面が出来る前に飛ぶ。
  // 生えてから listener を付けても、もう終わっている。
  //
  // 受け取りは `lib/recoverySession.js` が根で行う。
  // ここは上の `onAuthStateChange` で、セッションが出来たことに気づく。

  async function submit() {
    if (password.length < 6) {
      setError('パスワードは6文字以上で設定してください。')
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
    <AuthScreen>
      <View className="w-full max-w-sm self-center">
        <View className="items-center mb-10">
          <Text className="font-latin text-display text-on-surface">Gleate</Text>
          <Text className="text-aux text-outline mt-2 tracking-wider">新しいパスワード</Text>
        </View>

        {done ? (
          <View className="gap-4">
            <Text className="text-body-md text-on-surface leading-relaxed">
              新しいパスワードを設定しました。
            </Text>
            {/* **「ログインへ」ではない**（2026-08-28）。
                ここへ来られた時点で復帰用のセッションが出来ており、
                入り直す必要が無い。ログイン画面へ送っても、
                認証ガードがすぐ本画面へ振り替えるだけだった */}
            <Pressable
              onPress={() => router.replace('/')}
              className="bg-lantern-glow rounded-full py-3 min-h-touch justify-center items-center active:opacity-80"
            >
              <Text className="font-strong text-body text-on-lantern">Lanternへ</Text>
            </Pressable>
          </View>
        ) : ready === false ? (
          <View className="gap-4">
            {/* **理由を推測して書かない。** 期限切れなのか、リンクを
                踏まずに来たのかは、ここからは分からない */}
            <Text className="text-body-md text-on-surface leading-relaxed">
              この画面からはパスワードを変えられません。
            </Text>
            <Text className="text-label-md text-outline leading-relaxed">
              メールのリンクから開き直してください。
            </Text>
            {/* **行き先を1つは出す。**（2026-08-28）
                「変えられません」だけだと、どこへ行けばよいか分からない。
                ログイン中なら、メールを待たずにその場で変えられる */}
            <Text className="text-label-md text-outline leading-relaxed">
              ログイン中の場合は、設定 ＞ アカウント からも変えられます。
            </Text>
            <Pressable
              onPress={() => router.replace('/forgot')}
              className="border border-ai-ink/40 rounded-full px-3.5 min-h-touch justify-center items-center"
            >
              <Text className="text-label-md text-primary">もう一度メールを送る</Text>
            </Pressable>
          </View>
        ) : (
          <FormShell className="gap-4" onSubmit={submit}>
            <View className="bg-surface-lowest rounded-lg px-4 shadow-bloom">
              <AuthField
                icon="lock"
                label="新しいパスワード"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={submit}
              />
              {/* 条件は失敗する前に出す */}
              <Text className="text-label-md text-outline py-3">パスワードは6文字以上</Text>
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
    </AuthScreen>
  )
}
