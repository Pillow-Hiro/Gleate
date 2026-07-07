import { useState, useEffect, Fragment } from 'react'
import {
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { authFetch } from '../lib/supabase'

// ─── 確認モーダル ───────────────────────────────────────────────
function ConfirmModal({ onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative bg-cream dark:bg-stone border border-border rounded-2xl px-6 py-6 w-full max-w-xs shadow-sm">
        <p className="text-sm text-ink mb-6 leading-relaxed">YouTubeの連携を解除しますか？</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="text-xs text-ink-soft border border-border px-4 py-1.5 rounded-full hover:bg-stone/60 transition-colors disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="text-xs text-red-500 border border-red-200 dark:border-red-900/40 px-4 py-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
          >
            {loading ? '解除中...' : '解除する'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── サマリーカード ─────────────────────────────────────────────
function SummaryCard({ label, value }) {
  return (
    <div className="bg-stone/50 rounded-xl px-4 py-4">
      <p className="text-[10px] text-ink-faint tracking-wider uppercase mb-1">{label}</p>
      <p className="text-xl font-light text-ink tabular-nums">{value.toLocaleString()}</p>
    </div>
  )
}

// ─── カスタム Tooltip（共通） ────────────────────────────────────
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-cream dark:bg-stone border border-border rounded-lg px-3 py-2 shadow-sm text-xs">
      <p className="text-ink-soft mb-0.5 max-w-[180px] truncate">{d.title}</p>
      <p className="text-ink tabular-nums">{d.view_count.toLocaleString()} 回</p>
    </div>
  )
}

// ─── アナリティクスセクション ────────────────────────────────────
const PERIODS = [
  { label: '7日間',  days: 7 },
  { label: '30日間', days: 30 },
  { label: '90日間', days: 90 },
]

function AnalyticsSection({ activeDays, onChangeDays, data, loading }) {
  // 古い順に並べてグラフ描画
  const chartData = data
    ? [...data].reverse().map(v => ({
        label: v.published_at ? v.published_at.slice(5).replace('-', '/') : '',
        view_count: v.view_count,
        title: v.title,
      }))
    : []

  return (
    <div className="bg-stone/50 rounded-xl px-4 pt-5 pb-4">
      {/* ヘッダー行：タイトル＋タブ */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] text-ink-faint tracking-[0.18em] uppercase">期間内の再生回数推移</p>
        <div className="flex gap-1">
          {PERIODS.map(({ label, days }) => (
            <button
              key={days}
              onClick={() => onChangeDays(days)}
              className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                activeDays === days
                  ? 'border-accent text-accent bg-accent/10'
                  : 'border-border text-ink-faint hover:bg-stone/60'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-48 bg-parchment rounded animate-pulse" />
      ) : chartData.length === 0 ? (
        <p className="text-xs text-ink-faint py-2">この期間に投稿された動画はありません。</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'var(--color-ink-faint)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--color-ink-faint)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--color-border)' }} />
            <Line
              type="monotone"
              dataKey="view_count"
              stroke="var(--color-accent)"
              strokeWidth={1.5}
              dot={{ r: 3, fill: 'var(--color-accent)', strokeWidth: 0 }}
              activeDot={{ r: 4, fill: 'var(--color-accent)', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ─── 動画一覧テーブル ────────────────────────────────────────────
const PRIVACY_LABEL = { private: '非公開', unlisted: '限定公開', public: '公開' }

function VideoTable({ videos }) {
  const rows = videos ?? []
  const isDim = p => p === 'private' || p === 'unlisted'
  // { [videoId]: { loading: bool, text: string|null, visible: bool } }
  const [insightState, setInsightState] = useState({})

  async function handleAsk(video) {
    const id = video.id
    const current = insightState[id]
    // 取得済み → 表示トグル
    if (current?.text != null) {
      setInsightState(prev => ({ ...prev, [id]: { ...prev[id], visible: !prev[id].visible } }))
      return
    }
    setInsightState(prev => ({ ...prev, [id]: { loading: true, text: null, visible: false } }))
    try {
      const res = await authFetch('/api/youtube/video-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: video.id,
          title: video.title,
          published_at: video.published_at,
          view_count: video.view_count,
          like_count: video.like_count,
        }),
      })
      const data = await res.json()
      setInsightState(prev => ({ ...prev, [id]: { loading: false, text: data.insight ?? '', visible: true } }))
    } catch {
      setInsightState(prev => ({ ...prev, [id]: { loading: false, text: null, visible: false } }))
    }
  }

  return (
    <div className="bg-stone/50 rounded-xl overflow-hidden">
      <p className="text-[10px] text-ink-faint tracking-[0.18em] uppercase px-4 pt-5 pb-3">動画一覧</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-xs border-collapse">
          <thead>
            <tr className="border-b border-border">
              {['動画タイトル', '投稿日', '再生回数', '高評価', '公開設定', ''].map((h, i) => (
                <th
                  key={i}
                  className="text-left text-[10px] text-ink-faint font-normal tracking-wide px-4 py-2 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-5 text-ink-faint">まだ動画がありません。</td>
              </tr>
            ) : rows.map(v => {
              const s = insightState[v.id] ?? {}
              return (
                <Fragment key={v.id}>
                  <tr className={`border-b border-border hover:bg-stone/60 transition-colors ${isDim(v.privacy) ? 'text-ink-soft' : 'text-ink'}`}>
                    <td className="px-4 py-3 max-w-[220px]">
                      <a
                        href={`https://www.youtube.com/watch?v=${v.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="line-clamp-2 leading-snug no-underline hover:text-accent transition-colors"
                      >
                        {v.title}
                      </a>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">{v.published_at}</td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">{v.view_count.toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">{v.like_count.toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {PRIVACY_LABEL[v.privacy] ?? v.privacy}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => handleAsk(v)}
                        disabled={s.loading}
                        className={`text-[10px] border px-2.5 py-1 rounded-full transition-colors disabled:opacity-50 ${
                          s.visible
                            ? 'border-accent text-accent bg-accent/10'
                            : 'border-border text-ink-faint hover:bg-stone/60'
                        }`}
                      >
                        {s.loading ? (
                          <span className="flex items-center gap-1">
                            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            生成中
                          </span>
                        ) : 'AIに聞く'}
                      </button>
                    </td>
                  </tr>
                  {s.visible && s.text && (
                    <tr className="border-b border-border last:border-b-0">
                      <td colSpan={6} className="px-4 py-3">
                        <p
                          className="text-xs leading-relaxed px-4 py-3 rounded-lg"
                          style={{ backgroundColor: 'var(--color-background-info)', color: 'var(--color-text-info)' }}
                        >
                          {s.text}
                        </p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── スケルトン ─────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-stone/50 rounded-xl px-4 py-4 space-y-2">
            <div className="h-2.5 w-12 bg-parchment rounded" />
            <div className="h-5 w-16 bg-parchment rounded" />
          </div>
        ))}
      </div>
      <div className="bg-stone/50 rounded-xl px-4 py-5">
        <div className="h-3 w-32 bg-parchment rounded mb-4" />
        <div className="h-48 bg-parchment rounded" />
      </div>
      <div className="bg-stone/50 rounded-xl px-4 py-5">
        <div className="h-3 w-24 bg-parchment rounded mb-4" />
        <div className="h-40 bg-parchment rounded" />
      </div>
      <div className="bg-stone/50 rounded-xl px-4 py-5 space-y-3">
        <div className="h-3 w-20 bg-parchment rounded" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-3 bg-parchment rounded" />
        ))}
      </div>
    </div>
  )
}

// ─── メイン ─────────────────────────────────────────────────────
export default function Dashboard() {
  const [youtubeStatus, setYoutubeStatus] = useState({ connected: false, channel_name: null })
  const [youtubeConnecting, setYoutubeConnecting] = useState(false)
  const [youtubeDisconnecting, setYoutubeDisconnecting] = useState(false)
  const [youtubeMessage, setYoutubeMessage] = useState('')
  const [showDisconnectModal, setShowDisconnectModal] = useState(false)
  const [channelStats, setChannelStats] = useState(null)
  const [videos, setVideos] = useState(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [analyticsDays, setAnalyticsDays] = useState(30)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  function fetchYoutubeStatus() {
    return authFetch('/api/youtube/status')
      .then(r => r.json())
      .then(data => { setYoutubeStatus(data); return data })
      .catch(() => ({ connected: false }))
  }

  async function fetchYoutubeData() {
    setDataLoading(true)
    try {
      const [chRes, vRes] = await Promise.all([
        authFetch('/api/youtube/channel'),
        authFetch('/api/youtube/videos'),
      ])
      if (chRes.ok) setChannelStats(await chRes.json())
      if (vRes.ok) {
        const data = await vRes.json()
        setVideos(data.videos ?? [])
      }
    } catch {
      // サイレント
    } finally {
      setDataLoading(false)
    }
  }

  async function fetchAnalytics(days) {
    setAnalyticsLoading(true)
    try {
      const res = await authFetch(`/api/youtube/analytics?days=${days}`)
      if (res.ok) {
        const data = await res.json()
        setAnalyticsData(data.videos ?? [])
      }
    } catch {
      // サイレント
    } finally {
      setAnalyticsLoading(false)
    }
  }

  function handleChangeDays(days) {
    setAnalyticsDays(days)
    fetchAnalytics(days)
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('youtube') === 'connected') {
      setYoutubeMessage('YouTubeと繋がりました。')
      window.history.replaceState({}, '', '/dashboard')
      fetchYoutubeStatus().then(s => {
        if (s.connected) {
          fetchYoutubeData()
          fetchAnalytics(30)
        }
      })
      const timer = setTimeout(() => setYoutubeMessage(''), 4000)
      return () => clearTimeout(timer)
    } else {
      fetchYoutubeStatus().then(s => {
        if (s.connected) {
          fetchYoutubeData()
          fetchAnalytics(30)
        }
      })
    }
  }, [])

  async function handleYouTubeDisconnect() {
    setYoutubeDisconnecting(true)
    try {
      await authFetch('/api/youtube/disconnect', { method: 'DELETE' })
      setYoutubeStatus({ connected: false, channel_name: null })
      setChannelStats(null)
      setVideos(null)
      setAnalyticsData(null)
      setShowDisconnectModal(false)
      setYoutubeMessage('YouTubeの連携を解除しました。')
      setTimeout(() => setYoutubeMessage(''), 4000)
    } catch {
      // サイレント
    } finally {
      setYoutubeDisconnecting(false)
    }
  }

  async function handleYouTubeConnect() {
    setYoutubeConnecting(true)
    try {
      const res = await authFetch('/api/youtube/auth-url')
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      setYoutubeConnecting(false)
    }
  }

  // 棒グラフ用データ（古い順）
  const barChartData = videos
    ? [...videos].reverse().map(v => ({
        label: v.published_at ? v.published_at.slice(5).replace('-', '/') : '',
        view_count: v.view_count,
        title: v.title,
      }))
    : []

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div>
        <p className="text-[10px] text-ink-faint tracking-[0.18em] uppercase mb-0.5">Dashboard</p>
        <h1 className="font-display text-xl font-light text-ink">ダッシュボード</h1>
      </div>

      {/* フラッシュメッセージ */}
      {youtubeMessage && (
        <p className="text-xs text-forest">{youtubeMessage}</p>
      )}

      {/* ─── 未連携 ─── */}
      {!youtubeStatus.connected && (
        <div className="bg-stone/50 rounded-xl px-5 py-6 flex flex-col items-start gap-3">
          <p className="text-sm text-ink">YouTube</p>
          <p className="text-xs text-ink-faint">チャンネルの活動記録と連携します</p>
          <button
            onClick={handleYouTubeConnect}
            disabled={youtubeConnecting}
            className="text-xs text-forest border border-sage/40 px-4 py-1.5 rounded-full hover:bg-sage-light transition-colors disabled:opacity-50"
          >
            {youtubeConnecting ? '移動中...' : 'YouTubeを連携する'}
          </button>
        </div>
      )}

      {/* ─── 連携済み ─── */}
      {youtubeStatus.connected && (
        <>
          {/* チャンネルヘッダー */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base text-ink">{channelStats?.channel_name ?? youtubeStatus.channel_name ?? 'チャンネル'}</p>
              <p className="text-xs text-ink-faint mt-0.5">YouTube</p>
            </div>
            <button
              onClick={() => setShowDisconnectModal(true)}
              className="text-xs text-ink-faint border border-border px-3 py-1 rounded-full hover:bg-stone/60 transition-colors"
            >
              連携解除
            </button>
          </div>

          {dataLoading ? (
            <Skeleton />
          ) : (
            <>
              {/* 1. サマリーカード */}
              {channelStats && (
                <div className="grid grid-cols-3 gap-3">
                  <SummaryCard label="登録者数" value={channelStats.subscriber_count} />
                  <SummaryCard label="総再生回数" value={channelStats.total_view_count} />
                  <SummaryCard label="総動画数" value={channelStats.video_count} />
                </div>
              )}

              {/* 2. アナリティクス（折れ線グラフ＋期間タブ） */}
              <AnalyticsSection
                activeDays={analyticsDays}
                onChangeDays={handleChangeDays}
                data={analyticsData}
                loading={analyticsLoading}
              />

              {/* 3. 動画別再生回数（棒グラフ） */}
              {videos !== null && (
                <div className="bg-stone/50 rounded-xl px-4 pt-5 pb-4">
                  <p className="text-[10px] text-ink-faint tracking-[0.18em] uppercase mb-4">動画別再生回数</p>
                  {barChartData.length === 0 ? (
                    <p className="text-xs text-ink-faint py-2">まだ動画がありません。</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={barChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--color-border)" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10, fill: 'var(--color-ink-faint)' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: 'var(--color-ink-faint)' }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-parchment)' }} />
                        <Bar dataKey="view_count" fill="var(--color-accent)" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}

              {/* 4. 動画一覧テーブル */}
              {videos !== null && <VideoTable videos={videos} />}
            </>
          )}
        </>
      )}

      {showDisconnectModal && (
        <ConfirmModal
          onConfirm={handleYouTubeDisconnect}
          onCancel={() => setShowDisconnectModal(false)}
          loading={youtubeDisconnecting}
        />
      )}
    </div>
  )
}
