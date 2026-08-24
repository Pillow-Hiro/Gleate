import { useState } from 'react'
import { Pressable, View } from 'react-native'
import Text from './Text'
import FormShell from './FormShell'
import AuthField from './AuthField'

// ログインと新規登録で共有する入力欄。
//
// **画面は分けているが、欄は1つの部品にしている。**
// 2026-08-08 まで1画面をモードで切り替えていた。実機で
// 「どちらをしているのか分からない」と指摘された。
// 画面を分ければ、見出しも文言も宛先もそれぞれに書ける。
// 一方で入力欄そのものは同じなので、2回書くと片方だけ直る。
//
// **2026-08-14 にデザイン案（`0_login`）へ寄せた。**
// 欄を白いカードに載せ、枠ではなく下線で仕切る。
// 送信ボタンはカードの外に出す。カードは「書き込むところ」、
// ボタンは「そこから出る操作」なので、同じ面に載せない。
//
// `mode` は自動入力の指定にだけ使う。
// これを間違えると、新規登録で保存済みの古いパスワードが提案される。
export default function AuthForm({
  mode,
  submitLabel,
  hint,
  error,
  notice,
  loading,
  onSubmit,
  belowFields,
  children,
}) {
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
      setBlank('メールアドレスとパスワードを入れてください。')
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
    <FormShell className="gap-5" onSubmit={handleSubmit}>
      <View className="bg-surface-lowest rounded-lg px-4 shadow-bloom">
        {/* `textContentType` は `emailAddress`。**`username` ではない。**
            2026-08-24 まで `username` を渡していた。実機で2つ出ていた。

            1. 候補バーの見出しが「**ユーザ名**候補」になる。
               欄のラベルは「メールアドレス」なので、言っていることが食い違う
            2. **かなキーボードが出る。** `username` は文字種を決めないので、
               iOS は前に使った日本語配列をそのまま出す。
               `keyboardType` を指定していても、こちらに引きずられる

            このアプリに**ユーザ名という概念は無い。** Supabase の認証は
            メールアドレスだけで、この欄が他のものを受け取ることはない。
            `emailAddress` は `password` / `newPassword` と対になるので、
            パスワードマネージャの組み合わせも崩れない。 */}
        <AuthField
          icon="mail"
          label="メールアドレス"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          keyboardType="email-address"
          returnKeyType="next"
          onSubmitEditing={handleSubmit}
        />

        {/* パスワードマネージャに拾わせるための指定。
            autoComplete が無いと、メールだけ自動入力されてパスワードが空のままになる。
            新規登録では new-password にしないと、保存済みの旧パスワードを
            提案されてしまう。 */}
        <AuthField
          icon="lock"
          label="パスワード"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          textContentType={isSignup ? 'newPassword' : 'password'}
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
          isLast={!belowFields && !hint}
        />

        {/* **条件は失敗する前に出す。**
            2026-08-08 まで、6文字未満で送ってから初めて知らされていた。
            送り直させる理由が最初から分かっているなら、先に書く。 */}
        {hint ? (
          <Text className="text-label-md text-outline pb-3">{hint}</Text>
        ) : null}

        {/* 「パスワードを忘れた場合」はここ。案でもカードの中にある */}
        {belowFields ? <View className="pb-3 items-end">{belowFields}</View> : null}
      </View>

      {blank || error ? (
        <Text className="text-label-md text-error">{blank || error}</Text>
      ) : null}
      {notice ? <Text className="text-label-md text-ai-ink">{notice}</Text> : null}

      <Pressable
        onPress={handleSubmit}
        disabled={loading}
        className="bg-lantern-glow rounded-full py-4 min-h-touch justify-center items-center active:opacity-80 disabled:opacity-50"
      >
        <Text className="font-strong text-body-md text-on-lantern">
          {loading ? '処理中...' : submitLabel}
        </Text>
      </Pressable>

      {children}
    </FormShell>
  )
}
