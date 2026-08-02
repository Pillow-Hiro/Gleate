import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { authFetch, uploadPhoto, removePhoto } from '../lib/supabase'
import { localDateStr, todayStr, calcStreak } from '../lib/date'
import PhotoPicker from '../components/PhotoPicker'

const MONTHS_EN = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
const WEEKDAYS_JA = ['日','月','火','水','木','金','土']

function formatDateJa(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAYS_JA[date.getDay()]}曜日`
}

function dateDisplayJa(dateStr) {
  const [, m, d] = dateStr.split('-')
  return `${Number(m)}月${Number(d)}日`
}

// ── 記録フォーム ──────────────────────────────────────────────
function RecordForm({ existingLog, targetDate, onSaved }) {
  const isToday = targetDate === todayStr()
  const [form, setForm] = useState({
    created: existingLog?.created || '',
    enjoyable: existingLog?.enjoyable || '',
    struggled: existingLog?.struggled || '',
    next: existingLog?.next || '',
  })
  const [detailOpen, setDetailOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState(existingLog?.ai_response || '')
  const [saveError, setSaveError] = useState('')
  const [photoUrl, setPhotoUrl] = useState(existingLog?.photo_url || null)

  // 写真は別APIで即座に保存する。テキストの「記録する」を待たない。
  // ここで onSaved() を呼ばないのは、logs を取り直すと key が変わって
  // このフォームが作り直され、入力途中のテキストが消えるため。
  async function handlePhotoSelect(photo, thumb) {
    const data = await uploadPhoto(targetDate, photo, thumb)
    setPhotoUrl(data.photo_url)
  }

  async function handlePhotoRemove() {
    await removePhoto(targetDate)
    setPhotoUrl(null)
  }

  async function handleSave() {
    setLoading(true)
    setAiResponse('')
    setSaveError('')
    try {
      const res = await authFetch('/save', {
        method: 'POST',
        body: JSON.stringify({ ...form, date: targetDate }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.ai_response) setAiResponse(data.ai_response)
      if (onSaved) onSaved()
    } catch (e) {
      // 画面にはユーザー向けの一文だけ出す。詳細はログに残す
      console.warn('[Home] 記録の保存に失敗', e)
      setSaveError('保存に失敗しました。接続を確認してください。')
    } finally {
      setLoading(false)
    }
  }

  function field(key, label, rows = 2, placeholder = '（任意）') {
    return (
      <div>
        <label className="block text-xs text-ink-faint mb-1.5 tracking-wide">{label}</label>
        <textarea
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          rows={rows}
          className="w-full bg-cream border border-border rounded px-3 py-2 text-sm text-ink placeholder-ink-faint resize-none focus:outline-none focus:border-sage/60 transition-colors"
          placeholder={placeholder}
        />
      </div>
    )
  }

  return (
    <div className="border border-border rounded-lg px-5 py-4 space-y-4">
      {existingLog && (
        <span className="text-[10px] tracking-[0.1em] px-2 py-0.5 rounded-full bg-sage-light text-sage">
          記録済
        </span>
      )}

      {field('created', `${isToday ? '今日' : 'この日'}のこと`, 5, `${isToday ? '今日' : 'この日'}どんなことをしましたか？`)}
      {field('next', '次にやること', 2)}

      {/* 詳細折りたたみ */}
      <button
        type="button"
        onClick={() => setDetailOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink-soft transition-colors"
      >
        <svg
          width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.75"
          strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 11 11"
          className={`transition-transform duration-200 ${detailOpen ? 'rotate-90' : ''}`}
        >
          <path d="M3 2l4.5 3.5L3 9" />
        </svg>
        {detailOpen ? 'もっと詳しく書く（閉じる）' : 'もっと詳しく書く'}
      </button>

      <div
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: detailOpen ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="space-y-4 pt-1">
            {field('enjoyable', 'よかったこと・楽しかったこと')}
            {field('struggled', '詰まったこと・困ったこと')}
          </div>
        </div>
      </div>

      <PhotoPicker
        photoUrl={photoUrl}
        onSelect={handlePhotoSelect}
        onRemove={handlePhotoRemove}
        disabled={loading}
      />

      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full bg-forest dark:bg-[var(--color-primary)] text-cream dark:text-[var(--color-primary-text)] text-sm py-2.5 rounded tracking-wide hover:bg-sage dark:hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
      >
        {loading ? '保存中...' : '記録する'}
      </button>
      {saveError && (
        <p className="text-xs text-red-500 text-center">{saveError}</p>
      )}

      {aiResponse && (
        <div className="bg-sage-light/60 border border-sage/20 rounded-xl px-5 py-4 mt-4 space-y-1.5">
          <p className="text-[10px] tracking-[0.18em] uppercase text-sage">
            Lantern
          </p>
          <p className="text-sm leading-relaxed text-forest">
            {aiResponse}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Home ──────────────────────────────────────────────────────
export default function Home() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [quote, setQuote] = useState('')
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshTick, setRefreshTick] = useState(0)
  const [milestone, setMilestone] = useState(null)
  const [milestoneOpen, setMilestoneOpen] = useState(false)

  const now = new Date()
  const dateLabel = `${now.getDate()} ${MONTHS_EN[now.getMonth()]}`
  const dateJa = formatDateJa(now)

  const dateParam = searchParams.get('date')
  const targetDate = (dateParam && dateParam <= todayStr()) ? dateParam : todayStr()
  const isEditingPast = targetDate !== todayStr()

  function refreshData() { setRefreshTick(t => t + 1) }

  useEffect(() => {
    ;(async () => {
      try {
        const res = await authFetch('/api/milestone')
        if (!res.ok) return
        const data = await res.json()
        if (!data.has_milestone) return

        const { days } = data
        const seenKey = `milestone_seen_${days}`
        if (localStorage.getItem(seenKey)) return

        // reflection はキャッシュがあれば再利用、なければ1回だけ生成
        const cacheKey = `milestone_reflection_${days}`
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          setMilestone({ days, reflection: JSON.parse(cached) })
          return
        }

        const rRes = await authFetch(`/api/milestone/reflection?days=${days}`)
        if (!rRes.ok) return
        const rData = await rRes.json()
        if (rData.reflection) {
          localStorage.setItem(cacheKey, JSON.stringify(rData.reflection))
        }
        setMilestone({ days, reflection: rData.reflection })
      } catch (e) {
        // ネットワーク失敗時はバナー非表示のままにする
        console.warn('[Home] 節目の振り返りの取得に失敗', e)
      }
    })()
  }, [])

  function handleMilestoneDismiss() {
    if (milestone) localStorage.setItem(`milestone_seen_${milestone.days}`, 'true')
    setMilestone(null)
  }

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const [logsRes, quoteRes] = await Promise.all([
          authFetch('/api/logs'),
          authFetch('/api/daily/quote'),
        ])
        let logsData = []
        if (logsRes.ok) {
          logsData = await logsRes.json()
          setLogs(logsData)
        }
        if (quoteRes.ok) {
          const quoteData = await quoteRes.json()
          setQuote(quoteData.quote || '')
        }
      } catch (e) {
        // 取得できなければ空のまま表示する
        console.warn('[Home] 記録・今日の灯りの取得に失敗', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [refreshTick])

  const existingLog = logs.find(l => l.date === targetDate) || null

  const streak = calcStreak(logs)

  return (
    <div className="space-y-8">
      {/* 日付ヘッダー */}
      <div>
        <p className="text-xs text-ink-faint tracking-[0.2em] uppercase mb-0.5">{dateLabel}</p>
        <h1 className="font-display text-xl font-light text-ink tracking-wide">
          {dateJa}
          {streak >= 2 && (
            <span className="text-xs text-ink-faint font-normal tracking-normal ml-2">· {streak}日目</span>
          )}
        </h1>
      </div>

      {/* 節目バナー */}
      {milestone && (
        <div className="bg-forest dark:bg-[var(--color-primary)] rounded-xl px-4 py-3.5">
          <button
            onClick={() => setMilestoneOpen(o => !o)}
            className="w-full flex items-center justify-between gap-3 text-left"
          >
            <p className="text-sm text-cream dark:text-[var(--color-primary-text)]">記録を始めて{milestone.days}日が経ちました。</p>
            <svg
              width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.75"
              strokeLinecap="round" viewBox="0 0 12 12"
              className={`shrink-0 text-cream/60 transition-transform duration-200 ${milestoneOpen ? 'rotate-180' : ''}`}
            >
              <path d="M2 4l4 4 4-4" />
            </svg>
          </button>

          <div className={`grid transition-all duration-300 ease-out ${milestoneOpen ? 'grid-rows-[1fr] mt-3' : 'grid-rows-[0fr]'}`}>
            <div className="overflow-hidden space-y-3">
              {milestone.reflection && (
                <div className="bg-white/10 dark:bg-black/20 rounded-xl px-4 py-3.5 space-y-2">
                  <p className="text-[10px] text-cream/60 tracking-[0.18em] uppercase">Lantern</p>
                  <p className="text-sm text-cream dark:text-[var(--color-primary-text)] leading-relaxed">{milestone.reflection.observation}</p>
                  <p className="text-sm text-cream/80 dark:text-[var(--color-primary-text)]/80 italic leading-relaxed">{milestone.reflection.question}</p>
                </div>
              )}
              <div className="flex justify-end">
                <button
                  onClick={handleMilestoneDismiss}
                  className="text-xs text-cream/60 hover:text-cream/90 transition-colors"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 今日の灯り */}
      <section>
        <p className="text-[10px] text-ink-faint tracking-[0.18em] uppercase mb-3">今日の灯り</p>
        <div className="bg-forest dark:bg-[var(--color-primary)] rounded-xl px-5 py-5 min-h-[88px] flex items-center">
          {loading ? (
            <div className="w-32 h-4 bg-white/20 rounded animate-pulse" />
          ) : (
            <p className="font-display text-cream dark:text-[var(--color-primary-text)] text-base font-light leading-relaxed tracking-wide">
              {quote || '今日の記録が、ここに残る。'}
            </p>
          )}
        </div>
      </section>

      {/* 記録フォーム */}
      <section>
        {isEditingPast && (
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-ink-faint">{dateDisplayJa(targetDate)}の記録を編集中</p>
            <button onClick={() => navigate('/')} className="text-xs text-ink-faint hover:text-ink transition-colors">
              ← 今日に戻る
            </button>
          </div>
        )}
        <RecordForm
          key={existingLog ? existingLog.date : `new-${targetDate}`}
          existingLog={existingLog}
          targetDate={targetDate}
          onSaved={() => { refreshData(); if (isEditingPast) navigate('/') }}
        />
      </section>

      {/* 今週の発見 */}
      {logs.length > 0 && (
        <section>
          <p className="text-[10px] text-ink-faint tracking-[0.18em] uppercase mb-3">今週の発見</p>
          <div className="bg-sage-light/60 border border-sage/20 rounded-xl px-5 py-4">
            {(() => {
              const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6)
              const weekLogs = logs.filter(l => l.date >= localDateStr(weekAgo))
                .sort((a, b) => b.date.localeCompare(a.date))
              if (weekLogs.length === 0) return (
                <p className="text-sm text-ink-soft">今週の記録がまだありません。</p>
              )

              function snip(text, max = 24) {
                return text.length > max ? text.slice(0, max) + '…' : text
              }

              const observations = []
              const latestEnjoyable = weekLogs.find(l => l.enjoyable)?.enjoyable
              if (latestEnjoyable) observations.push(`「${snip(latestEnjoyable)}」が、今週の記録に残っています。その言葉は、どこから来ているのでしょう。`)

              const latestNext = weekLogs.find(l => l.next)?.next
              if (latestNext) observations.push(`「${snip(latestNext)}」が、この週に記録されています。それを書いた時のことを、今はどう感じますか。`)

              const latestStruggled = weekLogs.find(l => l.struggled)?.struggled
              if (latestStruggled && !latestEnjoyable) observations.push(`「${snip(latestStruggled)}」が、今週の記録に残っています。その言葉を、今のあなたはどう感じますか。`)

              const eveningCount = weekLogs.filter(l => {
                if (!l.saved_at) return false
                const h = new Date(l.saved_at).getHours()
                return h >= 20 || h < 5
              }).length
              if (eveningCount >= 2) observations.push(`今週は夜に記録した日が${eveningCount}日ありました。あなたにとって、夜はどんな時間でしょう。`)

              if (observations.length === 0) {
                const latestCreated = weekLogs[0]?.created
                observations.push(latestCreated
                  ? `「${snip(latestCreated)}」が、この週に記録されています。この記録を、今のあなたはどう感じますか。`
                  : '今週の記録が、ここに残っています。')
              }

              return (
                <div className="text-sm text-forest leading-relaxed space-y-2">
                  {observations.slice(0, 2).map((obs, i) => <p key={i}>{obs}</p>)}
                </div>
              )
            })()}
          </div>
        </section>
      )}
    </div>
  )
}
