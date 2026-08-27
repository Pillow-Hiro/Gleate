import { beforeEach, describe, expect, it, vi } from 'vitest'

const authFetch = vi.fn()
vi.mock('./supabase', () => ({ authFetch: (...a) => authFetch(...a) }))

const invalidateLogs = vi.fn()
vi.mock('./logsCache', () => ({ invalidateLogs: () => invalidateLogs() }))

const {
  forgetAllLights,
  forgetLight,
  getLight,
  isLighting,
  requestLight,
  subscribeLight,
} = await import('./lightBuffer')

function respond(text) {
  authFetch.mockResolvedValue({ ok: true, json: async () => ({ ai_response: text }) })
}

beforeEach(() => {
  authFetch.mockReset()
  invalidateLogs.mockReset()
  forgetAllLights()
})

// 2026-08-27 の不具合。灯りが「すぐに消える」と報告があった。
//
// 記録を保存すると親が記録を取り直し、その拍子に `RecordForm` の
// `key` が変わって作り直される（その日の1件目だけ）。
// 待ちも結果もフォームが持っていたため、返ってきた頃には
// 受け取る画面が居なかった。
describe('画面より長生きする', () => {
  it('作り直しをまたいで残る', async () => {
    respond('今日の記録が、ここに残っています。')
    requestLight('2026-08-27')
    await vi.waitFor(() => expect(getLight('2026-08-27')).toBeTruthy())

    // フォームが作り直されても、受け皿は React の外にある
    expect(getLight('2026-08-27')).toBe('今日の記録が、ここに残っています。')
  })

  it('待っている最中かどうかを、あとから生えた画面も知れる', async () => {
    let release
    authFetch.mockReturnValue(new Promise((r) => { release = r }))
    requestLight('2026-08-27')

    // 生え直した画面はここを見て「灯りをともしています。」を出す
    expect(isLighting('2026-08-27')).toBe(true)

    release({ ok: true, json: async () => ({ ai_response: '灯り' }) })
    await vi.waitFor(() => expect(isLighting('2026-08-27')).toBe(false))
  })

  it('日付ごとに分かれている', async () => {
    respond('27日の灯り')
    requestLight('2026-08-27')
    await vi.waitFor(() => expect(getLight('2026-08-27')).toBeTruthy())

    expect(getLight('2026-08-26')).toBe('')
  })
})

describe('重ねて頼まない', () => {
  it('同じ日を続けて頼んでも通信は1本', async () => {
    authFetch.mockReturnValue(new Promise(() => {}))
    requestLight('2026-08-27')
    requestLight('2026-08-27')
    requestLight('2026-08-27')

    expect(authFetch).toHaveBeenCalledTimes(1)
  })
})

describe('一覧への反映', () => {
  it('灯りが届いたら控えを古くする', async () => {
    respond('灯り')
    requestLight('2026-08-27')
    await vi.waitFor(() => expect(invalidateLogs).toHaveBeenCalled())
  })

  it('中身が無ければ控えは触らない', async () => {
    authFetch.mockResolvedValue({ ok: true, json: async () => ({ ai_response: '' }) })
    requestLight('2026-08-27')
    await vi.waitFor(() => expect(isLighting('2026-08-27')).toBe(false))

    expect(invalidateLogs).not.toHaveBeenCalled()
  })

  it('失敗しても待ちは解ける', async () => {
    authFetch.mockResolvedValue({ ok: false })
    requestLight('2026-08-27')

    // **記録は残っている。**灯りが付かないだけ
    await vi.waitFor(() => expect(isLighting('2026-08-27')).toBe(false))
    expect(getLight('2026-08-27')).toBe('')
  })
})

describe('知らせる', () => {
  it('届いたときに知らせが飛ぶ', async () => {
    const seen = vi.fn()
    const off = subscribeLight(seen)

    respond('灯り')
    requestLight('2026-08-27')
    await vi.waitFor(() => expect(seen).toHaveBeenCalled())

    off()
  })

  it('外したら来ない', async () => {
    const seen = vi.fn()
    subscribeLight(seen)()

    respond('灯り')
    requestLight('2026-08-27')
    await vi.waitFor(() => expect(getLight('2026-08-27')).toBeTruthy())

    expect(seen).not.toHaveBeenCalled()
  })
})

describe('捨てる', () => {
  it('書き直したら前の灯りを捨てる', async () => {
    respond('前の灯り')
    requestLight('2026-08-27')
    await vi.waitFor(() => expect(getLight('2026-08-27')).toBeTruthy())

    forgetLight('2026-08-27')
    expect(getLight('2026-08-27')).toBe('')
  })

  it('ログアウトで全部消す', async () => {
    respond('灯り')
    requestLight('2026-08-27')
    await vi.waitFor(() => expect(getLight('2026-08-27')).toBeTruthy())

    // **前の人の文章を次の人に見せない**
    forgetAllLights()
    expect(getLight('2026-08-27')).toBe('')
  })
})
