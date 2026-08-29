// 再設定リンクから戻ってきた URL を読む。**文字列だけ。`react-native` を読み込まない。**
//
// 分けているのは検査のため（`lib/authLink.js` と同じ理由）。
// 使う側は `app/reset.jsx`。
//
// ## なぜ自分で読むのか（2026-08-28）
//
// Supabase は implicit 流儀で、セッションを **URL の `#` のうしろ**に載せて返す。
//
//     lantern://reset#access_token=...&refresh_token=...&type=recovery
//
// Web では `detectSessionInUrl` が拾ってくれるが、**ネイティブでは効かない**
// （`window.location` が無い。`lib/supabase.js` を参照）。
// アプリへ戻す以上、ここは自分で読んで `setSession` に渡すしかない。
//
// **`?` ではなく `#` にある。** クエリだと思って `useLocalSearchParams` を
// 見にいくと、いつまでも空のままになる。

/**
 * URL から復帰用のトークンを取り出す。
 *
 * 取れなければ `null`。**片方だけでは返さない**——
 * `setSession` は両方を要求するので、欠けたまま渡すと落ちる。
 */
export function readRecovery(url) {
  if (typeof url !== 'string' || !url) return null

  const hash = url.indexOf('#')
  if (hash === -1) return null

  const params = new URLSearchParams(url.slice(hash + 1))
  const access_token = params.get('access_token')
  const refresh_token = params.get('refresh_token')
  if (!access_token || !refresh_token) return null

  return { access_token, refresh_token, type: params.get('type') || '' }
}

/**
 * 期限切れなど、Supabase が `#` に載せてくる断り。
 *
 * **トークンが無いこととは別物。** 単に踏まずに開いただけなら
 * 何も無いが、期限切れのときは理由が載って戻ってくる。
 */
export function readRecoveryError(url) {
  if (typeof url !== 'string' || !url) return ''

  const hash = url.indexOf('#')
  if (hash === -1) return ''

  const params = new URLSearchParams(url.slice(hash + 1))
  return params.get('error_description') || params.get('error') || ''
}
