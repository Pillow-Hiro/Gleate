import { Platform } from 'react-native'
import { requireNativeModule, requireNativeView } from 'expo'

// Journaling Suggestions（iOS 17.2+）。
//
// **無い場合に落ちない形で読む。**
// このモジュールは iOS にしか無く、`app.json` に権利を足した
// ビルドでしか動かない。Android と、権利の無い古いビルドでは
// `requireNativeModule` が投げる。
// 2026-08-09 に `expo-glass-effect` で同じ形を踏んでいる
// （読み込んだ時点で落ちるものを静的に import しない）。
let native = null
let NativeView = null

if (Platform.OS === 'ios') {
  try {
    native = requireNativeModule('JournalingSuggestions')
    NativeView = requireNativeView('JournalingSuggestions')
  } catch {
    // 権利の無いビルドではここに来る。入口を描かないだけで、他は動く
    native = null
    NativeView = null
  }
}

// 端末が出せるかどうか。**出せないなら入口を描かない。**
// できないことをボタンにして置くと、押した人が自分の操作を疑う。
export function isSuggestionsAvailable() {
  if (!native) return false
  try {
    return Boolean(native.isAvailable())
  } catch {
    return false
  }
}

export { NativeView as SuggestionsPickerView }
