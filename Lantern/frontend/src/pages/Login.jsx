import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
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
    <div className="min-h-screen bg-cream flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="text-center mb-10">
          <p className="font-display text-3xl font-light text-ink tracking-[0.3em]">Lantern</p>
          <p className="text-xs text-ink-faint mt-2 tracking-wider">創作の道を照らす、AI伴走者</p>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-ink-faint mb-1.5 tracking-wide">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-stone border border-border rounded-lg px-4 py-3 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-sage/60 transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs text-ink-faint mb-1.5 tracking-wide">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full bg-stone border border-border rounded-lg px-4 py-3 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-sage/60 transition-colors"
              placeholder={mode === 'signup' ? '6文字以上' : '••••••••'}
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 text-center">{error}</p>
          )}
          {message && (
            <p className="text-xs text-forest text-center">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-forest text-cream text-sm py-3 rounded-lg tracking-wide hover:bg-sage transition-colors disabled:opacity-50 mt-2"
          >
            {loading
              ? (mode === 'login' ? 'ログイン中...' : '登録中...')
              : (mode === 'login' ? 'ログイン' : 'アカウントを作成')}
          </button>
        </form>

        {/* モード切り替え */}
        <p className="text-center text-xs text-ink-faint mt-6">
          {mode === 'login' ? (
            <>
              アカウントをお持ちでない方は{' '}
              <button
                onClick={() => { setMode('signup'); setError(''); setMessage('') }}
                className="text-forest hover:text-sage transition-colors underline underline-offset-2"
              >
                新規登録
              </button>
            </>
          ) : (
            <>
              すでにアカウントをお持ちの方は{' '}
              <button
                onClick={() => { setMode('login'); setError(''); setMessage('') }}
                className="text-forest hover:text-sage transition-colors underline underline-offset-2"
              >
                ログイン
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
