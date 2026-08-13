import { useState } from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import Text from './Text'
import { NOTIFY_HOURS, hourLabel } from '../lib/notifyText'

// 通知の時刻を選ぶ。
//
// **2026-08-14 に作り直した。**
// それまでは 8/12/18/21/23 の5つを横に並べていた。
// 選択肢が丸く並ぶので**ラジオボタンに見え**、しかも
// 自分の時間に合う時刻が無い人がいた。
//
// いまは押すと開き、**24時間から選ぶ。**
// 一覧を縦に24行並べると探すのが遠いので、4列の格子にした。
// 朝・昼・夜が段で分かれて見える。
export default function HourPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)

  function pick(h) {
    onChange(h)
    setOpen(false)
  }

  return (
    <View>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityLabel="知らせる時刻を選ぶ"
        className="flex-row items-center gap-1.5 min-h-touch justify-center active:opacity-70"
      >
        <Text className="font-strong text-body-md text-primary">{hourLabel(value)}</Text>
        <Text className="text-label-md text-outline">⌄</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setOpen(false)}>
          <Pressable className="bg-surface rounded-t-2xl px-5 pt-5 pb-8" onPress={() => {}}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="font-strong text-body-md text-on-surface">知らせる時刻</Text>
              <Pressable
                onPress={() => setOpen(false)}
                accessibilityLabel="閉じる"
                className="min-h-touch px-2 justify-center"
              >
                <Text className="text-outline text-body-md">✕</Text>
              </Pressable>
            </View>

            <ScrollView className="max-h-96">
              <View className="flex-row flex-wrap gap-2">
                {NOTIFY_HOURS.map((h) => {
                  const selected = h === value
                  return (
                    <Pressable
                      key={h}
                      onPress={() => pick(h)}
                      accessibilityLabel={hourLabel(h)}
                      className={`w-[23%] min-h-touch rounded justify-center items-center ${
                        selected ? 'bg-lantern-glow' : 'bg-surface-low'
                      }`}
                    >
                      <Text
                        className={`text-body-md ${
                          selected ? 'font-strong text-on-lantern' : 'text-on-surface'
                        }`}
                      >
                        {hourLabel(h)}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
