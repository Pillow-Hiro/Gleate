import { useState } from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import Text from './Text'

// 月を選ぶ。
//
// **一覧が全部の月を縦に並べていた**（2026-08-14 に作者が指摘）。
// 記録が増えるほど、探すための画面が「延々と続くもの」になっていく。
//
// 押すと選べる形にした。**記録がある月だけを出す。**
// 無い月を並べても押す理由がなく、空白の月を数えさせることにもなる。
// 年のチップと同じ考え方。
//
// 件数は出さない。「6月分（3件）」と書くと月ごとの多寡が並び、
// 記録の量を比べる表になる。
export function monthsOf(logs) {
  return [...new Set(logs.map((l) => l.date.slice(0, 7)))].sort().reverse()
}

export function monthLabel(month) {
  const [y, m] = month.split('-')
  return `${y}年${Number(m)}月`
}

export default function MonthPicker({ months, value, onChange }) {
  const [open, setOpen] = useState(false)
  if (months.length <= 1) return null

  const label = value === 'all' ? 'すべての月' : monthLabel(value)

  function pick(next) {
    onChange(next)
    setOpen(false)
  }

  return (
    <View>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center gap-1.5 self-start min-h-touch justify-center active:opacity-70"
        accessibilityLabel="月を選ぶ"
      >
        <Text className="font-strong text-body-md text-on-surface">{label}</Text>
        <Text className="text-label-md text-outline">⌄</Text>
      </Pressable>

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setOpen(false)}>
          <Pressable className="bg-surface rounded-t-2xl px-5 pt-5 pb-8" onPress={() => {}}>
            <Text className="font-strong text-label-md text-on-surface-variant mb-2.5">月を選ぶ</Text>
            <ScrollView className="max-h-80">
              <View className="bg-surface-low rounded-lg px-4">
                {[{ id: 'all', label: 'すべての月' }, ...months.map((m) => ({ id: m, label: monthLabel(m) }))].map(
                  (item, i, arr) => (
                    <Pressable
                      key={item.id}
                      onPress={() => pick(item.id)}
                      className={`flex-row items-center justify-between py-3.5 min-h-touch ${
                        i === arr.length - 1 ? '' : 'border-b border-border'
                      }`}
                    >
                      <Text
                        className={`text-body-md ${
                          value === item.id ? 'font-strong text-primary' : 'text-on-surface'
                        }`}
                      >
                        {item.label}
                      </Text>
                      {value === item.id ? <Text className="text-primary text-body-md">✓</Text> : null}
                    </Pressable>
                  )
                )}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
