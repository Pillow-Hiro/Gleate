import { forwardRef, useEffect, useRef, useState } from 'react'
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
// ## 打っているあいだは断片を組み直さない
//
// **日本語の未確定文字（変換前）に波線が出なくなっていた**（2026-08-15・実機）。
//
// 断片を入れ替えると、iOS はそのたびに欄の中の文字を置き直す。
// **未確定という状態はそこで失われる。** 波線は OS が描くものなので、
// 状態が消えれば線も消える。
//
// だから**打っているあいだは素の文字のまま**にして、
// 手が止まってから断片に組み直す。変換中は OS に任せ、
// 確定して一息ついたところで太字が現れる。
//
// 保存の形は Markdown のまま。**画面の見せ方を変えただけ**で、
// 記録の中身も、AI に渡す前に記法を剥がす経路（`modules/markdown.py`）も
// 変えていない。
const MARKER_OPACITY = 0.35

// 手が止まったと見なすまで。短いと変換の途中で組み直してしまう
const SETTLE_MS = 450

const RichEditor = forwardRef(function RichEditor(
  { value, onChange, placeholder, minHeight, ...props },
  ref
) {
  // 打っている最中かどうか
  const [typing, setTyping] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  function handleChange(next) {
    onChange(next)
    setTyping(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setTyping(false), SETTLE_MS)
  }

  const spans = typing ? null : parseWithMarkers(value)

  return (
    <TextInput
      ref={ref}
      // 打っているあいだは素の文字。**OS に触らせたままにする**
      value={typing ? value : undefined}
      onChangeText={handleChange}
      multiline
      scrollEnabled={false}
      textAlignVertical="top"
      style={{ minHeight }}
      className="font-body text-body-lg text-on-surface"
      placeholder={placeholder}
      placeholderTextColor="#8E8478"
      {...props}
    >
      {/* 断片が無いとき（空のとき・打っている最中）は何も入れない。
          空文字の `Text` を入れると placeholder が出なくなる */}
      {!spans || spans.length === 0
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
