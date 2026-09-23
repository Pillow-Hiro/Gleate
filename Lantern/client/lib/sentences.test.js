import { describe, expect, it } from 'vitest'
import { splitSentences } from './sentences'

describe('splitSentences', () => {
  it('句点で切り、句点は前の文に残す', () => {
    expect(splitSentences('音に向いているのかもしれません。合わせる手間のほうです。')).toEqual([
      '音に向いているのかもしれません。',
      '合わせる手間のほうです。',
    ])
  })

  it('句点が無ければ1文', () => {
    expect(splitSentences('まだ書いている途中')).toEqual(['まだ書いている途中'])
  })

  // 見立ては本人の言葉を「」で引く。**引用の中で切らない**
  it('かぎ括弧の中の句点では切らない', () => {
    expect(splitSentences('「やった。」と書いています。')).toEqual(['「やった。」と書いています。'])
  })

  it('空なら何も返さない', () => {
    expect(splitSentences('')).toEqual([])
    expect(splitSentences(null)).toEqual([])
    expect(splitSentences('   ')).toEqual([])
  })
})
