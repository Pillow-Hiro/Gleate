import { forwardRef } from 'react'
import { TextInput } from 'react-native'
import Text from './Text'
import { parseWithMarkers } from '../lib/markdown'

// Lantern の文章欄。**書いている最中に装飾が見える。**
//
// 2026-08-15 まで、入力欄は素の `TextInput` だった。
// 太字にすると `**強い**` と記号が出るだけで、**効いているのか分からない。**
// 一度は「離れたら装飾つきで描く」形にしたが、
// 書いている最中は結局ただの記号だった。
//
// ## どうやっているか
//
// `TextInput` は**中に `Text` を入れられる。** 入れた `Text` の書式が
// そのまま入力欄の中で効く。そこへ `parseWithMarkers` の断片を並べる。
//
// **記号は消さない。薄くする。**
// 消すと入力欄の中身と画面の文字がずれ、打つたびにカーソルが飛ぶ。
// `parseWithMarkers` は「つなぎ直すと元の文字列に戻る」ことを
// vitest で固定してある。ここが崩れると入力そのものが壊れる。
//
// ## 外部の部品を入れなかった
//
// WebView に載せる editor（`react-native-pell-rich-editor` など）なら
// 記号を完全に隠せるが、`react-native-webview` はネイティブを持つ。
// **入れると指紋が変わり、配信済みのビルドへ OTA が届かなくなる。**
// 記号が薄く残るのは、その引き換えとして受け入れている。
//
// 保存の形は Markdown のまま。**画面の見せ方を変えただけ**で、
// 記録の中身も、AI に渡す前に記法を剥がす経路（`modules/markdown.py`）も
// 変えていない。
const MARKER_OPACITY = 0.35

const RichEditor = forwardRef(function RichEditor(
  { value, onChange, placeholder, minHeight, ...props },
  ref
) {
  const spans = parseWithMarkers(value)

  return (
    <TextInput
      ref={ref}
      onChangeText={onChange}
      multiline
      scrollEnabled={false}
      textAlignVertical="top"
      style={{ minHeight }}
      className="font-body text-body-lg text-on-surface"
      placeholder={placeholder}
      placeholderTextColor="#8E8478"
      {...props}
    >
      {/* 断片が無いとき（空のとき）は何も入れない。
          空文字の `Text` を入れると placeholder が出なくなる */}
      {spans.length === 0
        ? null
        : spans.map((s, i) => (
            <Text
              key={i}
              className={s.bold ? 'font-strong' : undefined}
              style={[
                s.italic ? { fontStyle: 'italic' } : null,
                s.marker ? { opacity: MARKER_OPACITY } : null,
              ]}
            >
              {s.text}
            </Text>
          ))}
    </TextInput>
  )
})

export default RichEditor
