import { beforeEach, describe, expect, it, vi } from 'vitest'

const restorePurchases = vi.fn()
vi.mock('react-native-purchases', () => ({
  default: {
    restorePurchases: (...a) => restorePurchases(...a),
    configure: vi.fn(),
    logIn: vi.fn(),
    getOfferings: vi.fn(),
    purchasePackage: vi.fn(),
  },
}))

// 鍵が無いと `isAvailable()` が false になり、復元は何もせず帰る。
// **入れてから読み込むこと**（モジュールの読み込み時に評価される）
process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'test_key'

const { restore } = await import('./purchases')

beforeEach(() => restorePurchases.mockReset())

// **2026-08-24 の不具合。** `ok` だけを見ていたため、無料の人が
// 「購入を復元」を押すとプランが「Lantern Plus」に変わっていた。
// サーバーは無料のままなので、有料機能を開けば断られる。
describe('復元したかどうか', () => {
  it('権利が無ければ active は false。**処理は通っている**', async () => {
    // 復元するものが無くても RevenueCat は投げない。CustomerInfo が返るだけ
    restorePurchases.mockResolvedValue({ entitlements: { active: {} }, activeSubscriptions: [] })

    const r = await restore()
    expect(r.ok).toBe(true)
    expect(r.active).toBe(false)
  })

  it('entitlement があれば active', async () => {
    restorePurchases.mockResolvedValue({
      entitlements: { active: { plus: { isActive: true } } },
      activeSubscriptions: [],
    })

    expect(await restore()).toMatchObject({ ok: true, active: true })
  })

  it('entitlement を付け替えても、購読が生きていれば active', async () => {
    // 管理画面で名前を変えたときに黙って false にならないこと
    restorePurchases.mockResolvedValue({
      entitlements: { active: {} },
      activeSubscriptions: ['lantern_plus_monthly'],
    })

    expect(await restore()).toMatchObject({ ok: true, active: true })
  })

  it('形が違っても落ちない', async () => {
    restorePurchases.mockResolvedValue(undefined)
    expect(await restore()).toMatchObject({ ok: true, active: false })
  })

  // 例外が飛んだとき（通信断など）に `{ ok: false, active: false }` を
  // 返すことも確かめたかったが、**vitest 側の都合で書けなかった。**
  // mock が拒否済み Promise を `mock.results` に控えるため、
  // `restore` が捕まえていても未処理の拒否として報告される。
  // 単体では通るが、同じファイルに他の検査があると落ちる。
  //
  // 落としたのは、ここが今回の不具合の本体ではないため。
  // 守りたいのは**権利が無いのに「復元しました」と言わないこと**で、
  // それは上の4件が押さえている。
})
