import { useCallback, useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { authFetch } from '../lib/supabase'
import { startConnect, readConnectResult, clearConnectResult } from '../lib/youtubeConnect'
import { useThemeContext } from '../lib/theme'
import ViewsChart from './ViewsChart'
import VideoTimeline from './VideoTimeline'

// Dashboard の YouTube タブの中身。
// Twitch タブを足すにあたり dashboard.jsx から逐語的に切り出したもので、
// 挙動は変えていない。状態もハンドラもこのファイル内で完結する。

const PERIODS = [
  { label: '7日間', days: 7 },
  { label: '30日間', days: 30 },
  { label: '90日間', days: 90 },
]

function SummaryCard({ label, value }) {
  return (
    <View className="bg-stone/50 rounded-xl px-4 py-4 flex-1">
      <Text className="text-[10px] text-ink-faint mb-1">{label}</Text>
      <Text className="text-xl font-light text-ink">{value.toLocaleString()}</Text>
    </View>
  )
}

export default function YouTubePanel() {
  const { isDark } = useThemeContext()
  const [status, setStatus] = useState({ connected: false, channel_name: null })
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  // 連携から戻った直後かは URL で決まるため初期値として導出する。
  // useEffect の中で setState すると余分な再レンダリングが起きる。
  // ネイティブでは readConnectResult() が常に null を返すので空になる。
  const [message, setMessage] = useState(
    () => (readConnectResult() === 'connected' ? 'YouTubeと繋がりました。' : '')
  )
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [channelStats, setChannelStats] = useState(null)
  const [videos, setVideos] = useState(null)
  const [videosError, setVideosError] = useState(false)
  const [dataLoading, setDataLoading] = useState(false)
  const [analyticsDays, setAnalyticsDays] = useState(30)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [channelInsight, setChannelInsight] = useState('')
  const [channelInsightLoading, setChannelInsightLoading] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await authFetch('/api/youtube/status')
      const data = await res.json()
      setStatus(data)
      return data
    } catch (e) {
      console.warn('[Dashboard] 連携状態の取得に失敗', e)
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
    } catch (e) {
      console.warn('[Dashboard] チャンネル情報・動画一覧の取得に失敗', e)
      setVideosError(true)
    } finally {
      setDataLoading(false)
    }
  }, [])

  // チャンネル全体の観察。Web版 Dashboard.jsx の handleChannelInsight と同じ仕様。
  // 数字で評価せず、タイトルや投稿時期から読み取れる傾向だけを返す
  // （プロンプト側で担保。modules/ai.py の generate_channel_insight を参照）。
  const handleChannelInsight = useCallback(async () => {
    if (!videos?.length) return
    setChannelInsightLoading(true)
    setChannelInsight('')
    try {
      const res = await authFetch('/api/youtube/channel-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videos: videos.map((v) => ({
            title: v.title,
            published_at: v.published_at,
            view_count: v.view_count,
            like_count: v.like_count,
          })),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setChannelInsight(data.insight || '')
      } else {
        console.warn(`[Dashboard] channel-insight が ${res.status} を返した`)
      }
    } catch (e) {
      console.warn('[Dashboard] チャンネル観察の取得に失敗', e)
    } finally {
      setChannelInsightLoading(false)
    }
  }, [videos])

  const fetchAnalytics = useCallback(async (days) => {
    setAnalyticsLoading(true)
    try {
      const res = await authFetch(`/api/youtube/analytics?days=${days}`)
      if (res.ok) {
        const data = await res.json()
        setAnalyticsData(data.videos ?? [])
      }
    } catch (e) {
      // 画面には出さない。原因追跡のためログだけ残す
      console.warn('[Dashboard] アナリティクスの取得に失敗', e)
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

  useEffect(() => {
    // クエリを残すとリロードのたびに接続完了扱いになる
    if (readConnectResult() === 'connected') clearConnectResult()
    loadAll()
  }, [loadAll])

  function handleChangeDays(days) {
    setAnalyticsDays(days)
    fetchAnalytics(days)
  }

  // 実装は lib/youtubeConnect.js（ネイティブ）と .web.js（Web）に分かれている。
  // Web はページ遷移して戻ってこないため 'redirecting' が返る。
  async function handleConnect() {
    setConnecting(true)
    try {
      const result = await startConnect()
      if (result === 'connected') {
        setMessage('YouTubeと繋がりました。')
        setTimeout(() => setMessage(''), 4000)
        await loadAll()
      } else if (result === 'failed') {
        setMessage('連携できませんでした。')
        setTimeout(() => setMessage(''), 4000)
      }
      // 'cancelled' はユーザーが閉じただけなので何も表示しない
    } catch (e) {
      console.warn('[Dashboard] YouTube連携に失敗', e)
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
    } catch (e) {
      // 画面には出さない。原因追跡のためログだけ残す
      console.warn('[Dashboard] 連携解除に失敗', e)
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
    <>
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

          {/* サマリー。項目はWeb版 Dashboard.jsx と揃える。
              /api/youtube/channel が返すキーは total_view_count（view_count ではない） */}
          {channelStats ? (
            <View className="flex-row gap-3">
              <SummaryCard label="登録者数" value={channelStats.subscriber_count ?? 0} />
              <SummaryCard label="総再生回数" value={channelStats.total_view_count ?? 0} />
              <SummaryCard label="総動画数" value={channelStats.video_count ?? 0} />
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

          {/* AIの観察（チャンネル全体）。Web版と同じ位置・同じ挙動 */}
          <View>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[10px] text-ink-faint tracking-[2px]">AIの観察</Text>
              <Pressable
                onPress={handleChannelInsight}
                disabled={channelInsightLoading || !videos?.length}
                className="border border-sage/40 rounded-full px-3.5 py-1.5 disabled:opacity-50"
              >
                <Text className="text-xs text-forest">
                  {channelInsightLoading ? '生成中...' : channelInsight ? '再生成' : 'Lanternに聞く'}
                </Text>
              </Pressable>
            </View>

            {channelInsightLoading ? (
              <View className="bg-sage-light/60 border border-sage/20 rounded-xl px-5 py-4 gap-2">
                <View className="h-3 bg-sage/20 rounded w-full" />
                <View className="h-3 bg-sage/20 rounded w-4/5" />
                <View className="h-3 bg-sage/20 rounded w-2/3" />
              </View>
            ) : null}

            {!channelInsightLoading && channelInsight ? (
              <View className="bg-sage-light/60 border border-sage/20 rounded-xl px-5 py-4 gap-1.5">
                <Text className="text-[10px] tracking-[2px] text-sage">LANTERN</Text>
                <Text className="text-sm leading-relaxed text-forest">{channelInsight}</Text>
              </View>
            ) : null}
          </View>
        </>
      )}
    </>
  )
}
