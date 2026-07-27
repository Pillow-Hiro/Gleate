import { useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { authFetch } from '../../lib/supabase'
import { dateDisplayJa, groupByMonth, monthLabel } from '../../lib/format'
import ActivityCalendar from '../../components/ActivityCalendar'
import LogDetail from '../../components/LogDetail'
import LogItem from '../../components/LogItem'
import ReviewSection from '../../components/ReviewSection'
import TimelineSection from '../../components/TimelineSection'

const MODAL_FIELDS = [
  { field: 'created', label: 'やったこと', placeholder: '今日やったこと', minHeight: 84 },
  { field: 'enjoyable', label: 'よかったこと', placeholder: 'よかったこと（任意）', minHeight: 60 },
  { field: 'struggled', label: '困ったこと', placeholder: '詰まったこと（任意）', minHeight: 60 },
  { field: 'next', label: '次にやること', placeholder: '（任意）', minHeight: 60 },
]

const EMPTY_FORM = { created: '', enjoyable: '', struggled: '', next: '' }

export default function Journal() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState(null)
  const [activeTab, setActiveTab] = useState('record')
  const [modalDate, setModalDate] = useState(null)
  const [modalForm, setModalForm] = useState(EMPTY_FORM)
  const [modalSaving, setModalSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await authFetch('/api/logs')
        const data = await res.json()
        if (!cancelled) setLogs(data)
      } catch {
        // 取得失敗時は空一覧のままにする
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  function handleDelete(date) {
    setLogs((prev) => prev.filter((l) => l.date !== date))
    if (selectedDate === date) setSelectedDate(null)
  }

  function handleUpdate(updatedLog) {
    setLogs((prev) => prev.map((l) => (l.date === updatedLog.date ? updatedLog : l)))
  }

  function handleDateClick(date) {
    const existingLog = logs.find((l) => l.date === date)
    if (existingLog) {
      setSelectedDate(date)
    } else {
      setSelectedDate(null)
      setModalDate(date)
      setModalForm(EMPTY_FORM)
    }
  }

  async function handleModalSave() {
    if (!modalForm.created.trim()) return
    setModalSaving(true)
    try {
      const res = await authFetch('/save', {
        method: 'POST',
        body: JSON.stringify({ date: modalDate, ...modalForm }),
      })
      if (!res.ok) throw new Error('save failed')
      const data = await res.json()
      const newLog = { date: modalDate, ...modalForm, ai_response: data.ai_response }
      setLogs((prev) => [...prev, newLog])
      setSelectedDate(modalDate)
      setModalDate(null)
    } catch {
      // エラー時はモーダルを維持
    } finally {
      setModalSaving(false)
    }
  }

  const now = new Date()
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const thisMonthCount = logs.filter((l) => l.date >= thisMonthStart).length
  const selectedLog = selectedDate ? logs.find((l) => l.date === selectedDate) || null : null

  const q = search.trim().toLowerCase()
  const filtered = q
    ? logs.filter((l) =>
        [l.created, l.enjoyable, l.struggled, l.next].some((v) => v?.toLowerCase().includes(q))
      )
    : logs

  const groups = groupByMonth(filtered)
  const monthKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a))

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pt-6 pb-10 gap-6" keyboardShouldPersistTaps="handled">
        {/* ヘッダー */}
        <View>
          <Text className="text-[10px] text-ink-faint tracking-[2px] mb-0.5">JOURNAL</Text>
          <Text className="font-display text-xl font-light text-ink">記録</Text>
          {!loading && logs.length > 0 ? (
            <Text className="text-sm text-ink-soft mt-1">{logs.length}日間の記録</Text>
          ) : null}
        </View>

        {/* タブ */}
        <View className="flex-row gap-4 border-b border-border">
          {[
            { id: 'record', label: '記録' },
            { id: 'review', label: '振り返り' },
          ].map(({ id, label }) => (
            <Pressable
              key={id}
              onPress={() => setActiveTab(id)}
              className={`px-1 pb-2.5 border-b-2 ${activeTab === id ? 'border-accent' : 'border-transparent'}`}
            >
              <Text className={`text-sm ${activeTab === id ? 'text-accent' : 'text-ink-faint'}`}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 'record' ? (
          <View className="gap-8">
            {/* カレンダー */}
            <View>
              {thisMonthCount > 0 ? (
                <View className="flex-row justify-end mb-3">
                  <View className="bg-amber-light border border-amber/20 rounded-full px-2.5 py-0.5">
                    <Text className="text-xs text-amber">今月の灯り {thisMonthCount}日</Text>
                  </View>
                </View>
              ) : null}

              <View className="bg-stone/50 rounded-xl p-4">
                <ActivityCalendar
                  logs={logs}
                  selectedDate={selectedDate || ''}
                  onDateSelect={handleDateClick}
                />
                {!loading && logs.length === 0 ? (
                  <Text className="text-[11px] text-ink-faint text-center mt-3">
                    日付をタップして記録を始めましょう
                  </Text>
                ) : null}
              </View>

              {selectedDate && selectedLog ? (
                <View className="mt-3 bg-stone/40 rounded-xl px-5 py-4">
                  <Text className="text-xs text-ink-faint mb-2">{dateDisplayJa(selectedDate)}</Text>
                  <LogDetail log={selectedLog} onDelete={handleDelete} onUpdate={handleUpdate} />
                </View>
              ) : null}

              {selectedDate && !selectedLog ? (
                <Text className="text-xs text-ink-faint text-center mt-3">この日の記録はありません</Text>
              ) : null}
            </View>

            {/* 検索 */}
            <View className="flex-row items-center bg-stone border border-border rounded-lg px-3">
              <Text className="text-ink-faint text-xs mr-2">⌕</Text>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="記録を検索"
                placeholderTextColor="#999999"
                className="flex-1 py-2.5 text-sm text-ink"
              />
              {search ? (
                <Pressable onPress={() => setSearch('')} className="pl-2">
                  <Text className="text-ink-faint text-xs">✕</Text>
                </Pressable>
              ) : null}
            </View>

            {/* ログ一覧 */}
            {loading ? (
              <View className="gap-3">
                {[1, 2, 3].map((i) => (
                  <View key={i} className="h-12 bg-stone rounded-lg" />
                ))}
              </View>
            ) : logs.length === 0 ? (
              <View className="items-center py-16">
                <Text className="text-3xl mb-4 opacity-40 text-ink">◇</Text>
                <Text className="text-sm text-ink-soft">まだ記録がありません</Text>
                <Text className="text-xs text-ink-faint mt-1.5">今日のタブから記録を始めましょう</Text>
              </View>
            ) : monthKeys.length === 0 ? (
              <View className="items-center py-12">
                <Text className="text-sm text-ink-faint">
                  「{search.trim()}」の記録は見つかりませんでした
                </Text>
              </View>
            ) : (
              <View className="gap-8">
                {monthKeys.map((month) => (
                  <View key={month}>
                    <View className="flex-row items-center gap-2.5 mb-3">
                      <Text className="text-xs text-ink-soft font-medium">
                        {monthLabel(groups[month][0].date)}
                      </Text>
                      <Text className="text-[10px] text-ink-faint">{groups[month].length}日</Text>
                    </View>
                    <View className="bg-stone/40 rounded-xl px-4">
                      {groups[month].map((log) => (
                        <LogItem
                          key={log.date}
                          log={log}
                          onDelete={handleDelete}
                          onUpdate={handleUpdate}
                        />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View className="gap-8">
            <ReviewSection title="今週の振り返り" type="weekly" description="過去7日間の活動から" />
            <ReviewSection title="今月の振り返り" type="monthly" description="今月の活動から" />
            <TimelineSection />
          </View>
        )}
      </ScrollView>

      {/* 記録モーダル */}
      <Modal
        visible={modalDate !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setModalDate(null)}
      >
        <Pressable className="flex-1 bg-black/50 justify-end" onPress={() => setModalDate(null)}>
          <Pressable className="bg-cream rounded-t-2xl px-5 pt-5 pb-8" onPress={() => {}}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xs text-ink-faint">
                {modalDate ? dateDisplayJa(modalDate) : ''}
              </Text>
              <Pressable onPress={() => setModalDate(null)} accessibilityLabel="閉じる" className="p-1">
                <Text className="text-ink-faint text-xs">✕</Text>
              </Pressable>
            </View>

            <ScrollView className="max-h-96" keyboardShouldPersistTaps="handled">
              <View className="gap-3">
                {MODAL_FIELDS.map(({ field, label, placeholder, minHeight }) => (
                  <View key={field}>
                    <Text className="text-[10px] text-ink-faint mb-1">{label}</Text>
                    <TextInput
                      value={modalForm[field]}
                      onChangeText={(v) => setModalForm((f) => ({ ...f, [field]: v }))}
                      placeholder={placeholder}
                      placeholderTextColor="#999999"
                      multiline
                      textAlignVertical="top"
                      style={{ minHeight }}
                      className="bg-stone border border-border rounded-lg px-3 py-2.5 text-sm text-ink"
                    />
                  </View>
                ))}
              </View>
            </ScrollView>

            <View className="flex-row items-center justify-end gap-4 pt-4">
              <Pressable onPress={() => setModalDate(null)}>
                <Text className="text-xs text-ink-faint">キャンセル</Text>
              </Pressable>
              <Pressable
                onPress={handleModalSave}
                disabled={modalSaving || !modalForm.created.trim()}
                className="border border-sage/40 rounded-full px-3.5 py-1.5 disabled:opacity-50"
              >
                <Text className="text-xs text-forest">{modalSaving ? '保存中...' : '記録する'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}
