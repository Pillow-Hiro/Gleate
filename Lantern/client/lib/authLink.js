// 認証メールの戻り先。**登録の確認**と**パスワード再設定**の2つ。
//
// **Web に戻す。ネイティブへは戻さない。**
//
// アプリへ戻すにはディープリンク（`lantern://`）が要るが、
// メールのリンクを踏むのは端末のブラウザで、そこから
// アプリへ渡す経路は端末の設定に左右される。開かなかったとき、
// 利用者には**何も起きないように見える。**
//
// Web に戻せば、どの端末でも必ず開く。1手増えるが、確実に着く。
//
// **自前のドメイン**（2026-08-20）。`lib/openLegal.js` と揃える。
//
// **Supabase の Redirect URLs にも足すこと。** 許可された URL でないと
// メールのリンクが弾かれる。Site URL も同じところへ向けておく
// （**渡し忘れた経路はここへ落ちる**。localhost のままだと、
// 出回ったメールが開発機を指す）。
const FALLBACK = 'https://www.golantern.app'

// 2026-08-24。ここまで**登録の確認だけ戻り先を渡していなかった。**
// 再設定には `resetRedirectTo` があったので気づきにくかったが、
// 渡さない経路は Supabase の Site URL に落ちる。そこが localhost だったため、
// 確認メールのリンクが**開発機**へ飛んでいた。
//
// 戻す先はログイン画面。確認そのものは Supabase 側で済んでいるので、
// ここへ着いた時点でそのアドレスは使える。あとは入るだけ。
export function signupRedirectTo() {
  return `${FALLBACK}/login`
}

export function resetRedirectTo() {
  return `${FALLBACK}/reset`
}
