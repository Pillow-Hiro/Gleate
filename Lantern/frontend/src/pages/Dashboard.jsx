import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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

// ─── カスタム Tooltip ────────────────────────────────────────────
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

// ─── 動画一覧テーブル ────────────────────────────────────────────
const PRIVACY_LABEL = { private: '非公開', unlisted: '限定公開', public: '公開' }

const dummyVideos = [
  { id: 'xxx', title: 'テスト動画タイトル', published_at: '2026-06-01', view_count: 1200, like_count: 45, privacy: 'private' },
]

function VideoTable({ videos }) {
  const rows = videos ?? dummyVideos
  const isDim = p => p === 'private' || p === 'unlisted'

  return (
    <div className="bg-stone/50 rounded-xl overflow-hidden">
      <p className="text-[10px] text-ink-faint tracking-[0.18em] uppercase px-4 pt-5 pb-3">動画一覧</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px] text-xs border-collapse">
          <thead>
            <tr className="border-b border-border">
              {['動画タイトル', '投稿日', '再生回数', '高評価', '公開設定'].map(h => (
                <th
                  key={h}
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
                <td colSpan={5} className="px-4 py-5 text-ink-faint">まだ動画がありません。</td>
              </tr>
            ) : rows.map(v => (
              <tr
                key={v.id}
                className={`border-b border-border last:border-b-0 hover:bg-stone/60 transition-colors ${isDim(v.privacy) ? 'text-ink-soft' : 'text-ink'}`}
              >
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
              </tr>
            ))}
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('youtube') === 'connected') {
      setYoutubeMessage('YouTubeと繋がりました。')
      window.history.replaceState({}, '', '/dashboard')
      fetchYoutubeStatus().then(s => { if (s.connected) fetchYoutubeData() })
      const timer = setTimeout(() => setYoutubeMessage(''), 4000)
      return () => clearTimeout(timer)
    } else {
      fetchYoutubeStatus().then(s => { if (s.connected) fetchYoutubeData() })
    }
  }, [])

  async function handleYouTubeDisconnect() {
    setYoutubeDisconnecting(true)
    try {
      await authFetch('/api/youtube/disconnect', { method: 'DELETE' })
      setYoutubeStatus({ connected: false, channel_name: null })
      setChannelStats(null)
      setVideos(null)
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

  // グラフ用データ（古い順に並べ直す）
  const chartData = videos
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
              {/* サマリーカード */}
              {channelStats && (
                <div className="grid grid-cols-3 gap-3">
                  <SummaryCard label="登録者数" value={channelStats.subscriber_count} />
                  <SummaryCard label="総再生回数" value={channelStats.total_view_count} />
                  <SummaryCard label="総動画数" value={channelStats.video_count} />
                </div>
              )}

              {/* 棒グラフ */}
              {videos !== null && (
                <div className="bg-stone/50 rounded-xl px-4 pt-5 pb-4">
                  <p className="text-[10px] text-ink-faint tracking-[0.18em] uppercase mb-4">動画別再生回数</p>
                  {chartData.length === 0 ? (
                    <p className="text-xs text-ink-faint py-2">まだ動画がありません。</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
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

              {/* 動画一覧テーブル */}
              <VideoTable videos={videos} />
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
