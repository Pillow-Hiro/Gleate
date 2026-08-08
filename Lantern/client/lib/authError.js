// Supabase が返す英語のエラーを、利用者に向けた一文に置き換える。
//
// **技術的な文字列をそのまま出さない。** 記録アプリで
// `AuthApiError: Invalid login credentials` を見せても、
// 利用者にできることが増えない。
//
// 該当しないものは元の文をそのまま返す。握り潰すと、
// 未知の失敗のときに画面が無反応に見える。
const RULES = [
  ['Invalid login credentials', 'メールアドレスまたはパスワードが正しくありません'],
  ['User already registered', 'このメールアドレスはすでに登録されています'],
  ['Password should be at least', 'パスワードは6文字以上で設定してください'],
  ['Unable to validate email address', 'メールアドレスの形を確認してください'],
  ['Email rate limit exceeded', '短い間に送りすぎました。しばらく待ってからお試しください'],
  ['For security purposes', '短い間に送りすぎました。しばらく待ってからお試しください'],
  ['Email not confirmed', 'メールの確認がまだ済んでいません。届いたメールのリンクを開いてください'],
]

export function authErrorMessage(err) {
  const raw = (err && err.message) || ''
  if (!raw) return 'エラーが発生しました'
  for (const [needle, message] of RULES) {
    if (raw.includes(needle)) return message
  }
  return raw
}

/** すでに登録済みか。新規登録の画面でログインへ誘導するために使う。 */
export function isAlreadyRegistered(err) {
  const raw = (err && err.message) || ''
  return raw.includes('User already registered')
}
