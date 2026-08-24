import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dimensions, Modal, Pressable, ScrollView, TextInput, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import Text from '../../components/Text'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScreenFade } from '../../components/Motion'
import UnderlineTabs from '../../components/UnderlineTabs'
import { BOTTOM_GAP, useTabBarInset } from '../../lib/tabBar'
import { authFetch } from '../../lib/supabase'
import { loadLogs, replaceLogs } from '../../lib/logsCache'
import { useRefreshOnFocus } from '../../lib/refreshOnFocus'
import { attach as attachPhotos } from '../../lib/photoStore'
import { dateDisplayJa } from '../../lib/format'
import { todayStr } from '../../lib/date'
import ActivityCalendar from '../../components/ActivityCalendar'
import LogDetail from '../../components/LogDetail'
import AppHeader from '../../components/AppHeader'
import LogList from '../../components/LogList'
import ReviewSection from '../../components/ReviewSection'
import TimelineSection from '../../components/TimelineSection'
import KeywordSection from '../../components/KeywordSection'
import RecordForm from '../../components/RecordForm'
import { TOOLBAR_HEIGHT } from '../../components/EditorToolbar'
import { useKeyboardHeight } from '../../lib/keyboard'
import { sheetMaxHeight } from '../../lib/keyboardMath'
import MonthPicker, { monthsOf } from '../../components/MonthPicker'
import { EditorToolbarBar } from '../../components/EditorToolbar'

// 当月。`new Date()` から作る。UTC に寄る `toISOString()` は使わない
function thisMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function Journal() {
  // すりガラスのタブバーは内容の上に浮くので、その分だけ下を空ける
  const tabInset = useTabBarInset()
  // 記録の窓がキーボードに隠れないよう、出ている高さを測る
  const keyboardHeight = useKeyboardHeight()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  // 頻出キーワードから飛んでくると `?q=` が付く。その語で絞った状態で開く
  const params = useLocalSearchParams()
  const [search, setSearch] = useState(typeof params.q === 'string' ? params.q : '')
  const [selectedDate, setSelectedDate] = useState(null)
  // 絞り込み。'all' / 'favorite' / '2026' のような年
  const [filter, setFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('record')
  const [modalDate, setModalDate] = useState(null)
  // 一覧を月で区切る。'all' か '2026-06' のような月。
  // **既定は当月**（2026-08-14）。全部の月を最初から縦に並べない
  const [month, setMonth] = useState(thisMonth())

  const [tick, setTick] = useState(0)
  useRefreshOnFocus(useCallback(() => setTick((t) => t + 1), []))

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // 写真は端末にしか無いので、サーバーの記録に合流させる。
        // 写真しかない日もここで1件として現れる（lib/photoStore.js）
        //
        // **控えを先に出し、新しいものが来たら差し替える**（`lib/logsCache.js`）
        const data = await loadLogs((fresh) => {
          if (!cancelled) setLogs(attachPhotos(fresh))
        })
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

  // 頻出キーワードから来たとき。
  // **同じ画面への遷移なので、状態は自分で合わせる。**
  // `q` を読むだけでは、振り返りタブを開いたまま検索だけ変わって
  // 何も起きていないように見える。記録タブへ戻す。
  useEffect(() => {
    const q = typeof params.q === 'string' ? params.q : ''
    if (!q) return
    setSearch(q)
    setActiveTab('record')
  }, [params.q])

  // ホームの「すべての記録」から来たとき。**必ず記録タブを開く。**
  // 振り返りを開いたままだと、押しても一覧が出なかった
  useEffect(() => {
    if (params.tab === 'record') setActiveTab('record')
  }, [params.tab])

  // チップや検索を変えたら月の絞り込みを解く。
  // **ここは「すべて」に戻す。** 検索は月をまたいで探すもので、
  // 当月に固定したままだと、他の月にある記録が0件に見える
  //
  // **初回は走らせない**（2026-08-14）。走らせていたので、
  // 既定を当月にしたのに開いた瞬間「すべての月」に戻されていた。
  const firstFilter = useRef(true)
  useEffect(() => {
    if (firstFilter.current) {
      firstFilter.current = false
      return
    }
    setMonth('all')
  }, [filter, search])

  function handleDelete(date) {
    setLogs((prev) => {
      const next = prev.filter((l) => l.date !== date)
      // **控えも合わせる。**合わせないと、次に開いたとき消したものが戻る
      replaceLogs(next)
      return next
    })
    if (selectedDate === date) setSelectedDate(null)
  }

  function handleUpdate(updatedLog) {
    setLogs((prev) => {
      const next = prev.map((l) => (l.date === updatedLog.date ? updatedLog : l))
      // 削除と同じ理由で控えも合わせる。**2026-08-24 まで抜けていた。**
      // 消したときだけ合わせていたので、直した中身は次に開くと元に戻って見えた
      replaceLogs(next)
      return next
    })
  }

  // お気に入りの付け外し。
  //
  // **画面を先に変える。** 通信を待たせると、押しても何も起きない
  // 数百ミリ秒ができる。失敗したら元に戻す。
  async function handleToggleFavorite(log) {
    const next = !log.favorite
    setLogs((prev) => {
      const list = prev.map((l) => (l.date === log.date ? { ...l, favorite: next } : l))
      replaceLogs(list)
      return list
    })
    try {
      const res = await authFetch(`/api/logs/${log.date}/favorite`, {
        method: 'PUT',
        body: JSON.stringify({ favorite: next }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (e) {
      console.warn('[記録] お気に入りの変更に失敗', e)
      setLogs((prev) => {
        const list = prev.map((l) => (l.date === log.date ? { ...l, favorite: !next } : l))
        replaceLogs(list)
        return list
      })
    }
  }

  // **今日は書く場所が別にある**（2026-08-14）。
  //
  // 記録の無い日を押すと記録モーダルを開いていたが、
  // 今日については「書く」タブが本体で、そちらの方が広く、
  // 装飾も写真も問いも揃っている。
  // ここで小さいモーダルを開くと、**同じことをする場所が2つ**になる。
  //
  // 過去の日は「書く」から遡れないので、モーダルのままにする。
  function handleDateClick(date) {
    const existingLog = logs.find((l) => l.date === date)
    if (existingLog) {
      setSelectedDate(date)
      return
    }
    setSelectedDate(date)
    if (date !== todayStr()) setModalDate(date)
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
  // **選べない月を選んだ状態にしない。**
  // 当月に記録が無いまま起動すると、空の一覧に「2026年8月」とだけ出る。
  // その場合はいちばん新しい月に寄せる（記録があるのに無いように見せない）
  const effectiveMonth =
    month === 'all' || months.includes(month) ? month : (months[0] ?? 'all')
  const filtered =
    effectiveMonth === 'all' ? byChip : byChip.filter((l) => l.date.startsWith(effectiveMonth))

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <ScreenFade>
      <AppHeader />
      {/* 一覧から記録を開いて直すときも欄が出る（`LogDetail`）。
          **窓と同じ扱いにする**（2026-08-17） */}
      <ScrollView
        contentContainerClassName="px-5 pt-6 gap-6 w-full max-w-read self-center"
        contentContainerStyle={{
          paddingBottom:
            tabInset + BOTTOM_GAP + (keyboardHeight > 0 ? TOOLBAR_HEIGHT : 0),
        }}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
      >
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
        <UnderlineTabs
          tabs={[
            { id: 'record', label: '記録' },
            { id: 'review', label: '振り返り' },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />

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
                    日付をタップすると、その日の記録を開けます。
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
                <Text className="text-label-md text-outline text-center mt-3">
                  {selectedDate === todayStr()
                    ? '今日の記録はまだありません。「書く」から残せます。'
                    : 'この日の記録はありません。'}
                </Text>
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
                <Text className="text-body text-ink-soft">まだ記録がありません。</Text>
                <Text className="text-aux text-ink-faint mt-1.5">「書く」から残せます。</Text>
              </View>
            ) : filtered.length === 0 ? (
              <View className="items-center py-12">
                <Text className="text-body-md text-outline">
                  {q
                    ? `「${search.trim()}」の記録は見つかりませんでした。`
                    : filter === 'favorite'
                      ? 'お気に入りはまだありません。'
                      : 'この年の記録はありません。'}
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                <MonthPicker months={months} value={effectiveMonth} onChange={setMonth} />
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
        {/* **紙をキーボードの上へ逃がす**（2026-08-17）。
            下に貼り付いた紙なので、避けが無いと**丸ごと隠れる。**
            「よかったこと」「困ったこと」どころか、欄が1つも見えなかった。

            `automaticallyAdjustKeyboardInsets` は中の一覧を送るだけで、
            紙そのものは動かない。ここは外側を持ち上げる。 */}
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          style={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + TOOLBAR_HEIGHT : 0 }}
          onPress={closeModal}
        >
          <Pressable className="bg-surface rounded-t-2xl px-5 pt-5 pb-8" onPress={() => {}}>
            {/* つまみ。どこを掴めば閉じるかの目印 */}
            <View className="self-center w-10 h-1 rounded-full bg-outline-variant mb-4" />
            <View className="flex-row items-center justify-between mb-4">
              <Text className="font-strong text-body-md text-on-surface">
                {modalDate ? dateDisplayJa(modalDate) : ''}
              </Text>
              <Pressable onPress={closeModal} accessibilityLabel="閉じる" className="p-1 min-h-touch justify-center">
                <Text className="text-outline text-body-md">✕</Text>
              </Pressable>
            </View>

            {/* **上まで伸ばす**（2026-08-14）。
                `max-h-96`（384px）だと、詳しく書く欄を開いた時点で
                中だけが小さくスクロールし、下半分が余っていた。
                画面の高さから割り出す。 */}
            {/* キーボードが出ると使える縦が減る。**7割のままだと
                紙が画面からはみ出す**（`lib/keyboardMath.js`）。 */}
            <ScrollView
              style={{
                maxHeight: sheetMaxHeight({
                  windowHeight: Dimensions.get('window').height,
                  keyboardHeight,
                  toolbarHeight: TOOLBAR_HEIGHT,
                }),
              }}
              automaticallyAdjustKeyboardInsets
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
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

          {/* 装飾の列。**Modal の中にも置く。**
              RN の Modal は画面の一番外より上に出るので、
              根元（`_layout.jsx`）に置いた列はここでは隠れる */}
          <EditorToolbarBar />
        </Pressable>
      </Modal>
      </ScreenFade>
    </SafeAreaView>
  )
}
