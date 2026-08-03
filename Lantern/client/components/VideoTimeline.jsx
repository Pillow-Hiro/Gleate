import { useState } from 'react'
import { Image, Linking, Pressable, Text, View } from 'react-native'
import { authFetch } from '../lib/supabase'

// Web版 Dashboard.jsx の VideoTimeline を移植したもの。
// Web版は画面幅に応じて1〜3カラムだったが、モバイルでは1カラム固定にする。
export default function VideoTimeline({ videos }) {
  // 古い順に並べる（Web版と同じ）
  const rows = [...(videos ?? [])].reverse()
  const [insightState, setInsightState] = useState({})

  async function handleAsk(video) {
    const id = video.id
    const current = insightState[id]
    if (current?.text != null) {
      setInsightState((prev) => ({ ...prev, [id]: { ...prev[id], visible: !prev[id].visible } }))
      return
    }
    setInsightState((prev) => ({ ...prev, [id]: { loading: true, text: null, visible: false } }))
    try {
      const res = await authFetch('/api/youtube/video-insight', {
        method: 'POST',
        body: JSON.stringify({
          video_id: video.id,
          title: video.title,
          published_at: video.published_at,
          view_count: video.view_count,
          like_count: video.like_count,
        }),
      })
      const data = await res.json()
      setInsightState((prev) => ({
        ...prev,
        [id]: { loading: false, text: data.insight ?? '', visible: true },
      }))
    } catch (e) {
      console.warn('[Dashboard] 動画の観察の取得に失敗', e)
      setInsightState((prev) => ({ ...prev, [id]: { loading: false, text: null, visible: false } }))
    }
  }

  if (rows.length === 0) {
    return <Text className="text-sm text-ink-faint py-4">まだ動画がありません。</Text>
  }

  return (
    <View className="gap-6">
      {rows.map((v) => {
        const pub = v.published_at
        const year = pub?.slice(0, 4)
        const month = pub ? String(Number(pub.slice(5, 7))) : '-'
        const day = pub ? String(Number(pub.slice(8, 10))) : '-'
        const s = insightState[v.id] ?? {}
        const isDim = v.privacy === 'private' || v.privacy === 'unlisted'
        const watchUrl = `https://www.youtube.com/watch?v=${v.id}`

        return (
          <View key={v.id}>
            <Text className="text-xs text-ink-faint mb-1.5">{year}/{month}/{day}</Text>

            <Pressable onPress={() => Linking.openURL(watchUrl)}>
              <Image
                source={{ uri: v.thumbnail || `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg` }}
                className="w-full rounded-lg"
                style={{ aspectRatio: 16 / 9 }}
                resizeMode="cover"
                accessibilityLabel={v.title}
              />
              <Text className={`text-sm leading-snug mt-1.5 ${isDim ? 'text-ink-soft' : 'text-ink'}`}>
                {v.title}
              </Text>
            </Pressable>

            <View className="flex-row items-center gap-2 mt-1 flex-wrap">
              <Text className="text-xs text-ink-faint">{v.view_count.toLocaleString()} 回</Text>
              {v.like_count > 0 ? (
                <Text className="text-xs text-ink-faint">♡ {v.like_count.toLocaleString()}</Text>
              ) : null}
              {isDim ? (
                <View className="border border-border rounded-full px-1.5 py-0.5">
                  <Text className="text-[9px] text-ink-faint">
                    {v.privacy === 'private' ? '非公開' : '限定公開'}
                  </Text>
                </View>
              ) : null}
            </View>

            <View className="mt-2 flex-row">
              <Pressable
                onPress={() => handleAsk(v)}
                disabled={s.loading}
                className={`border rounded-full px-2.5 py-1 disabled:opacity-50 ${
                  s.visible ? 'border-accent bg-accent/10' : 'border-border'
                }`}
              >
                <Text className={`text-[10px] ${s.visible ? 'text-accent' : 'text-ink-faint'}`}>
                  {s.loading ? '生成中' : 'Lanternに聞く'}
                </Text>
              </Pressable>
            </View>

            {s.visible && s.text ? (
              <View className="bg-background-info rounded-lg px-3 py-2.5 mt-2">
                <Text className="text-xs leading-relaxed text-text-info">{s.text}</Text>
              </View>
            ) : null}
          </View>
        )
      })}
    </View>
  )
}
