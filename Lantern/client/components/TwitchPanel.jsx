import { useCallback, useEffect, useState } from 'react'
import { Image, Linking, Pressable, View } from 'react-native'
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

// **サムネイルは保存していない**（`modules/twitch.py`）。
// TwitchのURLはVODと一緒に死ぬので、保存すると壊れた枠が残る。
// いま取れたぶんだけサーバーが重ねて返すので、
// **生きている配信には出て、消えた配信には出ない。**
function StreamRow({ stream }) {
  const duration = formatDuration(stream.duration_seconds)
  return (
    <View className="border-b border-border py-3.5">
      <Text className="text-label-md text-outline mb-1.5">{formatDate(stream.started_at)}</Text>
      <Pressable
        onPress={() => stream.url && Linking.openURL(stream.url)}
        className="flex-row gap-3"
      >
        {stream.thumbnail_url ? (
          <Image
            source={{ uri: stream.thumbnail_url }}
            style={{ width: 96, height: 54 }}
            className="rounded"
            resizeMode="cover"
          />
        ) : null}
        <View className="flex-1">
          <Text className="text-body-md text-on-surface leading-snug">
            {stream.title || '（タイトルなし）'}
          </Text>
          <View className="flex-row items-center gap-3 mt-1">
            {duration ? <Text className="text-label-md text-outline">{duration}</Text> : null}
            <Text className="text-label-md text-outline">
              {(stream.view_count ?? 0).toLocaleString()} 回
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  )
}

// 配信中のときだけ出す帯。
//
// **同時接続数は配信中にしか取れない。** 過去の配信について
// 「その時に何人が同時に見ていたか」を Twitch は返さない。
// 録っていない数字は、あとから作れない。
//
// 数は事実として出す。**増減にも多寡にも触れない**（CLAUDE.md）。
function LiveNow({ live }) {
  if (!live) return null
  return (
    <View className="bg-discovery-surface border border-outline-variant rounded-lg p-4 gap-2">
      <View className="flex-row items-center gap-2">
        <View className="w-2 h-2 rounded-full bg-error" />
        <Text className="font-strong text-label-md text-discovery-ink">配信中</Text>
      </View>
      {live.thumbnail_url ? (
        <Image
          source={{ uri: live.thumbnail_url }}
          style={{ width: '100%', height: 160 }}
          className="rounded"
          resizeMode="cover"
        />
      ) : null}
      <Text className="text-body-md text-on-surface leading-snug">{live.title}</Text>
      <Text className="text-label-md text-discovery-ink">
        いま見ている人 {(live.viewer_count ?? 0).toLocaleString()} 人
      </Text>
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
  const [live, setLive] = useState(null)
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
      if (sRes.ok) {
        const body = await sRes.json()
        setStreams(body.streams ?? [])
        setLive(body.live ?? null)
      }
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
        <View className="bg-ai-surface/60 border border-ai-ink/20 rounded-lg px-4 py-3">
          <Text className="text-body text-primary">{message}</Text>
        </View>
      ) : null}

      {!status.connected ? (
        <View className="border border-border border-dashed rounded-lg px-5 py-8 items-center gap-3">
          <Text className="text-body text-on-surface-variant text-center">
            Twitchと繋ぐと、配信の記録がここに並びます。
          </Text>
          <Pressable
            onPress={handleConnect}
            disabled={connecting}
            className="border border-ai-ink/40 rounded-full px-4 py-2 disabled:opacity-50"
          >
            <Text className="text-aux text-primary">
              {connecting ? '接続中...' : 'Twitchと繋ぐ'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="font-strong text-aux text-on-surface-variant mb-0.5">チャンネル</Text>
              <Text className="text-body text-on-surface">{status.display_name || '—'}</Text>
            </View>
            {confirmDisconnect ? (
              <View className="flex-row items-center gap-3">
                <Pressable onPress={() => setConfirmDisconnect(false)}>
                  <Text className="text-aux text-outline">キャンセル</Text>
                </Pressable>
                <Pressable onPress={handleDisconnect} disabled={disconnecting}>
                  <Text className="text-aux text-error">
                    {disconnecting ? '解除中...' : '解除する'}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setConfirmDisconnect(true)}>
                <Text className="text-aux text-outline">連携を解除</Text>
              </Pressable>
            )}
          </View>

          {/* 配信中の帯。**いま起きていることなので上に置く。**
              フォロワー数を上に置かないのとは別の理由 */}
          <LiveNow live={live} />

          {/* 配信の一覧を主、数字を従とする配置。
              フォロワー数は最も外部評価に近い指標のため上に置かない。 */}
          <View>
            <Text className="font-strong text-label-md text-primary mb-1">配信</Text>
            {loading && streams === null ? (
              <View className="gap-3 pt-2">
                {[1, 2, 3].map((i) => (
                  <View key={i} className="h-4 bg-surface-high rounded-full w-4/5" />
                ))}
              </View>
            ) : streams && streams.length > 0 ? (
              <View>
                {streams.map((s) => (
                  <StreamRow key={s.video_id} stream={s} />
                ))}
              </View>
            ) : (
              <Text className="text-body text-outline py-4">まだ配信の記録がありません。</Text>
            )}
          </View>

          {/* **「AIの観察」から「Lanternが見つけたこと」へ**（2026-08-14）。
              実機で「AIという単語に拒否反応があるかもしれない」と指摘された。
              Lantern の AI は**静かな伴走者**であって、
              「AI」という肩書きを名乗る理由がない。
              画面の他の場所（今日の灯り・今週の発見）も「AI」とは書いていない。

              **位置も上げた。** 一覧の下に置いていたので、
              スクロールし切らないと存在に気づけなかった。
              **「見つけた」から「観察した」へ**（2026-08-18）。
              発見は解釈で、AI憲法の③意味づけに踏み込む。
              同じ機能のプロンプトは全編「観察」で通っている
              （`modules/ai.py` の【この観察の指針】）。見出しだけが強かった。 */}
          <View>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="font-strong text-label-md text-primary">Lanternが観察したこと</Text>
              <Pressable
                onPress={handleInsight}
                disabled={insightLoading || !streams?.length}
                className="border border-outline-variant rounded-full px-3.5 min-h-touch justify-center disabled:opacity-50"
              >
                <Text className="text-label-md text-primary">
                  {insightLoading ? '読んでいます...' : insight ? 'もう一度' : '見てもらう'}
                </Text>
              </Pressable>
            </View>

            {insightLoading ? (
              <View className="bg-ai-surface rounded-lg px-5 py-4 gap-2">
                <View className="h-3 bg-ai-ink/15 rounded-full w-full" />
                <View className="h-3 bg-ai-ink/15 rounded-full w-4/5" />
                <View className="h-3 bg-ai-ink/15 rounded-full w-2/3" />
              </View>
            ) : null}

            {!insightLoading && insight ? (
              <View className="bg-ai-surface rounded-lg px-5 py-4">
                <Text className="text-body-md leading-relaxed text-ai-ink">{insight}</Text>
              </View>
            ) : null}
          </View>

          {followerCount != null ? (
            <View className="bg-surface-low/50 rounded-lg px-4 py-4">
              <Text className="text-[10px] text-outline mb-1">フォロワー数</Text>
              <Text className="text-xl text-on-surface">
                {followerCount.toLocaleString()}
              </Text>
            </View>
          ) : null}
        </>
      )}
    </>
  )
}
