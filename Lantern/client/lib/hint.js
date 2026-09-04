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
//
// ## どの記録から探すか（2026-09-04・作者の指摘）
//
// **`id` で名指しする。** 送らないとサーバーは日付で引いて、
// その日の**1件目**を見る（`main.py` の `/api/hint`）。
//
// 1日に複数件置けるようにしてから、**噛み合っていなかった。**
// 手がかりは朝の記録から探し、答えは夜の記録に書き込んでいた
// （`components/HintPanel.jsx` は最新を相手にしていた）。
export async function askHint(date, id = '') {
  try {
    const res = await authFetch('/api/hint', {
      method: 'POST',
      body: JSON.stringify({ date, id: id || undefined }),
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
