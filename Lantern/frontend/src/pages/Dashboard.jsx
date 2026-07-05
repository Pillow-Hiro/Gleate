import { useState, useEffect } from 'react'
import { authFetch } from '../lib/supabase'

export default function Dashboard() {
  const [youtubeStatus, setYoutubeStatus] = useState({ connected: false, channel_name: null })
  const [youtubeConnecting, setYoutubeConnecting] = useState(false)
  const [youtubeDisconnecting, setYoutubeDisconnecting] = useState(false)
  const [youtubeMessage, setYoutubeMessage] = useState('')

  function fetchYoutubeStatus() {
    authFetch('/api/youtube/status')
      .then(r => r.json())
      .then(data => setYoutubeStatus(data))
      .catch(() => {})
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('youtube') === 'connected') {
      setYoutubeMessage('YouTubeと繋がりました。')
      window.history.replaceState({}, '', '/dashboard')
      fetchYoutubeStatus()
      const timer = setTimeout(() => setYoutubeMessage(''), 4000)
      return () => clearTimeout(timer)
    } else {
      fetchYoutubeStatus()
    }
  }, [])

  async function handleYouTubeDisconnect() {
    setYoutubeDisconnecting(true)
    try {
      await authFetch('/api/youtube/disconnect', { method: 'DELETE' })
      setYoutubeStatus({ connected: false, channel_name: null })
      setYoutubeMessage('YouTubeの連携を解除しました。')
      setTimeout(() => setYoutubeMessage(''), 4000)
    } catch {
      // サイレントフェイル — 再読み込みで正しい状態に戻る
    } finally {
      setYoutubeDisconnecting(false)
    }
  }

  async function handleYouTubeConnect() {
    setYoutubeConnecting(true)
    try {
      const res = await authFetch('/api/youtube/auth-url')
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
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
                onClick={handleYouTubeDisconnect}
                disabled={youtubeDisconnecting}
                className="shrink-0 text-xs text-red-500 border border-red-200 dark:border-red-900/40 px-3.5 py-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
              >
                {youtubeDisconnecting ? '解除中...' : '連携解除'}
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
    </div>
  )
}
