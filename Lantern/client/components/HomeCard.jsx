import { useState } from 'react'
import { Image, Pressable, View } from 'react-native'
import Text from './Text'
import RichText from './RichText'
import PhotoLightbox from './PhotoLightbox'
import { relativeDayLabel } from '../lib/format'
import { Breathe } from './Motion'

// ホームに並べる1枚。
//
// **結果だけを見せる**（2026-08-14・作者の指摘）。
// 出すのは3つ。**日付・やったこと・Lanternの言葉**。写真があれば添える。
//
// よかったこと・困ったこと・次にやることは出さない。
// 眺める場所に4項目を並べると、記録を**読み返す**のではなく
// **点検する**画面になる。詳しく見たい日は「記録」で開く。
//
// **折りたたまない。** 一覧の1行（`LogItem`）は探すための形で、
// 押して開く。ここは眺める場所なので、開く手数を挟まず全部見せる。
// そのぶん枚数を絞る（ホームは3件）。
//
// 本文は装飾つきで出す（`RichText`）。抜粋ではないので記法を外さない。
// `label` は日付の代わりに出す字（**「書く」タブでは時刻**）。
// 同じ日が並ぶので「今日」を3枚重ねても見分けがつかない。
//
// `lighting` は**灯りを待っている最中**（`lib/lightBuffer.js`）。
// まだ `ai_response` が無いので、代わりに息をする字を置く。
//
// `footer` は**このカードに効くもの**を入れる口（2026-09-04）。
// 「書く」タブでは手がかりの入口が入る。カードの外に置くと、
// **どの記録を相手にしているのかが画面から分からない。**
// ホームからは渡さない（眺める場所に操作を置かない）。
export default function HomeCard({ log, label, lighting, note, footer }) {
  const [lightbox, setLightbox] = useState(false)
  const body = log.created || ''
  const photo = log.photo_url || log.photo_thumb_url

  // 何も無い日は置かない。写真だけの日はある
  if (!body && !photo && !log.ai_response) return null

  return (
    <View className="bg-surface-lowest rounded-lg px-5 py-5 gap-4 shadow-bloom">
      <View className="flex-row items-center justify-between">
        <Text className="font-label text-label-md text-outline">
          {label || relativeDayLabel(log.date)}
        </Text>
        {log.favorite ? <Text className="text-lantern-glow">★</Text> : null}
      </View>

      {body ? <RichText text={body} className="text-body-lg text-on-surface" /> : null}

      {photo ? (
        <Pressable onPress={() => setLightbox(true)} accessibilityLabel="写真を開く">
          <Image
            source={{ uri: photo }}
            style={{ width: '100%', height: 200 }}
            className="rounded"
            resizeMode="cover"
          />
        </Pressable>
      ) : null}

      {/* Lanternの言葉。**AIの声のトークンで出す。**
          「LANTERN」の英字キッカーは置かない（CLAUDE.md「やらないこと」）。 */}
      {log.ai_response ? (
        <View className="bg-ai-surface rounded-lg px-4 py-3.5">
          <Text className="text-body-md text-ai-ink leading-relaxed">{log.ai_response}</Text>
        </View>
      ) : note ? (
        // **来ない理由を出す**（2026-09-04）。灯りは十数秒かかるので、
        // 何も出さないと**来ないのか遅いのかが分からない**
        <View className="bg-ai-surface rounded-lg px-4 py-3.5">
          <Text className="text-label-md text-on-surface-variant leading-relaxed">{note}</Text>
        </View>
      ) : lighting ? (
        // **記録はもう残っている。**待っているのは灯りだけなので、
        // 「保存中」とは書かない。書いた人を不安にさせない。
        //
        // 息をさせる（2026-09-04・作者の指示）。十数秒かかるので、
        // **止まった字は壊れた字と見分けがつかない**（`Motion.jsx`）
        <View className="bg-ai-surface rounded-lg px-4 py-3.5">
          <Breathe>
            <Text className="text-label-md text-on-surface-variant">灯りをともしています。</Text>
          </Breathe>
        </View>
      ) : null}

      {footer}

      {lightbox && photo ? (
        <PhotoLightbox src={photo} onClose={() => setLightbox(false)} />
      ) : null}
    </View>
  )
}
