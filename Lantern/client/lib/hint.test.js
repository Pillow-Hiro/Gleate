import { beforeEach, describe, expect, it, vi } from 'vitest'

const authFetch = vi.fn()
vi.mock('./supabase', () => ({ authFetch: (...a) => authFetch(...a) }))

const { askHint } = await import('./hint')

function reply(status, body) {
  authFetch.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
}

beforeEach(() => authFetch.mockReset())

describe('受け取るもの', () => {
  it('手がかり', async () => {
    reply(200, { kind: 'hint', text: '3月に同じところで止まっています。' })
    expect(await askHint('2026-09-02')).toEqual({
      kind: 'hint',
      text: '3月に同じところで止まっています。',
    })
  })

  it('問い', async () => {
    reply(200, { kind: 'question', text: 'どこで止まっていますか。' })
    expect(await askHint('2026-09-02')).toMatchObject({ kind: 'question' })
  })

  // **どちらを返すかはサーバーが決める。**判定を2か所に置かない
  it('画面は中身で判断しない', async () => {
    reply(200, { kind: 'question', text: '見つかりませんでした。' })
    expect((await askHint('2026-09-02')).kind).toBe('question')
  })
})

describe('断られたとき', () => {
  it('402 と paid_required の両方が揃ったときだけ', async () => {
    reply(402, { error: 'paid_required', message: 'この分析は有料プランで見られます。' })
    expect(await askHint('2026-09-02')).toEqual({
      kind: 'paywall',
      text: 'この分析は有料プランで見られます。',
    })
  })

  it('番号だけでは断りにしない', async () => {
    // 他の理由で 402 が来る余地を残す（`lib/plan.js` と同じ扱い）
    reply(402, { error: 'something_else' })
    expect(await askHint('2026-09-02')).toBeNull()
  })
})

describe('取れなかったとき', () => {
  it('null を返す。**画面は何も出さない**', async () => {
    reply(500, { error: 'failed' })
    expect(await askHint('2026-09-02')).toBeNull()
  })

  it('kind が無ければ捨てる', async () => {
    reply(200, { text: '種別が無い' })
    expect(await askHint('2026-09-02')).toBeNull()
  })

  // 通信が落ちたときに `null` を返すことも確かめたかったが、
  // **vitest 側の都合で書けない。** モックが投げた例外を
  // `mock.results` に控えて報告するため、`askHint` が捕まえていても落ちる。
  // `lib/purchases.test.js` で同じところに当たっている。
  //
  // 落としたのは、ここが本体ではないため。守りたいのは
  // **取れなかったときに画面へ何も出さないこと**で、下の2件が押さえている。

  it('本文が JSON でなくても落ちない', async () => {
    authFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => { throw new Error('not json') },
    })
    expect(await askHint('2026-09-02')).toBeNull()
  })
})
