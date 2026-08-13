import { View } from 'react-native'
import Text from './Text'
import { parseBlocks } from '../lib/markdown'

// 記録の本文を、装飾つきで出す。
//
// **出せるのは3つだけ。** 太字・斜体・箇条書き。
// 見出しも表もリンクも扱わない。書けないものは出せなくてよい。
//
// 太さは `font-strong`（Noto Sans JP Bold）に差し替える。
// **`font-bold` を使わない。** 1ウェイトしか読んでいないので、
// `fontWeight` を重ねると Android で端末の既定に落ちる
// （CLAUDE.md「デザインシステム」）。
//
// 解釈は `lib/markdown.js`。描画から離して vitest で検査している。
export default function RichText({ text, className = 'text-body-lg text-on-surface' }) {
  const blocks = parseBlocks(text)

  return (
    <View>
      {blocks.map((block, i) => (
        <View key={i} className={block.bullet ? 'flex-row' : undefined}>
          {block.bullet ? (
            <Text className={`${className} mr-2`}>・</Text>
          ) : null}
          <Text className={`${className} ${block.bullet ? 'flex-1' : ''}`}>
            {block.spans.map((span, j) => (
              <Text
                key={j}
                className={span.bold ? 'font-strong' : undefined}
                style={span.italic ? { fontStyle: 'italic' } : undefined}
              >
                {span.text}
              </Text>
            ))}
            {/* 空行も高さを持たせる。詰めると、書いた人が空けた間が消える */}
            {block.spans.length === 0 ? ' ' : null}
          </Text>
        </View>
      ))}
    </View>
  )
}
