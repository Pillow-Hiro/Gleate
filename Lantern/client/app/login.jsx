import { useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { supabase } from '../lib/supabase'
import FormShell from '../components/FormShell'

// 文言・認証方式はWeb版 frontend/src/pages/Login.jsx をそのまま踏襲する
// （メールアドレス＋パスワード。OTPではない）
export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit() {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('確認メールを送信しました。メールを確認してください。')
      }
    } catch (err) {
      const msg = err.message || 'エラーが発生しました'
      if (msg.includes('Invalid login credentials')) {
        setError('メールアドレスまたはパスワードが正しくありません')
      } else if (msg.includes('User already registered')) {
        setError('このメールアドレスはすでに登録されています')
      } else if (msg.includes('Password should be at least')) {
        setError('パスワードは6文字以上で設定してください')
      } else {
        setError(msg)
      }
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
          <Text className="font-display text-3xl font-light text-ink tracking-[8px]">Lantern</Text>
          <Text className="text-xs text-ink-faint mt-2 tracking-wider">創作の道を照らす、AI伴走者</Text>
        </View>

        {/* Web では FormShell が <form> を出す。
            パスワードマネージャは <form> を手がかりに動くため、
            無いとメールだけ入ってパスワードが入らない。
            Enter での送信もブラウザの既定動作なので <form> が要る。 */}
        <FormShell className="gap-4" onSubmit={handleSubmit}>
          <View>
            <Text className="text-xs text-ink-faint mb-1.5 tracking-wide">メールアドレス</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              textContentType="username"
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={handleSubmit}
              className="bg-stone border border-border rounded-lg px-3 py-3 text-sm text-ink"
              placeholderTextColor="#999999"
            />
          </View>

          <View>
            <Text className="text-xs text-ink-faint mb-1.5 tracking-wide">パスワード</Text>
            {/* パスワードマネージャに拾わせるための指定。
                autoComplete が無いと、メールだけ自動入力されてパスワードが空のままになる。
                新規登録では new-password にしないと、保存済みの旧パスワードを
                提案されてしまう。 */}
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              textContentType={mode === 'login' ? 'password' : 'newPassword'}
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
              className="bg-stone border border-border rounded-lg px-3 py-3 text-sm text-ink"
              placeholderTextColor="#999999"
            />
          </View>

          {error ? <Text className="text-xs text-red-500">{error}</Text> : null}
          {message ? <Text className="text-xs text-sage">{message}</Text> : null}

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            className="bg-forest rounded-full py-3 items-center active:opacity-80 disabled:opacity-50"
          >
            <Text className="text-sm text-cream">
              {loading ? '処理中...' : mode === 'login' ? 'ログイン' : '登録する'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}
            className="items-center pt-2"
          >
            <Text className="text-xs text-ink-faint">
              {mode === 'login' ? 'アカウントを作成する' : 'ログインに戻る'}
            </Text>
          </Pressable>
        </FormShell>
      </View>
    </ScrollView>
  )
}
