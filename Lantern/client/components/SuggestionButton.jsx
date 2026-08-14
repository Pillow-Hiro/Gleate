import { View } from 'react-native'
import {
  isSuggestionsAvailable,
  SuggestionsPickerView,
} from '../modules/journaling-suggestions'

// 「今日の出来事から選ぶ」。
//
// Apple の Journaling Suggestions を出す入口。**書く前の1行を作るためだけ。**
//
// 受け取るのは提案の見出し（`title`）だけで、それを「やったこと」の欄に
// 差し込む。**そこから先は利用者が書く。**
// 写真も運動も心拍も受け取らない（理由は `modules/.../JournalingSuggestionsModule.swift`）。
//
// **出せない端末では何も描かない。** iOS 17.2 未満、Android、Web、
// それに権利の無い古いビルドが該当する。
// できないことをボタンにして置くと、押した人が自分の操作を疑う。
//
// ボタンの見た目は OS が描く。Lantern 側で色や形を作らない。
// システムのピッカーを開くものだと分かる方が、押す前の予想が合う。
export default function SuggestionButton({ onSelect }) {
  if (!isSuggestionsAvailable() || !SuggestionsPickerView) return null

  return (
    <View className="h-touch justify-center">
      <SuggestionsPickerView
        title="今日の出来事から選ぶ"
        onSelect={(e) => {
          const title = e?.nativeEvent?.title
          if (title) onSelect(title)
        }}
        style={{ height: 44 }}
      />
    </View>
  )
}
