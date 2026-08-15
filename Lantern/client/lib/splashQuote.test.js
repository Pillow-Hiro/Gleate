import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cacheForNextTime, loadCached } from './splashQuote.web'

// 端末版（`splashQuote.js`）は expo-file-system を使うので vitest では動かない。
// ここで確かめているのは Web 版だが、**守っている約束は同じ**。
//
//   覚えていればそれを同期で返す。無ければ null（呼び出し側が手元の一文に落ちる）。
//   新しく取れた一言は次回のために置くだけ。
function fakeStorage() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
  }
}

describe('起動画面の一言を覚える', () => {
  beforeEach(() => {
    globalThis.localStorage = fakeStorage()
  })
  afterEach(() => {
    delete globalThis.localStorage
  })

  it('覚えていなければ null を返す', () => {
    expect(loadCached()).toBe(null)
  })

  it('置いた一言をそのまま返す', () => {
    cacheForNextTime('灯りは、外から来るのではない。')
    expect(loadCached()).toBe('灯りは、外から来るのではない。')
  })

  it('前後の空白は落とす', () => {
    cacheForNextTime('  今日のことが、言葉になる。\n')
    expect(loadCached()).toBe('今日のことが、言葉になる。')
  })

  it('空の一言は覚えない（空白だけで上書きさせない）', () => {
    cacheForNextTime('書いた言葉は、ここに残っている。')
    cacheForNextTime('')
    cacheForNextTime('   ')
    cacheForNextTime(null)
    cacheForNextTime(undefined)
    expect(loadCached()).toBe('書いた言葉は、ここに残っている。')
  })

  it('あとから置いたものが次回に出る', () => {
    cacheForNextTime('一つ目。')
    cacheForNextTime('二つ目。')
    expect(loadCached()).toBe('二つ目。')
  })

  it('保存領域が無くても落ちない', () => {
    delete globalThis.localStorage
    expect(() => cacheForNextTime('あ。')).not.toThrow()
    expect(loadCached()).toBe(null)
  })

  it('保存が投げても落ちない', () => {
    globalThis.localStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(() => cacheForNextTime('あ。')).not.toThrow()
  })
})
