import { useEffect, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import Text from '../../components/Text'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BOTTOM_GAP, useTabBarInset } from '../../lib/tabBar'
import { authFetch } from '../../lib/supabase'
import ReviewSection from '../../components/ReviewSection'
import TimelineSection from '../../components/TimelineSection'
import KeywordSection from '../../components/KeywordSection'
import YouTubePanel from '../../components/YouTubePanel'
import TwitchPanel from '../../components/TwitchPanel'

// **「過去を見る場所」をここに集めた（2026-08-12）。**
//
// それまで振り返りは「記録」の中のタブにあり、外部連携は独立タブだった。
// **「記録」と「振り返り」は名前が近く、どちらに何があるのか分からない。**
// 内から見た自分（振り返り）と外に届いた形跡（YouTube / Twitch）は
// どちらも「過ぎたことを眺める」ことなので、1つにまとめた。
//
// 振り返りを上、外部連携を下に置く。**記録が主で、数字は従。**
//
// 中身と制約は変えていない。AIは①事実の提示と②差分の提示までで、
// ③意味づけはしない（CLAUDE.md「Insights AI憲法」）。
//
// タブの状態は保持しない。画面を離れたら YouTube から始まる。
// 未連携でもタブは出す。隠すと機能があること自体に気づけないため。
const TABS = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'twitch', label: 'Twitch' },
]

export default function Dashboard() {
  // すりガラスのタブバーは内容の上に浮くので、その分だけ下を空ける
  const tabInset = useTabBarInset()
  const [logs, setLogs] = useState([])
  const [activeTab, setActiveTab] = useState('youtube')
  // **一度開いたパネルは残す。**
  //
  // 2026-08-07 まで `activeTab === 'youtube' ? <A/> : <B/>` で
  // 出し分けていた。切り替えるたびに片方が破棄され、戻るたびに
  // 連携状態・チャンネル・動画一覧・推移を取り直していた。
  // 外部APIを経由するため数秒かかり、**タブを触るたびに待たされていた。**
  //
  // 開いたものだけ描画し、以後は隠すだけにする。
  // 最初から両方読むと初回が重くなるので、開くまでは作らない。
  const [opened, setOpened] = useState({ youtube: true, twitch: false })

  function selectTab(id) {
    setActiveTab(id)
    setOpened((o) => (o[id] ? o : { ...o, [id]: true }))
  }

  // 過去との対話が記録を要る。取れなければ空のまま出す。
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await authFetch('/api/logs')
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setLogs(data)
      } catch (e) {
        console.warn('[Dashboard] 記録の取得に失敗', e)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pt-6 gap-6 w-full max-w-read self-center" contentContainerStyle={{ paddingBottom: tabInset + BOTTOM_GAP }}>
        <View>
          <Text className="font-display text-headline-md text-ink">ダッシュボード</Text>
        </View>

        {/* 振り返り。**記録が主なので上に置く。** */}
        <View className="gap-8">
          <ReviewSection title="今週の振り返り" type="weekly" description="過去7日間の活動から" />
          <ReviewSection title="今月の振り返り" type="monthly" description="今月の活動から" />
          <TimelineSection logs={logs} />
          <KeywordSection />
        </View>

        {/* 外部連携。**フォロワー数は最も外部評価に近い指標なので上に置かない。** */}
        <View className="flex-row gap-4 border-b border-border">
          {TABS.map(({ id, label }) => (
            <Pressable
              key={id}
              onPress={() => selectTab(id)}
              className={`px-1 pb-2.5 border-b-2 ${
                activeTab === id ? 'border-accent' : 'border-transparent'
              }`}
            >
              <Text className={`text-body ${activeTab === id ? 'text-accent' : 'text-ink-faint'}`}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* display:'none' で隠す。unmount しないので状態と取得結果が残る */}
        {opened.youtube ? (
          <View style={activeTab === 'youtube' ? undefined : { display: 'none' }}>
            <YouTubePanel />
          </View>
        ) : null}
        {opened.twitch ? (
          <View style={activeTab === 'twitch' ? undefined : { display: 'none' }}>
            <TwitchPanel />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}
