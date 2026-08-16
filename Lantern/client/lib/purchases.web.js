// Web では買えない。
//
// Apple のデジタル課金はアプリの中でしか成立せず、
// Web に別の決済を置くと**2つの経路で同じ権利を売る**ことになる。
// どちらで買ったかで解約の窓口が変わり、問い合わせが割れる。
//
// Web は**買った人が使う場所**。買う場所ではない。
export function isAvailable() {
  return false
}

export async function configure() {
  return false
}

export async function loadOfferings() {
  return []
}

export async function purchase() {
  return { ok: false, cancelled: false, error: 'unavailable' }
}

export async function restore() {
  return { ok: false, error: 'unavailable' }
}
