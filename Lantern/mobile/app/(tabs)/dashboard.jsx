import { useCallback, useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as WebBrowser from 'expo-web-browser'
import { authFetch } from '../../lib/supabase'
import { useThemeContext } from '../../lib/theme'
import ViewsChart from '../../components/ViewsChart'
import VideoTimeline from '../../components/VideoTimeline'

const PERIODS = [
  { label: '7日間', days: 7 },
  { label: '30日間', days: 30 },
  { label: '90日間', days: 90 },
]

// app.json の scheme と一致させること。バックエンドの _APP_SCHEME_ORIGIN と対になる。
const RETURN_URL = 'lantern://dashboard'

function SummaryCard({ label, value }) {
  return (
    <View className="bg-stone/50 rounded-xl px-4 py-4 flex-1">
      <Text className="text-[10px] text-ink-faint mb-1">{label}</Text>
      <Text className="text-xl font-light text-ink">{value.toLocaleString()}</Text>
    </View>
  )
}

export default function Dashboard() {
  const { isDark } = useThemeContext()
  const [status, setStatus] = useState({ connected: false, channel_name: null })
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [message, setMessage] = useState('')
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [channelStats, setChannelStats] = useState(null)
  const [videos, setVideos] = useState(null)
  const [videosError, setVideosError] = useState(false)
  const [dataLoading, setDataLoading] = useState(false)
  const [analyticsDays, setAnalyticsDays] = useState(30)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await authFetch('/api/youtube/status')
      const data = await res.json()
      setStatus(data)
      return data
    } catch {
      return { connected: false }
    }
  }, [])

  const fetchData = useCallback(async () => {
    setDataLoading(true)
    setVideosError(false)
    try {
      const [chRes, vRes] = await Promise.all([
        authFetch('/api/youtube/channel'),
        authFetch('/api/youtube/videos'),
      ])
      if (chRes.ok) setChannelStats(await chRes.json())
      if (vRes.ok) {
        const data = await vRes.json()
        setVideos(data.videos ?? [])
      } else {
        setVideosError(true)
      }
    } catch {
      setVideosError(true)
    } finally {
      setDataLoading(false)
    }
  }, [])

  const fetchAnalytics = useCallback(async (days) => {
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
  }, [])

  const loadAll = useCallback(async () => {
    const s = await fetchStatus()
    if (s.connected) {
      fetchData()
      fetchAnalytics(30)
    }
  }, [fetchStatus, fetchData, fetchAnalytics])

  useEffect(() => { loadAll() }, [loadAll])

  function handleChangeDays(days) {
    setAnalyticsDays(days)
    fetchAnalytics(days)
  }

  // Web版は window.location.href で遷移し、リダイレクトで戻ってきたURLの
  // クエリを見ていた。ネイティブでは認証セッションを開き、
  // lantern:// への復帰をその戻り値で受け取る。
  async function handleConnect() {
    setConnecting(true)
    try {
      const res = await authFetch('/api/youtube/auth-url?platform=app')
      const data = await res.json()
      if (!data.url) throw new Error('no auth url')

      const result = await WebBrowser.openAuthSessionAsync(data.url, RETURN_URL)
      if (result.type === 'success' && result.url?.includes('youtube=connected')) {
        setMessage('YouTubeと繋がりました。')
        setTimeout(() => setMessage(''), 4000)
        await loadAll()
      } else if (result.type === 'success') {
        setMessage('連携できませんでした。')
        setTimeout(() => setMessage(''), 4000)
      }
      // result.type === 'cancel' はユーザーが閉じただけなので何も表示しない
    } catch {
      setMessage('連携できませんでした。')
      setTimeout(() => setMessage(''), 4000)
    } finally {
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await authFetch('/api/youtube/disconnect', { method: 'DELETE' })
      setStatus({ connected: false, channel_name: null })
      setChannelStats(null)
      setVideos(null)
      setVideosError(false)
      setAnalyticsData(null)
      setConfirmDisconnect(false)
      setMessage('YouTubeの連携を解除しました。')
      setTimeout(() => setMessage(''), 4000)
    } catch {
      // サイレント
    } finally {
      setDisconnecting(false)
    }
  }

  const chartData = analyticsData
    ? [...analyticsData].reverse().map((v) => ({
        label: v.published_at ? v.published_at.slice(5).replace('-', '/') : '',
        view_count: v.view_count,
        title: v.title,
      }))
    : []

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pt-6 pb-10 gap-6">
        <View>
          <Text className="text-[10px] text-ink-faint tracking-[2px] mb-0.5">DASHBOARD</Text>
          <Text className="font-display text-xl font-light text-ink">ダッシュボード</Text>
        </View>

        {message ? (
          <View className="bg-sage-light/60 border border-sage/20 rounded-xl px-4 py-3">
            <Text className="text-sm text-forest">{message}</Text>
          </View>
        ) : null}

        {!status.connected ? (
          <View className="border border-border border-dashed rounded-xl px-5 py-8 items-center gap-3">
            <Text className="text-sm text-ink-soft text-center">
              YouTubeと繋ぐと、動画の記録がここに並びます。
            </Text>
            <Pressable
              onPress={handleConnect}
              disabled={connecting}
              className="border border-sage/40 rounded-full px-4 py-2 disabled:opacity-50"
            >
              <Text className="text-xs text-forest">
                {connecting ? '接続中...' : 'YouTubeと繋ぐ'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* チャンネル */}
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <Text className="text-[10px] text-ink-faint tracking-[2px] mb-0.5">CHANNEL</Text>
                <Text className="text-sm text-ink">{status.channel_name || '—'}</Text>
              </View>
              {confirmDisconnect ? (
                <View className="flex-row items-center gap-3">
                  <Pressable onPress={() => setConfirmDisconnect(false)}>
                    <Text className="text-xs text-ink-faint">キャンセル</Text>
                  </Pressable>
                  <Pressable onPress={handleDisconnect} disabled={disconnecting}>
                    <Text className="text-xs text-red-500">
                      {disconnecting ? '解除中...' : '解除する'}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => setConfirmDisconnect(true)}>
                  <Text className="text-xs text-ink-faint">連携を解除</Text>
                </Pressable>
              )}
            </View>

            {/* サマリー */}
            {channelStats ? (
              <View className="flex-row gap-3">
                {/* /api/youtube/channel が返すキーは total_view_count。
                    view_count を読んでいたため常に0が出ていた */}
                <SummaryCard label="総再生数" value={channelStats.total_view_count ?? 0} />
                <SummaryCard label="動画数" value={channelStats.video_count ?? 0} />
              </View>
            ) : null}

            {/* 再生回数推移 */}
            <View className="bg-stone/50 rounded-xl px-4 pt-5 pb-4">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-[10px] text-ink-faint tracking-[2px]">再生回数推移</Text>
                <View className="flex-row gap-1">
                  {PERIODS.map(({ label, days }) => (
                    <Pressable
                      key={days}
                      onPress={() => handleChangeDays(days)}
                      className={`rounded-full border px-2.5 py-1 ${
                        analyticsDays === days ? 'border-accent bg-accent/10' : 'border-border'
                      }`}
                    >
                      <Text
                        className={`text-[10px] ${
                          analyticsDays === days ? 'text-accent' : 'text-ink-faint'
                        }`}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {analyticsLoading ? (
                <View className="h-48 bg-parchment rounded" />
              ) : chartData.length === 0 ? (
                <Text className="text-xs text-ink-faint py-2">
                  この期間に投稿された動画はありません。
                </Text>
              ) : (
                <ViewsChart data={chartData} isDark={isDark} />
              )}
            </View>

            {/* 動画一覧 */}
            <View>
              <Text className="text-[10px] text-ink-faint tracking-[2px] mb-3">VIDEOS</Text>
              {dataLoading ? (
                <View className="gap-4">
                  {[1, 2, 3].map((i) => (
                    <View key={i}>
                      <View className="w-full bg-parchment rounded-lg" style={{ aspectRatio: 16 / 9 }} />
                      <View className="h-3 bg-parchment rounded w-4/5 mt-2" />
                    </View>
                  ))}
                </View>
              ) : videosError ? (
                <Text className="text-sm text-ink-faint">動画を取得できませんでした。</Text>
              ) : (
                <VideoTimeline videos={videos} />
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
