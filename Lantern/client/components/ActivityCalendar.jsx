import { useState } from 'react'
import { Pressable, View } from 'react-native'
import Text from './Text'
import { todayStr } from '../lib/date'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

// Web版 frontend/src/components/ActivityCalendar.jsx を移植したもの。
// 2状態（記録あり=amber / 記録なし=neutral）という仕様は変更していない。
// RNには ring ユーティリティがないため border に置き換えている。
function cellStyle({ isFuture, isToday, hasLog, isSelected }) {
  // **24px では小さかった**（2026-08-14）。36px にした。
  // 押せる最小は 44px（HIG）だが、外側の `py-1` と合わせて満たす
  const base = 'w-9 h-9 rounded items-center justify-center border '
  if (isFuture) return base + 'border-transparent'
  if (isToday && hasLog) {
    return base + (isSelected ? 'bg-amber/20 border-amber/70' : 'bg-amber-light border-amber/40')
  }
  if (isToday) {
    return base + (isSelected ? 'bg-accent/10 border-accent/60' : 'border-accent/50')
  }
  if (hasLog) {
    return base + (isSelected ? 'bg-amber/20 border-amber/50' : 'bg-amber-light border-amber/30')
  }
  return base + (isSelected ? 'bg-stone border-border' : 'border-transparent')
}

function cellTextStyle({ isFuture, isToday, hasLog, isSelected }) {
  const base = 'text-label-sm '
  if (isFuture) return base + 'text-ink-faint/30'
  if (isToday || hasLog) return base + 'font-strong ' + (isToday && !hasLog ? 'text-accent' : 'text-amber')
  return base + (isSelected ? 'text-ink' : 'text-ink-faint/60')
}

export default function ActivityCalendar({ logs, selectedDate, onDateSelect }) {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const logSet = new Set(logs.map((l) => l.date))
  const today = todayStr()
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth()

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
    else setViewMonth((m) => m - 1)
  }
  function nextMonth() {
    if (isCurrentMonth) return
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
    else setViewMonth((m) => m + 1)
  }
  // **今月へ戻すだけ。日付は選ばない**（2026-08-14）。
  // 選んでいたので、今日の記録がまだ無いと記録モーダルが開いていた。
  // 「今月を見たい」と「今日を書きたい」は別の意図。
  function goToday() {
    setViewYear(now.getFullYear())
    setViewMonth(now.getMonth())
  }

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({
      d,
      dateStr,
      hasLog: logSet.has(dateStr),
      isToday: dateStr === today,
      isFuture: dateStr > today,
    })
  }

  return (
    <View>
      <View className="flex-row items-center justify-center gap-2 mb-2">
        <Pressable onPress={prevMonth} className="p-1" accessibilityLabel="前月">
          <Text className="text-ink-faint text-aux">‹</Text>
        </Pressable>
        <Text className="font-strong text-body-md text-on-surface w-28 text-center">
          {viewYear}年{viewMonth + 1}月
        </Text>
        <Pressable
          onPress={nextMonth}
          disabled={isCurrentMonth}
          className="p-1 disabled:opacity-25"
          accessibilityLabel="翌月"
        >
          <Text className="text-ink-faint text-aux">›</Text>
        </Pressable>
        {/* **「今日」と書く**（2026-08-23）。押すと `goToday` が走り、
            今月を出したうえで**今日を選ぶ。**「今月」だと、
            月が変わるだけに見えて、選んだ日が動くことが伝わらない */}
        <Pressable
          onPress={goToday}
          accessibilityLabel="今日に戻る"
          className="border border-border rounded-full px-2.5 py-1"
        >
          <Text className="text-label-sm text-on-surface-variant">今日</Text>
        </Pressable>
      </View>

      <View className="flex-row mb-1">
        {WEEKDAYS.map((w) => (
          <View key={w} className="flex-1 items-center">
            <Text className="text-label-sm text-outline">{w}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {cells.map((cell, i) => {
          if (!cell) {
            return <View key={`empty-${i}`} className="w-[14.28%] items-center py-1" />
          }
          const state = { ...cell, isSelected: selectedDate === cell.dateStr }
          return (
            <View key={cell.dateStr} className="w-[14.28%] items-center py-1">
              <Pressable
                onPress={() => !cell.isFuture && onDateSelect(cell.dateStr)}
                disabled={cell.isFuture}
                className={cellStyle(state)}
              >
                <Text className={cellTextStyle(state)}>{cell.d}</Text>
              </Pressable>
            </View>
          )
        })}
      </View>
    </View>
  )
}
