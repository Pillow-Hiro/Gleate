import Purchases from 'react-native-purchases'

// 買うところ。**RevenueCat 経由。**
//
// ## なぜ直接 StoreKit を触らないのか
//
// Apple のレシート検証をこちらで持つと、
// サーバーに検証・失効・返金・猶予期間の追跡を全部書くことになる。
// RevenueCat がそれをやり、結果を webhook でこちらへ送る
// （`modules/billing.py`）。**端末は「買った」と言う経路に入らない。**
//
// ## 鍵が無いときは黙って閉じる
//
// `EXPO_PUBLIC_REVENUECAT_IOS_KEY` は作者が RevenueCat の管理画面から
// 持ってくる。**無い間は購入そのものを出さない。**
// 押せるのに必ず失敗するボタンより、無い方がよい。
//
// ## 誰が買ったか
//
// `logIn(userId)` に Supabase の user_id を渡す。これが webhook の
// `app_user_id` として戻ってくる（`modules/billing.py`）。
// **渡し忘れると、買った人と記録の持ち主が結び付かない。**

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || ''
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || ''

/** 買える状態か。**鍵が無ければ false**（画面は購入を出さない） */
export function isAvailable() {
  return Boolean(IOS_KEY || ANDROID_KEY)
}

let configured = false

/** 一度だけ設定する。**user_id は必ず渡すこと** */
export async function configure(userId) {
  if (!isAvailable()) return false
  try {
    if (!configured) {
      await Purchases.configure({ apiKey: IOS_KEY || ANDROID_KEY, appUserID: userId || null })
      configured = true
    } else if (userId) {
      // 同じ端末で別の人がログインしたとき。**前の人の権利を引き継がせない**
      await Purchases.logIn(userId)
    }
    return true
  } catch (e) {
    console.warn('[購入] 設定に失敗', e)
    return false
  }
}

/** 売っているものの一覧。取れなければ空配列（**画面は「準備中」を出す**） */
export async function loadOfferings() {
  if (!isAvailable()) return []
  try {
    const offerings = await Purchases.getOfferings()
    const current = offerings?.current
    if (!current) return []
    return (current.availablePackages || []).map((pkg) => ({
      id: pkg.identifier,
      // 価格は**必ずストアが返した文字列を出す**。自分で組み立てない
      // （通貨記号・桁区切り・税の扱いが国ごとに違う）
      price: pkg.product?.priceString || '',
      title: pkg.product?.title || '',
      // 期間。Apple の審査は「何の期間でいくらか」を画面に求める
      period: pkg.packageType || '',
      raw: pkg,
    }))
  } catch (e) {
    console.warn('[購入] 品目を取れなかった', e)
    return []
  }
}

/** 買う。戻り値は `{ ok, cancelled, error }`。**投げない** */
export async function purchase(pkg) {
  if (!isAvailable()) return { ok: false, cancelled: false, error: 'unavailable' }
  try {
    await Purchases.purchasePackage(pkg.raw ?? pkg)
    return { ok: true, cancelled: false, error: null }
  } catch (e) {
    // **やめたのは失敗ではない。** 赤い字を出さない
    if (e?.userCancelled) return { ok: false, cancelled: true, error: null }
    console.warn('[購入] 失敗', e)
    return { ok: false, cancelled: false, error: e?.message || 'failed' }
  }
}

/** 買い直しの復元。**Apple の審査要件**（機種変更・再インストール時の導線） */
export async function restore() {
  if (!isAvailable()) return { ok: false, error: 'unavailable' }
  try {
    await Purchases.restorePurchases()
    return { ok: true, error: null }
  } catch (e) {
    console.warn('[購入] 復元に失敗', e)
    return { ok: false, error: e?.message || 'failed' }
  }
}
