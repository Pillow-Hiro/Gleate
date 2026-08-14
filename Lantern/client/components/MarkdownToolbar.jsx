import { Pressable, View } from 'react-native'
import Text from './Text'
import { toggleBullet, wrapSelection } from '../lib/markdown'

// 「やったこと」の装飾ボタン。**3つだけ。**
//
// 太字・斜体・箇条書き。画像も添付も入れない
// （置き場所がサーバーになり、写真を端末内へ移した判断と衝突する）。
//
// **文字数を出さない。** デザイン案には「0 words」があるが、
// 書きながら量を数えさせない（`REQUIREMENTS.md`「やらないこと」）。
//
// **残り3項目（よかった・困った・次）には付けない。**
// 短いメモに道具立てを出すのは重すぎる。
//
// `extra` に写真の入口が入る（2026-08-14・デザイン案 `3_write`）。
// 案には**クリップ（任意のファイル添付）**もあるが付けていない。
// 扱えるのは写真だけで、置き場所は端末の中と決めてある。
// 押せるのに何も起きないボタンは、無い方がよい。
const ACTIONS = [
  { id: 'bold', label: 'B', mark: '**', strong: true },
  { id: 'italic', label: 'I', mark: '*', italic: true },
  { id: 'bullet', label: '•' },
]

export default function MarkdownToolbar({ value, selection, onChange, extra }) {
  function apply(action) {
    const start = selection?.start ?? value.length
    const end = selection?.end ?? start
    const next =
      action.id === 'bullet'
        ? toggleBullet(value, start, end)
        : wrapSelection(value, start, end, action.mark)
    onChange(next.text, next.cursor)
  }

  return (
    <View className="flex-row gap-1">
      {ACTIONS.map((a) => (
        <Pressable
          key={a.id}
          onPress={() => apply(a)}
          accessibilityLabel={
            { bold: '太字', italic: '斜体', bullet: '箇条書き' }[a.id]
          }
          className="min-w-touch min-h-touch items-center justify-center rounded active:bg-surface-low"
        >
          <Text
            className={`text-body-md text-on-surface-variant ${a.strong ? 'font-strong' : ''}`}
            style={a.italic ? { fontStyle: 'italic' } : undefined}
          >
            {a.label}
          </Text>
        </Pressable>
      ))}
      {extra ? (
        <>
          <View className="w-[1px] h-5 bg-border mx-1 self-center" />
          {extra}
        </>
      ) : null}
    </View>
  )
}
