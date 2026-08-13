import { useEffect, useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native'
import Text from '../../components/Text'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BOTTOM_GAP, useTabBarInset } from '../../lib/tabBar'
import { authFetch } from '../../lib/supabase'
import { attach as attachPhotos } from '../../lib/photoStore'
import { dateDisplayJa } from '../../lib/format'
import ActivityCalendar from '../../components/ActivityCalendar'
import LogDetail from '../../components/LogDetail'
import LogList from '../../components/LogList'
import ReviewSection from '../../components/ReviewSection'
import TimelineSection from '../../components/TimelineSection'
import KeywordSection from '../../components/KeywordSection'
import RecordForm from '../../components/RecordForm'
import MonthPicker, { monthsOf } from '../../components/MonthPicker'

export default function Journal() {
  // すりガラスのタブバーは内容の上に浮くので、その分だけ下を空ける
  const tabInset = useTabBarInset()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState(null)
  // 絞り込み。'all' / 'favorite' / '2026' のような年
  const [filter, setFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('record')
  const [modalDate, setModalDate] = useState(null)
  // 一覧を月で区切る。'all' か '2026-06' のような月
  const [month, setMonth] = useState('all')

  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await authFetch('/api/logs')
        const data = await res.json()
        // 写真は端末にしか無いので、サーバーの記録に合流させる。
        // 写真しかない日もここで1件として現れる（lib/photoStore.js）
        if (!cancelled) setLogs(attachPhotos(data))
      } catch (e) {
        // 取得失敗時は空一覧のままにする
        console.warn('[Journal] 記録の取得に失敗', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [tick])

  // チップや検索を変えたら月は「すべて」に戻す。
  // 前の絞り込みが残っていると、記録があるのに0件に見える
  useEffect(() => { setMonth('all') }, [filter, search])

  function handleDelete(date) {
    setLogs((prev) => prev.filter((l) => l.date !== date))
    if (selectedDate === date) setSelectedDate(null)
  }

  function handleUpdate(updatedLog) {
    setLogs((prev) => prev.map((l) => (l.date === updatedLog.date ? updatedLog : l)))
  }

  // お気に入りの付け外し。
  //
  // **画面を先に変える。** 通信を待たせると、押しても何も起きない
  // 数百ミリ秒ができる。失敗したら元に戻す。
  async function handleToggleFavorite(log) {
    const next = !log.favorite
    setLogs((prev) => prev.map((l) => (l.date === log.date ? { ...l, favorite: next } : l)))
    try {
      const res = await authFetch(`/api/logs/${log.date}/favorite`, {
        method: 'PUT',
        body: JSON.stringify({ favorite: next }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (e) {
      console.warn('[記録] お気に入りの変更に失敗', e)
      setLogs((prev) => prev.map((l) => (l.date === log.date ? { ...l, favorite: !next } : l)))
    }
  }

  function handleDateClick(date) {
    const existingLog = logs.find((l) => l.date === date)
    if (existingLog) {
      setSelectedDate(date)
    } else {
      setSelectedDate(null)
      setModalDate(date)
    }
  }

  function closeModal() {
    setModalDate(null)
  }

  const selectedLog = selectedDate ? logs.find((l) => l.date === selectedDate) || null : null

  const q = search.trim().toLowerCase()
  const searched = q
    ? logs.filter((l) =>
        [l.created, l.enjoyable, l.struggled, l.next].some((v) => v?.toLowerCase().includes(q))
      )
    : logs

  // チップ。**「すべて」と「お気に入り」以外は、記録がある年だけ出す。**
  // 記録の無い年を並べても押す理由がない。
  const years = [...new Set(logs.map((l) => l.date.slice(0, 4)))].sort().reverse()
  const chips = [
    { id: 'all', label: 'すべて' },
    ...years.map((y) => ({ id: y, label: `${y}年` })),
    { id: 'favorite', label: 'お気に入り' },
  ]

  const byChip =
    filter === 'all'
      ? searched
      : filter === 'favorite'
        ? searched.filter((l) => l.favorite)
        : searched.filter((l) => l.date.startsWith(filter))

  // 月の選択肢は**チップで絞ったあとの記録**から作る。
  // 2025年を選んでいるのに 2026年の月が並ぶと、押しても0件になる。
  const months = useMemo(() => monthsOf(byChip), [byChip])
  const filtered = month === 'all' ? byChip : byChip.filter((l) => l.date.startsWith(month))

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pt-6 gap-6 w-full max-w-read self-center" contentContainerStyle={{ paddingBottom: tabInset + BOTTOM_GAP }} keyboardShouldPersistTaps="handled">
        {/* ヘッダー */}
        <View>
          <Text className="font-display text-headline-md text-ink">記録</Text>
          {!loading && logs.length > 0 ? (
            <Text className="text-body text-ink-soft mt-1">{logs.length}日間の記録</Text>
          ) : null}
        </View>

        {/* タブ。
            2026-07-30 に振り返りをここへ統合した。
            2026-08-12 に一度「ダッシュボード」へ出したが、
            **作者の判断で戻した。** 記録と振り返りは同じ材料を見るもので、
            並べて置く方が行き来しやすい。
            アイデアは 2026-08-08 に「書く」へ移した。 */}
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
              <Text className={`text-body ${activeTab === id ? 'text-accent' : 'text-ink-faint'}`}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 'record' ? (
        <View className="gap-8">
            {/* 検索。**上に置く。** デザイン案が
                「検索や月別フィルタを上部に配置」としている。
                探しに来た人が最初に触るものが最初にある。 */}
            <View className="gap-3">
              <View className="flex-row items-center bg-surface-low rounded px-3">
                <Text className="text-outline text-label-md mr-2">⌕</Text>
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="記録を検索"
                  placeholderTextColor="#8E8478"
                  className="flex-1 py-3 font-body text-body-md text-ink"
                />
                {search ? (
                  <Pressable onPress={() => setSearch('')} hitSlop={12} className="pl-2">
                    <Text className="text-outline text-label-md">✕</Text>
                  </Pressable>
                ) : null}
              </View>

              {/* 絞り込みのチップ。DESIGN.md「Chips/Tags は low-impact」 */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {chips.map(({ id, label }) => (
                    <Pressable
                      key={id}
                      onPress={() => setFilter(id)}
                      className={`rounded-full px-3.5 py-1.5 ${
                        filter === id ? 'bg-lantern-glow' : 'bg-surface-low'
                      }`}
                    >
                      <Text
                        className={`text-label-md ${
                          filter === id ? 'font-strong text-on-lantern' : 'text-on-surface-variant'
                        }`}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* カレンダー。
                **「今月の灯り ◯日」は 2026-08-14 に外した。**
                日数は「分析」にあり、探すための画面に置く数字ではなかった。 */}
            <View>
              <View className="bg-surface-low rounded-lg p-4">
                <ActivityCalendar
                  logs={logs}
                  selectedDate={selectedDate || ''}
                  onDateSelect={handleDateClick}
                />
                {!loading && logs.length === 0 ? (
                  <Text className="text-[11px] text-ink-faint text-center mt-3">
                    日付をタップすると、その日の記録を開けます
                  </Text>
                ) : null}
              </View>

              {selectedDate && selectedLog ? (
                <View className="mt-3 bg-stone/40 rounded-lg px-5 py-4">
                  <Text className="text-aux text-ink-faint mb-2">{dateDisplayJa(selectedDate)}</Text>
                  <LogDetail log={selectedLog} onDelete={handleDelete} onUpdate={handleUpdate} />
                </View>
              ) : null}

              {selectedDate && !selectedLog ? (
                <Text className="text-aux text-ink-faint text-center mt-3">この日の記録はありません</Text>
              ) : null}
            </View>

            {/* ログ一覧 */}
            {loading ? (
              <View className="gap-3">
                {[1, 2, 3].map((i) => (
                  <View key={i} className="h-12 bg-stone rounded" />
                ))}
              </View>
            ) : logs.length === 0 ? (
              <View className="items-center py-16">
                <Text className="text-3xl mb-4 opacity-40 text-ink">◇</Text>
                <Text className="text-body text-ink-soft">まだ記録がありません</Text>
                <Text className="text-aux text-ink-faint mt-1.5">「書く」から残せます</Text>
              </View>
            ) : filtered.length === 0 ? (
              <View className="items-center py-12">
                <Text className="text-body-md text-outline">
                  {q
                    ? `「${search.trim()}」の記録は見つかりませんでした`
                    : filter === 'favorite'
                      ? 'お気に入りはまだありません'
                      : 'この年の記録はありません'}
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                <MonthPicker months={months} value={month} onChange={setMonth} />
                <LogList
                  logs={filtered}
                  onDelete={handleDelete}
                  onUpdate={handleUpdate}
                  onToggleFavorite={handleToggleFavorite}
                />
              </View>
            )}
        </View>
        ) : (
          <View className="gap-8">
            <ReviewSection title="今週の振り返り" type="weekly" description="過去7日間の活動から" />
            <ReviewSection title="今月の振り返り" type="monthly" description="今月の活動から" />
            <TimelineSection logs={logs} />
            <KeywordSection />
          </View>
        )}
      </ScrollView>

      {/* 記録モーダル。
          **中身は「書く」と同じ `RecordForm`**（2026-08-14）。
          それまでは4欄を並べた別物で、「書く」には有る
          「もっと詳しく書く」の畳みも装飾のボタンも無かった。
          **同じことを2か所で書いていたので、片方だけ古くなっていた。** */}
      <Modal
        visible={modalDate !== null}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <Pressable className="flex-1 bg-black/50 justify-end" onPress={closeModal}>
          <Pressable className="bg-surface rounded-t-2xl px-5 pt-5 pb-8" onPress={() => {}}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="font-strong text-body-md text-on-surface">
                {modalDate ? dateDisplayJa(modalDate) : ''}
              </Text>
              <Pressable onPress={closeModal} accessibilityLabel="閉じる" className="p-1 min-h-touch justify-center">
                <Text className="text-outline text-body-md">✕</Text>
              </Pressable>
            </View>

            <ScrollView className="max-h-96" keyboardShouldPersistTaps="handled">
              {modalDate ? (
                <RecordForm
                  key={modalDate}
                  targetDate={modalDate}
                  onSaved={() => {
                    setSelectedDate(modalDate)
                    setTick((t) => t + 1)
                    closeModal()
                  }}
                />
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}
