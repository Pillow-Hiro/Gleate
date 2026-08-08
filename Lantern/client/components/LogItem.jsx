import { useState } from 'react'
import { Image, Pressable, View } from 'react-native'
import Text from './Text'
import LogDetail from './LogDetail'
import { dayLabel, truncateTitle } from '../lib/format'

// Web版 Journal.jsx の LogItem を移植したもの。
// CSS gridによる開閉アニメーションはRNに相当機能がないため出し分けに置き換えた。
export default function LogItem({ log, onDelete, onUpdate }) {
  const [open, setOpen] = useState(false)
  const summary = log.created || log.enjoyable || log.struggled || log.next || '（記録あり）'

  return (
    <View className="border-b border-border">
      <Pressable
        onPress={() => setOpen((o) => !o)}
        className="py-3.5 flex-row items-center justify-between gap-3"
      >
        <View className="flex-1 flex-row items-center">
          <Text className="text-aux text-ink-faint mr-2.5">{dayLabel(log.date)}</Text>
          {/* 写真だけの記録は summary が「（記録あり）」になる。
              サムネイルがあれば、何を残した日かが一覧のまま分かる。 */}
          {log.photo_thumb_url ? (
            <Image
              source={{ uri: log.photo_thumb_url }}
              className="rounded mr-2"
              style={{ width: 32, height: 32 }}
              resizeMode="cover"
            />
          ) : null}
          <Text className="text-body text-ink flex-1">{truncateTitle(summary)}</Text>
        </View>
        <Text className="text-ink-faint text-aux">{open ? '⌃' : '⌄'}</Text>
      </Pressable>

      {open ? <LogDetail log={log} onDelete={onDelete} onUpdate={onUpdate} /> : null}
    </View>
  )
}
