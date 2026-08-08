import { useCallback, useEffect, useState } from 'react'
import { Linking, Pressable, View } from 'react-native'
import Text from './Text'
import { authFetch } from '../lib/supabase'
import { startConnect, readConnectResult, clearConnectResult } from '../lib/twitchConnect'

// Dashboard の Twitch タブの中身。
//
// Twitch の過去配信（VOD）は一定期間で消えるため、サーバー側は
// 取得できたときに保存している。ここで見えているのは保存済みのもので、
// VOD が消えた後も残る。
//
// 数字（視聴数・フォロワー数）は事実として出すが、増減に感想は添えない。

function formatDuration(seconds) {
  if (!seconds) return null
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}時間${m}分`
  return `${m}分`
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

function StreamRow({ stream }) {
  const duration = formatDuration(stream.duration_seconds)
  return (
    <View className="border-b border-border py-3.5">
      <Text className="text-aux text-ink-faint mb-1">{formatDate(stream.started_at)}</Text>
      <Pressable onPress={() => stream.url && Linking.openURL(stream.url)}>
        <Text className="text-body text-ink leading-snug">{stream.title || '（タイトルなし）'}</Text>
      </Pressable>
      <View className="flex-row items-center gap-3 mt-1">
        {duration ? <Text className="text-aux text-ink-faint">{duration}</Text> : null}
        <Text className="text-aux text-ink-faint">{(stream.view_count ?? 0).toLocaleString()} 回</Text>
      </View>
    </View>
  )
}

export default function TwitchPanel() {
  const [status, setStatus] = useState({ connected: false, display_name: null })
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [message, setMessage] = useState(
    () => (readConnectResult() === 'connected' ? 'Twitchと繋がりました。' : '')
  )
  const [streams, setStreams] = useState(null)
  const [followerCount, setFollowerCount] = useState(null)
  const [loading, setLoading] = useState(false)
  const [insight, setInsight] = useState('')
  const [insightLoading, setInsightLoading] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await authFetch('/api/twitch/status')
      const data = await res.json()
      setStatus(data)
      return data
    } catch (e) {
      console.warn('[Twitch] 連携状態の取得に失敗', e)
      return { connected: false }
    }
  }, [])

  // 配信の取得はサーバー側で保存も行う。VODが消える前に残すため、
  // 画面を開いたタイミングを取得の機会にしている。
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, cRes] = await Promise.all([
        authFetch('/api/twitch/streams'),
        authFetch('/api/twitch/channel'),
      ])
      if (sRes.ok) setStreams((await sRes.json()).streams ?? [])
      if (cRes.ok) setFollowerCount((await cRes.json()).follower_count ?? null)
    } catch (e) {
      console.warn('[Twitch] 配信の取得に失敗', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadAll = useCallback(async () => {
    const s = await fetchStatus()
    if (s.connected) fetchData()
  }, [fetchStatus, fetchData])

  useEffect(() => {
    if (readConnectResult() === 'connected') clearConnectResult()
    loadAll()
  }, [loadAll])

  async function handleConnect() {
    setConnecting(true)
    try {
      const result = await startConnect()
      if (result === 'connected') {
        setMessage('Twitchと繋がりました。')
        setTimeout(() => setMessage(''), 4000)
        await loadAll()
      } else if (result === 'failed') {
        setMessage('連携できませんでした。')
        setTimeout(() => setMessage(''), 4000)
      }
      // 'cancelled' はユーザーが閉じただけ。'redirecting' は Web の遷移中
    } catch (e) {
      console.warn('[Twitch] 連携に失敗', e)
      setMessage('連携できませんでした。')
      setTimeout(() => setMessage(''), 4000)
    } finally {
      setConnecting(false)
    }
  }

  // YouTube タブの handleChannelInsight と同じ仕様。
  // 押したときだけ生成する（開くたびにAIを呼ばない）。
  async function handleInsight() {
    if (!streams?.length) return
    setInsightLoading(true)
    setInsight('')
    try {
      const res = await authFetch('/api/twitch/stream-insight', { method: 'POST' })
      if (res.ok) {
        setInsight((await res.json()).insight || '')
      } else {
        console.warn(`[Twitch] stream-insight が ${res.status} を返した`)
      }
    } catch (e) {
      console.warn('[Twitch] 配信の観察の取得に失敗', e)
    } finally {
      setInsightLoading(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await authFetch('/api/twitch/disconnect', { method: 'DELETE' })
      setStatus({ connected: false, display_name: null })
      setFollowerCount(null)
      setConfirmDisconnect(false)
      // streams は消さない。連携を切っても記録は残るという設計のため
      setMessage('Twitchの連携を解除しました。')
      setTimeout(() => setMessage(''), 4000)
    } catch (e) {
      console.warn('[Twitch] 連携解除に失敗', e)
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <>
      {message ? (
        <View className="bg-sage-light/60 border border-sage/20 rounded-lg px-4 py-3">
          <Text className="text-body text-forest">{message}</Text>
        </View>
      ) : null}

      {!status.connected ? (
        <View className="border border-border border-dashed rounded-lg px-5 py-8 items-center gap-3">
          <Text className="text-body text-ink-soft text-center">
            Twitchと繋ぐと、配信の記録がここに並びます。
          </Text>
          <Pressable
            onPress={handleConnect}
            disabled={connecting}
            className="border border-sage/40 rounded-full px-4 py-2 disabled:opacity-50"
          >
            <Text className="text-aux text-forest">
              {connecting ? '接続中...' : 'Twitchと繋ぐ'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="font-strong text-aux text-ink-soft mb-0.5">チャンネル</Text>
              <Text className="text-body text-ink">{status.display_name || '—'}</Text>
            </View>
            {confirmDisconnect ? (
              <View className="flex-row items-center gap-3">
                <Pressable onPress={() => setConfirmDisconnect(false)}>
                  <Text className="text-aux text-ink-faint">キャンセル</Text>
                </Pressable>
                <Pressable onPress={handleDisconnect} disabled={disconnecting}>
                  <Text className="text-aux text-error">
                    {disconnecting ? '解除中...' : '解除する'}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setConfirmDisconnect(true)}>
                <Text className="text-aux text-ink-faint">連携を解除</Text>
              </Pressable>
            )}
          </View>

          {/* 配信の一覧を主、数字を従とする配置。
              フォロワー数は最も外部評価に近い指標のため上に置かない。 */}
          <View>
            <Text className="font-strong text-aux text-ink-soft mb-1">配信</Text>
            {loading && streams === null ? (
              <View className="gap-3 pt-2">
                {[1, 2, 3].map((i) => (
                  <View key={i} className="h-4 bg-parchment rounded-full w-4/5" />
                ))}
              </View>
            ) : streams && streams.length > 0 ? (
              <View>
                {streams.map((s) => (
                  <StreamRow key={s.video_id} stream={s} />
                ))}
              </View>
            ) : (
              <Text className="text-body text-ink-faint py-4">まだ配信の記録がありません。</Text>
            )}
          </View>

          {/* AIの観察。YouTube タブと同じ位置・同じ挙動 */}
          <View>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="font-strong text-aux text-ink-soft">AIの観察</Text>
              <Pressable
                onPress={handleInsight}
                disabled={insightLoading || !streams?.length}
                className="border border-sage/40 rounded-full px-3.5 py-1.5 disabled:opacity-50"
              >
                <Text className="text-aux text-forest">
                  {insightLoading ? '生成中...' : insight ? '再生成' : 'Lanternに聞く'}
                </Text>
              </Pressable>
            </View>

            {insightLoading ? (
              <View className="bg-sage-light/60 border border-sage/20 rounded-lg px-5 py-4 gap-2">
                <View className="h-3 bg-sage/20 rounded-full w-full" />
                <View className="h-3 bg-sage/20 rounded-full w-4/5" />
                <View className="h-3 bg-sage/20 rounded-full w-2/3" />
              </View>
            ) : null}

            {!insightLoading && insight ? (
              <View className="bg-sage-light/60 border border-sage/20 rounded-lg px-5 py-4 gap-1.5">
                <Text className="text-[10px] tracking-[2px] text-sage">LANTERN</Text>
                <Text className="text-body leading-relaxed text-forest">{insight}</Text>
              </View>
            ) : null}
          </View>

          {followerCount != null ? (
            <View className="bg-stone/50 rounded-lg px-4 py-4">
              <Text className="text-[10px] text-ink-faint mb-1">フォロワー数</Text>
              <Text className="text-xl text-ink">
                {followerCount.toLocaleString()}
              </Text>
            </View>
          ) : null}
        </>
      )}
    </>
  )
}
