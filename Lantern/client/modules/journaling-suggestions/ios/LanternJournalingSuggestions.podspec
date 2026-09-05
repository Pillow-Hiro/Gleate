# **名前を Apple のフレームワークと変えてある。ここを戻さないこと。**
#
# 2026-08-15〜17 のビルド #15〜#17 がここで3度落ちた。
# 当時この Pod は `JournalingSuggestions` という名前で、
# `DEFINES_MODULE = YES` と合わさって**同名の Swift モジュール**を作っていた。
#
# 結果、`JournalingSuggestionsModule.swift` の中で
#
#     #if canImport(JournalingSuggestions)   → 真（自分自身が見つかる）
#     import JournalingSuggestions           → 自分自身を読む
#     JournalingSuggestionsPicker            → cannot find in scope
#
# となり、**Apple のフレームワークを一度も見ていなかった。**
# ビルドログの `-lJournalingSuggestions`（静的ライブラリの印。
# Apple のものなら `-framework`）がその証拠。
#
# `canImport` が真なのに型が無い、という矛盾を見たら名前の衝突を疑う。
Pod::Spec.new do |s|
  s.name           = 'LanternJournalingSuggestions'
  s.version        = '1.0.0'
  s.summary        = 'Apple の Journaling Suggestions ピッカーを Lantern から出す'
  s.description    = '端末の中の出来事を、書きはじめのきっかけとして選べるようにする。'
  s.author         = ''
  s.homepage       = 'https://golantern.app'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # **weak。** アプリの下限は iOS 15.1 で、この framework は 17.2 から。
  # 強リンクにすると 15〜17.1 の端末が**起動した瞬間に落ちる。**
  #
  # HealthKit も weak（2026-09-05）。心の状態の型（`HKStateOfMind`）が
  # そちらに在るので読む必要がある。**iPad では iOS 17 まで HealthKit が
  # 無い。**`supportsTablet` を立ててあるので、強リンクにすると
  # iPadOS 15〜16 が**起動した瞬間に落ちる**——上と同じ落ち方。
  #
  # `import` の自動リンクに任せず明示するのは、**strong で入るのを
  # 避けるため。**任せると強リンクになる。
  s.weak_frameworks = 'JournalingSuggestions', 'HealthKit'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
