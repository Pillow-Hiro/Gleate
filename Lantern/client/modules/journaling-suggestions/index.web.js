// Web には Journaling Suggestions が無い。
// **`expo` の native 読み込みごと Web バンドルから外す**ため、
// 分岐ではなくファイルを分けている（写真・通知と同じ形）。
export function isSuggestionsAvailable() {
  return false
}

export const SuggestionsPickerView = null
