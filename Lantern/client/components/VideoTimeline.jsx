import { useState } from 'react'
import { Image, Linking, Pressable, useWindowDimensions, View } from 'react-native'
import Text from './Text'
import { authFetch } from '../lib/supabase'

// 旧 Web Dashboard.jsx の VideoTimeline を移植したもの。
// 旧 Web は grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 で段組みしていた。
// 一時は1カラム固定にしていたが、広い画面だと縦に長く伸びて見づらいため
// 同じ折り返しを入れ直した。RN に grid が無いので flex-wrap で作る。
const COLUMN_BREAKPOINTS = [
  { minWidth: 1024, columns: 3 },
  { minWidth: 640, columns: 2 },
]

function columnsFor(width) {
  return COLUMN_BREAKPOINTS.find((b) => width >= b.minWidth)?.columns ?? 1
}

const GAP = 16

export default function VideoTimeline({ videos }) {
  const { width } = useWindowDimensions()
  const columns = columnsFor(width)
  // 1枚あたりの幅は実測から出す。calc() は react-native-web でしか通らず、
  // パーセント指定だと gap の分を差し引けないため。
  const [containerWidth, setContainerWidth] = useState(0)
  const itemWidth =
    containerWidth > 0 ? (containerWidth - GAP * (columns - 1)) / columns : undefined
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
    return <Text className="text-body text-outline py-4">まだ動画がありません。</Text>
  }

  return (
    <View
      className="flex-row flex-wrap"
      style={{ gap: GAP }}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {rows.map((v) => {
        const pub = v.published_at
        const year = pub?.slice(0, 4)
        const month = pub ? String(Number(pub.slice(5, 7))) : '-'
        const day = pub ? String(Number(pub.slice(8, 10))) : '-'
        const s = insightState[v.id] ?? {}
        const isDim = v.privacy === 'private' || v.privacy === 'unlisted'
        const watchUrl = `https://www.youtube.com/watch?v=${v.id}`

        return (
          <View key={v.id} style={{ width: itemWidth }}>
            <Text className="text-aux text-outline mb-1.5">{year}/{month}/{day}</Text>

            <Pressable onPress={() => Linking.openURL(watchUrl)}>
              <Image
                source={{ uri: v.thumbnail || `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg` }}
                className="w-full rounded"
                style={{ aspectRatio: 16 / 9 }}
                resizeMode="cover"
                accessibilityLabel={v.title}
              />
              <Text className={`text-body leading-snug mt-1.5 ${isDim ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                {v.title}
              </Text>
            </Pressable>

            <View className="flex-row items-center gap-2 mt-1 flex-wrap">
              <Text className="text-aux text-outline">{v.view_count.toLocaleString()} 回</Text>
              {v.like_count > 0 ? (
                <Text className="text-aux text-outline">♡ {v.like_count.toLocaleString()}</Text>
              ) : null}
              {isDim ? (
                <View className="border border-border rounded-full px-1.5 py-0.5">
                  <Text className="text-[9px] text-outline">
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
                  s.visible ? 'border-primary bg-primary/10' : 'border-border'
                }`}
              >
                <Text className={`text-[10px] ${s.visible ? 'text-primary' : 'text-outline'}`}>
                  {s.loading ? '読んでいます...' : 'Lanternに聞く'}
                </Text>
              </Pressable>
            </View>

            {s.visible && s.text ? (
              <View className="bg-background-info rounded px-3 py-2.5 mt-2">
                <Text className="text-aux leading-relaxed text-text-info">{s.text}</Text>
              </View>
            ) : null}
          </View>
        )
      })}
    </View>
  )
}
