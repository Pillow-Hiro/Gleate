import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
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
        <View className="flex-1 flex-row items-baseline">
          <Text className="text-xs text-ink-faint mr-2.5">{dayLabel(log.date)}</Text>
          <Text className="text-sm text-ink flex-1">{truncateTitle(summary)}</Text>
        </View>
        <Text className="text-ink-faint text-xs">{open ? '⌃' : '⌄'}</Text>
      </Pressable>

      {open ? <LogDetail log={log} onDelete={onDelete} onUpdate={onUpdate} /> : null}
    </View>
  )
}
