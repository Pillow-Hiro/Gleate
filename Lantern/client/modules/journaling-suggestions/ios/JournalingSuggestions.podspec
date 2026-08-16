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

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
