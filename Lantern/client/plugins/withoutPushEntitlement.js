const { withEntitlementsPlist } = require('expo/config-plugins')

// **プッシュ通知の権利を外す。**
//
// `expo-notifications` を入れると、iOS の権利に `aps-environment` が
// 自動で足される。ビルド #8 はこれで落ちた。
//
//     Provisioning profile ... doesn't include the Push Notifications capability
//
// 直し方は2つあった。
//
// 1. Apple 側でプロビジョニングプロファイルに Push Notifications を足す
// 2. 権利そのものを外す
//
// **2 を選んだ。** Lantern が使うのは端末の中だけで完結する予約で、
// サーバーから送るプッシュは使わない（`lib/notify.js`）。
// プッシュトークンを取らないのは、**誰がいつ開いたかをサーバーに
// 残さない**ための設計上の選択で、あとから変える予定も無い。
//
// 使わない機能を「できることにして」おくと、
// - Apple の審査で用途を説明する対象が1つ増える
// - あとから「プッシュも使えるのでは」と設計が揺れる
//
// 権利が無ければローカル通知は動く。プッシュだけが動かない。
// **それがこのアプリの意図した状態。**
module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment']
    return cfg
  })
}
