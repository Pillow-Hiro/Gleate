Pod::Spec.new do |s|
  s.name           = 'JournalingSuggestions'
  s.version        = '1.0.0'
  s.summary        = 'Apple の Journaling Suggestions ピッカーを Lantern から出す'
  s.description    = '端末の中の出来事を、書きはじめのきっかけとして選べるようにする。'
  s.author         = ''
  s.homepage       = 'https://golantern.app'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # **弱リンクで JournalingSuggestions を繋ぐ**（2026-08-17・ビルド #16 が落ちた）。
  #
  # `#if canImport(JournalingSuggestions)` だけでは足りなかった。
  # canImport は真になるのに `JournalingSuggestionsPicker` が
  # 「cannot find in scope」で見つからない、という落ち方をした。
  # **module は見えているのに型が見えていない。**
  #
  # pod に framework を書いていないと、その pod の target から
  # 型が解決できないことがある。書けば必ず解決する。
  #
  # 強リンクではなく弱リンクにするのは、**iOS 17.2 未満の端末でも
  # 起動できるようにする**ため。強リンクだと、framework が無い端末では
  # 起動した瞬間に落ちる。使うかどうかは `isAvailable()` が実行時に決める。
  s.weak_frameworks = 'JournalingSuggestions'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
