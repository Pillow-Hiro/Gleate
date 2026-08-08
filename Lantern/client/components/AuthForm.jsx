import { useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import Text from './Text'
import FormShell from './FormShell'

// ログインと新規登録で共有する入力欄。
//
// **画面は分けているが、欄は1つの部品にしている。**
// 2026-08-08 まで1画面をモードで切り替えていた。実機で
// 「どちらをしているのか分からない」と指摘された。
// 画面を分ければ、見出しも文言も宛先もそれぞれに書ける。
// 一方で入力欄そのものは同じなので、2回書くと片方だけ直る。
//
// `mode` は自動入力の指定にだけ使う。
// これを間違えると、新規登録で保存済みの古いパスワードが提案される。
export default function AuthForm({ mode, submitLabel, hint, error, notice, loading, onSubmit, children }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [blank, setBlank] = useState('')

  const isSignup = mode === 'signup'

  // **空のまま送らせない。**
  // 2026-08-08 まで、空欄で押すと Supabase が
  // 「Anonymous sign-ins are disabled」を返し、それがそのまま出ていた。
  // 匿名ログインの話は利用者に関係がなく、何をすればよいかも分からない。
  function handleSubmit() {
    const trimmed = email.trim()
    if (!trimmed || !password) {
      setBlank('メールアドレスとパスワードを入れてください')
      return
    }
    setBlank('')
    onSubmit(trimmed, password)
  }

  return (
    // Web では FormShell が <form> を出す。
    // パスワードマネージャは <form> を手がかりに動くため、
    // 無いとメールだけ入ってパスワードが入らない。
    // Enter での送信もブラウザの既定動作なので <form> が要る。
    <FormShell className="gap-4" onSubmit={handleSubmit}>
      <View>
        <Text className="text-aux text-ink-faint mb-1.5 tracking-wide">メールアドレス</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          textContentType="username"
          keyboardType="email-address"
          returnKeyType="next"
          onSubmitEditing={handleSubmit}
          className="bg-stone border border-border rounded px-3 py-3 font-body text-body text-ink"
          placeholderTextColor="#8E8478"
        />
      </View>

      <View>
        <Text className="text-aux text-ink-faint mb-1.5 tracking-wide">パスワード</Text>
        {/* パスワードマネージャに拾わせるための指定。
            autoComplete が無いと、メールだけ自動入力されてパスワードが空のままになる。
            新規登録では new-password にしないと、保存済みの旧パスワードを
            提案されてしまう。 */}
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          textContentType={isSignup ? 'newPassword' : 'password'}
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
          className="bg-stone border border-border rounded px-3 py-3 font-body text-body text-ink"
          placeholderTextColor="#8E8478"
        />
        {/* **条件は失敗する前に出す。**
            2026-08-08 まで、6文字未満で送ってから初めて知らされていた。
            送り直させる理由が最初から分かっているなら、先に書く。 */}
        {hint ? <Text className="text-aux text-ink-faint mt-1.5">{hint}</Text> : null}
      </View>

      {blank || error ? (
        <Text className="text-aux text-error">{blank || error}</Text>
      ) : null}
      {notice ? <Text className="text-aux text-sage">{notice}</Text> : null}

      <Pressable
        onPress={handleSubmit}
        disabled={loading}
        className="bg-lantern-glow rounded-full py-3 min-h-touch justify-center items-center active:opacity-80 disabled:opacity-50"
      >
        <Text className="font-strong text-body text-on-lantern">{loading ? '処理中...' : submitLabel}</Text>
      </Pressable>

      {children}
    </FormShell>
  )
}
