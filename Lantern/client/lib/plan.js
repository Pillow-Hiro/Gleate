// いま無料か有料か、を画面が知るための場所。
//
// ## ここは飾り
//
// **機能を開けているのはサーバー。** `@require_paid` が 402 を返す
// （`modules/plan.py`）。ここが嘘をついても有料の経路は通らない。
//
// では何のためにあるかというと、**押す前に分かるようにする**ため。
// 押してから断られるより、押す前に分かっている方がよい。
//
// ## 402 の見分け
//
// サーバーは断るとき 402 と `error: "paid_required"` を返す。
// 番号だけで見分けない（他の理由で 402 が来る余地を残す）。

/** 有料が要る、と断られたか */
export function isPaidRequired(status, body) {
  if (status !== 402) return false
  return body?.error === 'paid_required'
}

/**
 * 応答を読んで、断られていれば理由を返す。**本文を1回しか読めない**ので
 * 呼ぶ側が二重に `json()` しないための入口でもある。
 *
 * 戻り値: `{ paidRequired, body }`
 */
export async function readMaybePaywall(res) {
  let body = null
  try {
    body = await res.json()
  } catch (e) {
    // 本文が無い/JSONでない。402 かどうかだけで判断する
    return { paidRequired: res.status === 402, body: null }
  }
  return { paidRequired: isPaidRequired(res.status, body), body }
}

// 断られたときに画面へ出す一文。**煽らない**が、
// **断られたことは伝わること。** `modules/plan.py` と同じ文にしてある
// （サーバーが本文を返せなかったときだけここが出る）。
export const PAYWALL_FALLBACK = 'この分析は有料プランで見られます。'

export function paywallMessage(body) {
  const m = body?.message
  return typeof m === 'string' && m.trim() ? m : PAYWALL_FALLBACK
}
