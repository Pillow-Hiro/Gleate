import { useEffect, useState } from 'react'
import { Platform, Pressable, View } from 'react-native'
import * as Linking from 'expo-linking'
import AuthScreen from '../components/AuthScreen'
import { useRouter } from 'expo-router'
import Text from '../components/Text'
import FormShell from '../components/FormShell'
import AuthField from '../components/AuthField'
import { supabase } from '../lib/supabase'
import { authErrorMessage } from '../lib/authError'
import { readRecovery, readRecoveryError } from '../lib/recoveryLink'

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

  // **ネイティブは URL を自分で読む**（2026-08-28）。
  //
  // Web は `detectSessionInUrl` が拾うが、ネイティブでは効かない
  // （`window.location` が無い）。アプリへ戻す作りにしたので、
  // `lantern://reset#access_token=...` を自分で解いて渡す。
  //
  // 起動していない状態で開かれる場合と、裏で生きていた場合の両方がある。
  // 前者は `getInitialURL`、後者は `addEventListener`。**片方だけでは落ちる。**
  useEffect(() => {
    if (Platform.OS === 'web') return undefined
    let cancelled = false

    async function accept(url) {
      if (cancelled || !url) return

      const failed = readRecoveryError(url)
      if (failed) {
        // 期限切れなど。**理由は出さない**（英語で来るため）。
        // やり直す入口だけ見せる
        console.warn('[再設定] リンクが使えなかった', failed)
        setReady(false)
        return
      }

      const found = readRecovery(url)
      if (!found) return

      const { error: err } = await supabase.auth.setSession({
        access_token: found.access_token,
        refresh_token: found.refresh_token,
      })
      if (cancelled) return
      if (err) {
        console.warn('[再設定] セッションを作れなかった', err)
        setReady(false)
        return
      }
      setReady(true)
    }

    Linking.getInitialURL().then(accept)
    const sub = Linking.addEventListener('url', ({ url }) => accept(url))

    return () => {
      cancelled = true
      sub.remove()
    }
  }, [])

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
          <Text className="font-latin text-display text-ink">Lantern</Text>
          <Text className="text-aux text-ink-faint mt-2 tracking-wider">新しいパスワード</Text>
        </View>

        {done ? (
          <View className="gap-4">
            <Text className="text-body-md text-ink leading-relaxed">
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
            <Text className="text-body-md text-ink leading-relaxed">
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
              className="border border-sage/40 rounded-full px-3.5 min-h-touch justify-center items-center"
            >
              <Text className="text-label-md text-forest">もう一度メールを送る</Text>
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
