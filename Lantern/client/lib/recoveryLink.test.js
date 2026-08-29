import { describe, expect, it } from 'vitest'
import { readRecovery, readRecoveryError } from './recoveryLink'

const OK = 'lantern://reset#access_token=aaa&refresh_token=bbb&type=recovery&expires_in=3600'

describe('復帰用のトークンを取り出す', () => {
  it('`#` のうしろから取る', () => {
    expect(readRecovery(OK)).toEqual({
      access_token: 'aaa',
      refresh_token: 'bbb',
      type: 'recovery',
    })
  })

  it('Web の URL でも同じ', () => {
    const url = 'https://www.golantern.app/reset#access_token=aaa&refresh_token=bbb'
    expect(readRecovery(url)).toMatchObject({ access_token: 'aaa', refresh_token: 'bbb' })
  })

  // **`?` ではない。** クエリだと思って探すと、いつまでも空のまま
  it('クエリに入っていても拾わない', () => {
    expect(readRecovery('lantern://reset?access_token=aaa&refresh_token=bbb')).toBeNull()
  })

  it('片方だけでは返さない', () => {
    // `setSession` は両方を要求する。欠けたまま渡すと落ちる
    expect(readRecovery('lantern://reset#access_token=aaa')).toBeNull()
    expect(readRecovery('lantern://reset#refresh_token=bbb')).toBeNull()
  })

  it('踏まずに開いたときは何も無い', () => {
    expect(readRecovery('lantern://reset')).toBeNull()
    expect(readRecovery('https://www.golantern.app/reset')).toBeNull()
  })

  it('URL でないものを渡しても落ちない', () => {
    for (const v of [null, undefined, '', 0, {}]) expect(readRecovery(v)).toBeNull()
  })

  it('符号化された値を戻す', () => {
    const url = 'lantern://reset#access_token=a%2Bb&refresh_token=c%2Fd'
    expect(readRecovery(url)).toMatchObject({ access_token: 'a+b', refresh_token: 'c/d' })
  })
})

describe('断りを読む', () => {
  it('期限切れの理由を取る', () => {
    const url = 'lantern://reset#error=access_denied&error_description=Email+link+is+invalid+or+has+expired'
    expect(readRecoveryError(url)).toBe('Email link is invalid or has expired')
  })

  it('説明が無ければ種別だけ', () => {
    expect(readRecoveryError('lantern://reset#error=access_denied')).toBe('access_denied')
  })

  // **トークンが無いことと、断られたことは別物。**
  // 踏まずに開いただけなら断りは出ていない
  it('ただ開いただけなら空', () => {
    expect(readRecoveryError('lantern://reset')).toBe('')
    expect(readRecoveryError(OK)).toBe('')
  })

  it('URL でないものを渡しても落ちない', () => {
    for (const v of [null, undefined, '', 0]) expect(readRecoveryError(v)).toBe('')
  })
})
