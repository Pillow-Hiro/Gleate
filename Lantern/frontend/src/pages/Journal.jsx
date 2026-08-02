import { useState, useEffect } from 'react'
import { authFetch, uploadPhoto, removePhoto } from '../lib/supabase'
import ActivityCalendar from '../components/ActivityCalendar'
import ReviewSection from '../components/ReviewSection'
import TimelineSection from '../components/TimelineSection'
import KeywordSection from '../components/KeywordSection'
import LogDetail from '../components/LogDetail'
import LogItem from '../components/LogItem'
import PhotoPicker from '../components/PhotoPicker'
import { dateDisplayJa, groupByMonth, monthLabel } from '../lib/format'

// タブ切り替えボタン。
// Journal() の内側で定義すると再レンダリングのたびに別コンポーネント扱いになり、
// Reactが中身を作り直してしまうためモジュールレベルに置く。
function TabButton({ id, label, activeTab, onSelect }) {
  const isActive = activeTab === id
  return (
    <button
      onClick={() => onSelect(id)}
      className={`text-sm px-1 pb-2.5 border-b-2 -mb-px transition-colors ${
        isActive
          ? 'text-accent border-accent'
          : 'text-ink-faint border-transparent hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}

// ── Journal ───────────────────────────────────────────────────
export default function Journal() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState(null)
  const [activeTab, setActiveTab] = useState('record')
  const [modalDate, setModalDate] = useState(null)
  const [modalForm, setModalForm] = useState({ created: '', enjoyable: '', struggled: '', next: '' })
  const [modalSaving, setModalSaving] = useState(false)
  const [modalPhotoUrl, setModalPhotoUrl] = useState(null)

  useEffect(() => {
    authFetch('/api/logs')
      .then(r => r.json())
      .then(data => setLogs(data))
      .finally(() => setLoading(false))
  }, [])

  function handleDelete(date) {
    setLogs(prev => prev.filter(l => l.date !== date))
    if (selectedDate === date) setSelectedDate(null)
  }

  function handleUpdate(updatedLog) {
    setLogs(prev => prev.map(l => l.date === updatedLog.date ? updatedLog : l))
  }

  function handleDateClick(date) {
    const existingLog = logs.find(l => l.date === date)
    if (existingLog) {
      setSelectedDate(date)
    } else {
      setSelectedDate(null)
      setModalDate(date)
      setModalForm({ created: '', enjoyable: '', struggled: '', next: '' })
      setModalPhotoUrl(null)
    }
  }

  // 写真はテキストと別APIで保存する。/save は写真に触れない設計なので、
  // ここで先に保存しておけば後からテキストを編集しても消えない。
  async function handleModalPhotoSelect(photo, thumb) {
    const data = await uploadPhoto(modalDate, photo, thumb)
    setModalPhotoUrl(data.photo_url)
    setLogs(prev => {
      const found = prev.find(l => l.date === modalDate)
      if (found) {
        return prev.map(l => (l.date === modalDate ? { ...l, ...data } : l))
      }
      // 写真だけの記録。サーバー側でも記録行が作られている
      return [...prev, {
        date: modalDate, created: '', enjoyable: '', struggled: '', next: '', ...data,
      }]
    })
  }

  async function handleModalPhotoRemove() {
    await removePhoto(modalDate)
    setModalPhotoUrl(null)
    setLogs(prev => prev.map(l => (
      l.date === modalDate ? { ...l, photo_url: null, photo_thumb_url: null } : l
    )))
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: modalDate, ...modalForm }),
      })
      if (!res.ok) throw new Error('save failed')
      const data = await res.json()
      const existing = logs.find(l => l.date === modalDate)
      const newLog = {
        date: modalDate,
        ...modalForm,
        ai_response: data.ai_response,
        // 写真は別APIで先に保存済み。テキスト保存で消えないよう引き継ぐ
        photo_url: existing?.photo_url ?? null,
        photo_thumb_url: existing?.photo_thumb_url ?? null,
      }
      setLogs(prev => (
        existing ? prev.map(l => (l.date === modalDate ? newLog : l)) : [...prev, newLog]
      ))
      setSelectedDate(modalDate)
      setModalDate(null)
    } catch (e) {
      // エラー時はモーダルを維持し、入力を捨てない
      console.warn(`[Journal] ${modalDate} の保存に失敗`, e)
    } finally {
      setModalSaving(false)
    }
  }

  const now = new Date()
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const thisMonthCount = logs.filter(l => l.date >= thisMonthStart).length
  const selectedLog = selectedDate ? logs.find(l => l.date === selectedDate) || null : null

  const q = search.trim().toLowerCase()
  const filtered = q
    ? logs.filter(l =>
        [l.created, l.enjoyable, l.struggled, l.next].some(v => v?.toLowerCase().includes(q))
      )
    : logs

  const groups = groupByMonth(filtered)
  const monthKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <p className="text-[10px] text-ink-faint tracking-[0.18em] uppercase mb-0.5">Journal</p>
        <h1 className="font-display text-xl font-light text-ink">記録</h1>
        {!loading && logs.length > 0 && (
          <p className="text-sm text-ink-soft mt-1">{logs.length}日間の記録</p>
        )}
      </div>

      {/* タブ */}
      <div className="flex gap-4 border-b border-border">
        <TabButton id="record" label="記録" activeTab={activeTab} onSelect={setActiveTab} />
        <TabButton id="review" label="振り返り" activeTab={activeTab} onSelect={setActiveTab} />
      </div>

      {/* 記録タブ */}
      {activeTab === 'record' && (
        <div className="space-y-8">
          {/* 今月の灯りバッジ + カレンダー */}
          <section>
            {thisMonthCount > 0 && (
              <div className="flex justify-end mb-3">
                <span className="text-xs text-amber bg-amber-light border border-amber/20 px-2.5 py-0.5 rounded-full">
                  今月の灯り {thisMonthCount}日
                </span>
              </div>
            )}
            <div className="bg-stone/50 rounded-xl p-4">
              <ActivityCalendar logs={logs} selectedDate={selectedDate || ''} onDateSelect={handleDateClick} />
              {!loading && logs.length === 0 && (
                <p className="text-[11px] text-ink-faint text-center mt-3">
                  日付をタップして記録を始めましょう
                </p>
              )}
            </div>
            {selectedDate && selectedLog && (
              <div className="mt-3 bg-stone/40 rounded-xl px-5 py-4">
                <p className="text-xs text-ink-faint tracking-wide mb-2">{dateDisplayJa(selectedDate)}</p>
                <LogDetail log={selectedLog} onDelete={handleDelete} onUpdate={handleUpdate} />
              </div>
            )}
            {selectedDate && !selectedLog && (
              <p className="text-xs text-ink-faint text-center mt-3">この日の記録はありません</p>
            )}
          </section>

          {/* 検索 */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" viewBox="0 0 14 14">
              <circle cx="5.5" cy="5.5" r="4" />
              <line x1="9" y1="9" x2="13" y2="13" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="記録を検索"
              className="w-full bg-stone border border-border rounded-lg pl-8 pr-9 py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-sage/50 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors">
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" viewBox="0 0 13 13">
                  <line x1="2" y1="2" x2="11" y2="11" />
                  <line x1="11" y1="2" x2="2" y2="11" />
                </svg>
              </button>
            )}
          </div>

          {/* ログ一覧 */}
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-12 bg-stone rounded-lg animate-pulse" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-3xl mb-4 opacity-40">◇</p>
              <p className="text-sm text-ink-soft">まだ記録がありません</p>
              <p className="text-xs text-ink-faint mt-1.5">Homeから今日の記録を始めましょう</p>
            </div>
          ) : monthKeys.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-ink-faint">「{search.trim()}」の記録は見つかりませんでした</p>
            </div>
          ) : (
            <div className="space-y-8">
              {monthKeys.map(month => (
                <section key={month}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <h2 className="text-xs text-ink-soft tracking-wider font-medium">
                      {monthLabel(groups[month][0].date)}
                    </h2>
                    <span className="text-[10px] text-ink-faint">{groups[month].length}日</span>
                  </div>
                  <div className="bg-stone/40 rounded-xl px-4">
                    {groups[month].map(log => (
                      <LogItem key={log.date} log={log} onDelete={handleDelete} onUpdate={handleUpdate} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 振り返りタブ */}
      {activeTab === 'review' && (
        <div className="space-y-8">
          <ReviewSection title="今週の振り返り" type="weekly" description="過去7日間の活動から" />
          <ReviewSection title="今月の振り返り" type="monthly" description="今月の活動から" />
          <TimelineSection logs={logs} />
          <KeywordSection />
        </div>
      )}

      {/* 記録モーダル */}
      {modalDate && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center sm:px-4"
          onClick={() => setModalDate(null)}
        >
          <div
            className="bg-cream w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl px-5 pt-5 pb-8 sm:py-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-ink-faint tracking-wider">{dateDisplayJa(modalDate)}</p>
              <button
                onClick={() => setModalDate(null)}
                className="text-ink-faint hover:text-ink transition-colors p-1 -mr-1"
                aria-label="閉じる"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" viewBox="0 0 14 14">
                  <line x1="2" y1="2" x2="12" y2="12" />
                  <line x1="12" y1="2" x2="2" y2="12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              {[
                { field: 'created',   label: 'やったこと',   placeholder: '今日やったこと', rows: 3 },
                { field: 'enjoyable', label: 'よかったこと', placeholder: 'よかったこと（任意）', rows: 2 },
                { field: 'struggled', label: '困ったこと',   placeholder: '詰まったこと（任意）', rows: 2 },
                { field: 'next',      label: '次にやること', placeholder: '（任意）', rows: 2 },
              ].map(({ field, label, placeholder, rows }) => (
                <div key={field}>
                  <label className="text-[10px] text-ink-faint tracking-wider uppercase block mb-1">{label}</label>
                  <textarea
                    value={modalForm[field]}
                    onChange={e => setModalForm(f => ({ ...f, [field]: e.target.value }))}
                    placeholder={placeholder}
                    rows={rows}
                    className="w-full bg-stone border border-border rounded-lg px-3 py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-sage/50 transition-colors resize-none"
                  />
                </div>
              ))}

              <PhotoPicker
                photoUrl={modalPhotoUrl}
                onSelect={handleModalPhotoSelect}
                onRemove={handleModalPhotoRemove}
                disabled={modalSaving}
              />
            </div>

            <div className="flex items-center justify-end gap-4 pt-1">
              <button onClick={() => setModalDate(null)} className="text-xs text-ink-faint hover:text-ink transition-colors">
                キャンセル
              </button>
              <button
                onClick={handleModalSave}
                disabled={modalSaving || !canSaveModal}
                className="text-xs text-forest border border-sage/40 px-3.5 py-1.5 rounded-full hover:bg-sage-light transition-colors disabled:opacity-50"
              >
                {modalSaving ? '保存中...' : '記録する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
