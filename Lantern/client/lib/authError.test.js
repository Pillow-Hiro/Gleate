import { describe, expect, it } from 'vitest'
import { authErrorMessage, isAlreadyRegistered } from './authError'

describe('authErrorMessage', () => {
  it('Supabase の英文を日本語の一文に置き換える', () => {
    expect(authErrorMessage({ message: 'Invalid login credentials' }))
      .toBe('メールアドレスまたはパスワードが正しくありません。')
    expect(authErrorMessage({ message: 'Password should be at least 6 characters' }))
      .toBe('パスワードは6文字以上で設定してください。')
  })

  it('前後に語が付いていても拾う（Supabase は文面を変えることがある）', () => {
    expect(authErrorMessage({ message: 'AuthApiError: Invalid login credentials.' }))
      .toBe('メールアドレスまたはパスワードが正しくありません。')
  })

  it('連投の制限は2通りの文面が来る。どちらも同じ案内にする', () => {
    const wait = '続けて送られました。少し時間をおいてください。'
    expect(authErrorMessage({ message: 'Email rate limit exceeded' })).toBe(wait)
    expect(authErrorMessage({ message: 'For security purposes, you can only request this after 51 seconds' }))
      .toBe(wait)
  })

  it('知らない失敗は握り潰さず、そのまま出す', () => {
    // 空文字にすると画面が無反応に見え、原因を追う手がかりも消える
    expect(authErrorMessage({ message: 'network unreachable' })).toBe('network unreachable')
  })

  it('message が無いときも文言を返す', () => {
    expect(authErrorMessage(null)).toBe('うまくいきませんでした。もう一度試せます。')
    expect(authErrorMessage({})).toBe('うまくいきませんでした。もう一度試せます。')
  })
})

describe('isAlreadyRegistered', () => {
  it('登録済みのときだけ true', () => {
    expect(isAlreadyRegistered({ message: 'User already registered' })).toBe(true)
    expect(isAlreadyRegistered({ message: 'Invalid login credentials' })).toBe(false)
    expect(isAlreadyRegistered(null)).toBe(false)
  })
})
