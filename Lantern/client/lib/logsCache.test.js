import { beforeEach, describe, expect, it, vi } from 'vitest'

// 端末の控えは使わない。**この検査が見るのは「取り直しに行くかどうか」**
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => {}),
    removeItem: vi.fn(async () => {}),
  },
}))

const authFetch = vi.fn()
vi.mock('./supabase', () => ({ authFetch: (...a) => authFetch(...a) }))

const { forgetLogs, invalidateLogs, loadLogs, replaceLogs } = await import('./logsCache')

function respond(list) {
  authFetch.mockResolvedValue({ ok: true, json: async () => list })
}

const A = [{ date: '2026-08-23' }]
const B = [{ date: '2026-08-23' }, { date: '2026-08-24' }]

beforeEach(async () => {
  authFetch.mockReset()
  await forgetLogs()
})

describe('15秒の据え置き', () => {
  it('続けて呼んでも取りに行かない', async () => {
    respond(A)
    expect(await loadLogs()).toEqual(A)
    expect(authFetch).toHaveBeenCalledTimes(1)

    expect(await loadLogs()).toEqual(A)
    // タブを行き来するだけで毎回叩かないための決まり
    expect(authFetch).toHaveBeenCalledTimes(1)
  })
})

describe('invalidateLogs', () => {
  // **これが無かったために「記録の反映が遅い」が起きた**（2026-08-24）。
  // 書いた直後も据え置きの対象になっていて、足した1件が
  // 最大15秒ぶん一覧に出てこなかった。
  it('据え置き中でも取り直しに行く', async () => {
    respond(A)
    await loadLogs()
    expect(authFetch).toHaveBeenCalledTimes(1)

    respond(B)
    invalidateLogs()
    expect(authFetch).toHaveBeenCalledTimes(2)
  })

  it('取り直した中身が画面に届く', async () => {
    respond(A)
    await loadLogs()

    respond(B)
    invalidateLogs()

    // **画面は `onFresh` で受け取る。**呼んだ側は待たされない
    const fresh = vi.fn()
    expect(await loadLogs(fresh)).toEqual(A)
    await vi.waitFor(() => expect(fresh).toHaveBeenCalledWith(B))

    expect(await loadLogs()).toEqual(B)
  })

  it('控えは捨てない。取り直しの前でも前のものが出る', async () => {
    respond(A)
    await loadLogs()

    // 応答を保留させて、取り直しの最中を作る
    let release
    authFetch.mockReturnValue(new Promise((r) => { release = r }))
    invalidateLogs()

    // **空にしない。**書いた直後に一覧が真っ白になる方が悪い
    expect(await loadLogs()).toEqual(A)
    release({ ok: true, json: async () => B })
  })
})

describe('replaceLogs', () => {
  it('差し替えたものは据え置きになり、取りに行かない', async () => {
    respond(A)
    await loadLogs()
    authFetch.mockReset()

    replaceLogs(B)
    expect(await loadLogs()).toEqual(B)
    expect(authFetch).not.toHaveBeenCalled()
  })

  it('配列でないものは無視する', async () => {
    respond(A)
    await loadLogs()

    replaceLogs(null)
    expect(await loadLogs()).toEqual(A)
  })
})

describe('forgetLogs', () => {
  it('忘れたあとは取りに行く', async () => {
    respond(A)
    await loadLogs()
    await forgetLogs()

    respond(B)
    expect(await loadLogs()).toEqual(B)
  })
})
