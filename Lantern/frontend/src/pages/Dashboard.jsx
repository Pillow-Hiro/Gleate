import { useState, useEffect } from 'react'
import { authFetch } from '../lib/supabase'

function ConfirmModal({ onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative bg-cream dark:bg-stone border border-border rounded-2xl px-6 py-6 w-full max-w-xs shadow-sm">
        <p className="text-sm text-ink mb-6 leading-relaxed">
          YouTubeの連携を解除しますか？
        </p>
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

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
      <span className="text-xs text-ink-faint">{label}</span>
      <span className="text-sm text-ink tabular-nums">{value.toLocaleString()}</span>
    </div>
  )
}

function VideoRow({ video }) {
  return (
    <div className="py-3 border-b border-border last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-ink leading-snug flex-1 min-w-0">
          {video.title}
          {video.privacy === 'private' && (
            <span className="ml-1.5 text-[10px] text-ink-faint border border-border rounded px-1 py-0.5 align-middle">非公開</span>
          )}
          {video.privacy === 'unlisted' && (
            <span className="ml-1.5 text-[10px] text-ink-faint border border-border rounded px-1 py-0.5 align-middle">限定公開</span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-4 mt-1">
        <span className="text-xs text-ink-faint">{video.published_at}</span>
        <span className="text-xs text-ink-faint">{video.view_count.toLocaleString()} 回視聴</span>
        <span className="text-xs text-ink-faint">♡ {video.like_count.toLocaleString()}</span>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="bg-stone/50 rounded-xl px-4 py-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex justify-between items-center py-1">
            <div className="h-3 w-20 bg-parchment rounded" />
            <div className="h-3 w-12 bg-parchment rounded" />
          </div>
        ))}
      </div>
      <div className="bg-stone/50 rounded-xl px-4 py-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="py-2 space-y-1.5">
            <div className="h-3 w-3/4 bg-parchment rounded" />
            <div className="h-2.5 w-1/2 bg-parchment rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

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
      .then(data => {
        setYoutubeStatus(data)
        return data
      })
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
      // データ取得失敗はサイレント
    } finally {
      setDataLoading(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('youtube') === 'connected') {
      setYoutubeMessage('YouTubeと繋がりました。')
      window.history.replaceState({}, '', '/dashboard')
      fetchYoutubeStatus().then(status => {
        if (status.connected) fetchYoutubeData()
      })
      const timer = setTimeout(() => setYoutubeMessage(''), 4000)
      return () => clearTimeout(timer)
    } else {
      fetchYoutubeStatus().then(status => {
        if (status.connected) fetchYoutubeData()
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
      setShowDisconnectModal(false)
      setYoutubeMessage('YouTubeの連携を解除しました。')
      setTimeout(() => setYoutubeMessage(''), 4000)
    } catch {
      // サイレントフェイル
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

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] text-ink-faint tracking-[0.18em] uppercase mb-0.5">Dashboard</p>
        <h1 className="font-display text-xl font-light text-ink">ダッシュボード</h1>
      </div>

      {/* 外部連携 */}
      <section className="space-y-0">
        <h2 className="text-[10px] text-ink-faint tracking-[0.18em] uppercase mb-2">外部連携</h2>
        <div className="bg-stone/50 rounded-xl px-4">
          {youtubeMessage && (
            <p className="text-xs text-forest py-3 border-b border-border">{youtubeMessage}</p>
          )}
          {youtubeStatus.connected ? (
            <div className="flex items-center justify-between py-4">
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-sm text-ink">YouTube</p>
                <p className="text-xs text-ink-faint mt-0.5">{youtubeStatus.channel_name || '連携済み'}</p>
              </div>
              <button
                onClick={() => setShowDisconnectModal(true)}
                className="shrink-0 text-xs text-ink-faint border border-border px-3.5 py-1.5 rounded-full hover:bg-stone/60 transition-colors"
              >
                連携解除
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between py-4">
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-sm text-ink">YouTube</p>
                <p className="text-xs text-ink-faint mt-0.5">チャンネルの活動記録と連携します</p>
              </div>
              <button
                onClick={handleYouTubeConnect}
                disabled={youtubeConnecting}
                className="shrink-0 text-xs text-forest border border-sage/40 px-3.5 py-1.5 rounded-full hover:bg-sage-light transition-colors disabled:opacity-50"
              >
                {youtubeConnecting ? '移動中...' : 'YouTubeを連携する'}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* YouTube データ */}
      {youtubeStatus.connected && (
        dataLoading ? (
          <Skeleton />
        ) : (
          <>
            {/* チャンネル統計 */}
            {channelStats && (
              <section>
                <h2 className="text-[10px] text-ink-faint tracking-[0.18em] uppercase mb-2">チャンネル統計</h2>
                <div className="bg-stone/50 rounded-xl px-4">
                  <StatRow label="登録者数" value={channelStats.subscriber_count} />
                  <StatRow label="総再生回数" value={channelStats.total_view_count} />
                  <StatRow label="総動画数" value={channelStats.video_count} />
                </div>
              </section>
            )}

            {/* 動画一覧 */}
            <section>
              <h2 className="text-[10px] text-ink-faint tracking-[0.18em] uppercase mb-2">最近の動画</h2>
              <div className="bg-stone/50 rounded-xl px-4">
                {videos === null || videos.length === 0 ? (
                  <p className="text-xs text-ink-faint py-4">まだ動画がありません。</p>
                ) : (
                  videos.map(v => <VideoRow key={v.id} video={v} />)
                )}
              </div>
            </section>
          </>
        )
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
