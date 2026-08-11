import { useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native'
import Text from '../../components/Text'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BOTTOM_GAP, useTabBarInset } from '../../lib/tabBar'
import { authFetch } from '../../lib/supabase'
import {
  attach as attachPhotos,
  remove as removePhoto,
  save as savePhoto,
} from '../../lib/photoStore'
import { dateDisplayJa } from '../../lib/format'
import ActivityCalendar from '../../components/ActivityCalendar'
import LogDetail from '../../components/LogDetail'
import LogList from '../../components/LogList'
import ReviewSection from '../../components/ReviewSection'
import TimelineSection from '../../components/TimelineSection'
import KeywordSection from '../../components/KeywordSection'
import PhotoPicker from '../../components/PhotoPicker'

const MODAL_FIELDS = [
  { field: 'created', label: 'やったこと', placeholder: '今日やったこと', minHeight: 84 },
  { field: 'enjoyable', label: 'よかったこと', placeholder: 'よかったこと（任意）', minHeight: 60 },
  { field: 'struggled', label: '困ったこと', placeholder: '詰まったこと（任意）', minHeight: 60 },
  { field: 'next', label: '次にやること', placeholder: '（任意）', minHeight: 60 },
]

const EMPTY_FORM = { created: '', enjoyable: '', struggled: '', next: '' }

export default function Journal() {
  // すりガラスのタブバーは内容の上に浮くので、その分だけ下を空ける
  const tabInset = useTabBarInset()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState(null)
  const [activeTab, setActiveTab] = useState('record')
  const [modalDate, setModalDate] = useState(null)
  const [modalForm, setModalForm] = useState(EMPTY_FORM)
  const [modalSaving, setModalSaving] = useState(false)
  const [modalPhotoUrl, setModalPhotoUrl] = useState(null)

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
      setModalPhotoUrl(null)
    }
  }

  function closeModal() {
    setModalDate(null)
    setModalPhotoUrl(null)
  }

  // 写真は端末の中にだけ置く（lib/photoStore.js）。テキストとは経路が別なので、
  // ここで先に置いておけば後からテキストを編集しても消えない。
  async function handleModalPhotoSelect(photo, thumb) {
    const urls = savePhoto(modalDate, photo, thumb)
    setModalPhotoUrl(urls.photo_url)
    setLogs((prev) => {
      const found = prev.find((l) => l.date === modalDate)
      if (found) {
        return prev.map((l) => (l.date === modalDate ? { ...l, ...urls } : l))
      }
      // 写真だけの記録。サーバーはこの日を知らないので、一覧にはここで足す
      return [...prev, { date: modalDate, ...EMPTY_FORM, ...urls }]
    })
  }

  async function handleModalPhotoRemove() {
    removePhoto(modalDate)
    setModalPhotoUrl(null)
    setLogs((prev) =>
      prev.map((l) => (l.date === modalDate ? { ...l, photo_url: null, photo_thumb_url: null } : l))
    )
  }

  // テキストか写真のどちらかがあれば保存できる。
  // 「写真だけで残せる」ことが本機能の目的なので、created 必須をやめた。
  const canSaveModal = Boolean(modalForm.created.trim() || modalPhotoUrl)

  async function handleModalSave() {
    if (!canSaveModal) return
    setModalSaving(true)
    try {
      const res = await authFetch('/save', {
        method: 'POST',
        body: JSON.stringify({ date: modalDate, ...modalForm }),
      })
      if (!res.ok) throw new Error('save failed')
      const data = await res.json()
      const existing = logs.find((l) => l.date === modalDate)
      const newLog = {
        date: modalDate,
        ...modalForm,
        ai_response: data.ai_response,
        // 写真は別APIで先に保存済み。テキスト保存で消えないよう引き継ぐ
        photo_url: existing?.photo_url ?? null,
        photo_thumb_url: existing?.photo_thumb_url ?? null,
      }
      setLogs((prev) =>
        existing ? prev.map((l) => (l.date === modalDate ? newLog : l)) : [...prev, newLog]
      )
      setSelectedDate(modalDate)
      closeModal()
    } catch (e) {
      // エラー時はモーダルを維持し、入力を捨てない
      console.warn(`[Journal] ${modalDate} の保存に失敗`, e)
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

        {/* タブ */}
        <View className="flex-row gap-4 border-b border-border">
          {/* アイデアは 2026-08-08 に「書く」へ移した。
              思いついた瞬間に置くものなので、書く場所にある方が自然。
              ここ（記録）は残したものを見る場所。 */}
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
            {/* カレンダー */}
            <View>
              {thisMonthCount > 0 ? (
                <View className="flex-row justify-end mb-3">
                  <View className="bg-amber-light border border-amber/20 rounded-full px-2.5 py-0.5">
                    <Text className="text-aux text-amber">今月の灯り {thisMonthCount}日</Text>
                  </View>
                </View>
              ) : null}

              <View className="bg-stone/50 rounded-lg p-4">
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

            {/* 検索 */}
            <View className="flex-row items-center bg-stone border border-border rounded px-3">
              <Text className="text-ink-faint text-aux mr-2">⌕</Text>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="記録を検索"
                placeholderTextColor="#8E8478"
                className="flex-1 py-2.5 font-body text-body text-ink"
              />
              {search ? (
                <Pressable onPress={() => setSearch('')} className="pl-2">
                  <Text className="text-ink-faint text-aux">✕</Text>
                </Pressable>
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
                <Text className="text-body text-ink-faint">
                  「{search.trim()}」の記録は見つかりませんでした
                </Text>
              </View>
            ) : (
              <LogList logs={filtered} onDelete={handleDelete} onUpdate={handleUpdate} />
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

      {/* 記録モーダル */}
      <Modal
        visible={modalDate !== null}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <Pressable className="flex-1 bg-black/50 justify-end" onPress={closeModal}>
          <Pressable className="bg-cream rounded-t-2xl px-5 pt-5 pb-8" onPress={() => {}}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-aux text-ink-faint">
                {modalDate ? dateDisplayJa(modalDate) : ''}
              </Text>
              <Pressable onPress={closeModal} accessibilityLabel="閉じる" className="p-1">
                <Text className="text-ink-faint text-aux">✕</Text>
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
                      placeholderTextColor="#8E8478"
                      multiline
                      textAlignVertical="top"
                      style={{ minHeight }}
                      className="bg-stone border border-border rounded px-3 py-2.5 text-body text-ink"
                    />
                  </View>
                ))}

                <PhotoPicker
                  photoUrl={modalPhotoUrl}
                  onSelect={handleModalPhotoSelect}
                  onRemove={handleModalPhotoRemove}
                  disabled={modalSaving}
                />
              </View>
            </ScrollView>

            <View className="flex-row items-center justify-end gap-4 pt-4">
              <Pressable onPress={closeModal}>
                <Text className="text-aux text-ink-faint">キャンセル</Text>
              </Pressable>
              <Pressable
                onPress={handleModalSave}
                disabled={modalSaving || !canSaveModal}
                className="border border-sage/40 rounded-full px-3.5 py-1.5 disabled:opacity-50"
              >
                <Text className="text-aux text-forest">{modalSaving ? '保存中...' : '記録する'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}
