import { authFetch } from './supabase'
import { isPaidRequired } from './plan'

// 手がかりを取りに行く。**結果は3通り。**
//
// ## なぜ「問い」が返ってくるのか（2026-09-02）
//
// 手がかりには**詰まりと、そのとき打った手**が要る。
// だが書く瞬間は一行のままにしておきたい（記録しやすさの4段の2）。
// **同じ入力に両方を負わせない。**
//
// そこで、材料が足りないときは**一つだけ問う。**
// 集めるのは「手がかりが欲しい」と思った瞬間——**そのとき人は詰まっている。**
// 一番濃いところで聞ける。答えは「困ったこと」に入る。
//
// どちらを返すかは**サーバーが決める**（`main.py` の `/api/hint`）。
// 画面は受け取ったものを出すだけ。判定を2か所に置かない。
//
// ## 戻り値
//
//   { kind: 'hint',     text }  … 手がかり（見つからなかった旨のこともある）
//   { kind: 'question', text }  … 一つだけの問い
//   { kind: 'paywall',  text }  … 無料の枠を使い切った
//   null                        … 取れなかった（画面は何も出さない）
export async function askHint(date) {
  try {
    const res = await authFetch('/api/hint', {
      method: 'POST',
      body: JSON.stringify({ date }),
    })

    let body = null
    try {
      body = await res.json()
    } catch (e) {
      body = null
    }

    if (isPaidRequired(res.status, body)) {
      return { kind: 'paywall', text: (body && body.message) || '' }
    }
    if (!res.ok || !body || !body.kind) return null

    return { kind: body.kind, text: body.text || '' }
  } catch (e) {
    // 取れなくても記録は残っている。**赤い字を出さない**
    console.warn('[手がかり] 受け取れなかった', e)
    return null
  }
}
