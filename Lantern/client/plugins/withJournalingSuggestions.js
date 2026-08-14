const { withEntitlementsPlist } = require('expo/config-plugins')

// Journaling Suggestions の権利を足す。
//
//     com.apple.developer.journal.allow = ["suggestions"]
//
// Apple のドキュメントによれば、**申請は要らない。**
// Xcode の "Journaling Suggestions" capability を入れるとこの権利が付く、
// という位置づけで、承認を待つ類のものではない。
// 追加の許可も求めない — 利用者がピッカーで選ぶまで、アプリからは
// 提案の中身が見えないため。
//
// **プッシュのときと同じ落とし穴がある。**（2026-08-13・ビルド #8）
// 権利を足すと、既存のプロビジョニングプロファイルに capability が
// 無いためビルドが落ちる。**プロファイルを作り直す必要がある。**
// あちらは使わない権利だったので外したが、こちらは使う権利なので足す。
module.exports = function withJournalingSuggestions(config) {
  return withEntitlementsPlist(config, (cfg) => {
    cfg.modResults['com.apple.developer.journal.allow'] = ['suggestions']
    return cfg
  })
}
