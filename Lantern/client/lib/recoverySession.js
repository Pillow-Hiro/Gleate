import * as Linking from 'expo-linking'
import { supabase } from './supabase'
import { readRecovery, readRecoveryError } from './recoveryLink'

// 再設定リンクで開かれたときに、復帰用のセッションを作る。
//
// ## なぜ根で受けるのか（2026-08-28）
//
// はじめ `app/reset.jsx` の中で URL を読んでいた。**取りこぼす窓がある。**
//
// アプリが裏で起きていた場合、リンクの通知は
// **画面が出来る前に飛ぶ。** 生えてから `addEventListener` を付けても、
// もう終わったあとで届かない。`getInitialURL()` は
// **起動のきっかけになった URL しか返さない**ので、そこも空になる。
// 結果、アプリは開くのにセッションが作られず、
// 「この画面からはパスワードを変えられません」が出続けた。
//
// **根で受ければ、画面より先に居られる。**
// セッションさえ出来ていれば、`reset.jsx` は自分の
// `onAuthStateChange` で気づく。URL を知る必要が無くなる。
//
// ## Web では何もしない
//
// `detectSessionInUrl` が拾う（`lib/supabase.js`）。二重に処理しない。

/**
 * 再設定リンクの監視を始める。**戻り値を呼ぶと止まる。**
 *
 * 起動のきっかけになった URL と、動いている間に届く URL の両方を見る。
 * **片方だけでは足りない**——冷えた起動と、裏で生きていた場合で経路が違う。
 */
export function watchRecoveryLinks() {
  let stopped = false

  async function accept(url) {
    if (stopped || !url) return

    const failed = readRecoveryError(url)
    if (failed) {
      // 期限切れなど。**画面には出さない**（英語で来るため）。
      // セッションが出来ないので、reset.jsx がやり直す入口を見せる
      console.warn('[再設定] リンクが使えなかった', failed)
      return
    }

    const found = readRecovery(url)
    if (!found) return

    const { error } = await supabase.auth.setSession({
      access_token: found.access_token,
      refresh_token: found.refresh_token,
    })
    if (error) console.warn('[再設定] セッションを作れなかった', error)
  }

  Linking.getInitialURL().then(accept).catch((e) => {
    console.warn('[再設定] 起動URLを読めなかった', e)
  })
  const sub = Linking.addEventListener('url', ({ url }) => accept(url))

  return () => {
    stopped = true
    sub.remove()
  }
}
