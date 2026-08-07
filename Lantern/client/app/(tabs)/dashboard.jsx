import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import YouTubePanel from '../../components/YouTubePanel'
import TwitchPanel from '../../components/TwitchPanel'

// Dashboard はタブの外枠だけを持ち、中身は各パネルに任せる。
// タブの見た目は Journal の記録／振り返りと同じ指定を使い、操作感を揃える。
//
// タブの状態は保持しない。画面を離れたら YouTube から始まる。
// 未連携でもタブは出す。隠すと機能があること自体に気づけないため。
const TABS = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'twitch', label: 'Twitch' },
]

export default function Dashboard() {
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

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pt-6 pb-10 gap-6 w-full max-w-2xl self-center">
        <View>
          <Text className="text-[10px] text-ink-faint tracking-[2px] mb-0.5">DASHBOARD</Text>
          <Text className="font-display text-xl font-light text-ink">ダッシュボード</Text>
        </View>

        <View className="flex-row gap-4 border-b border-border">
          {TABS.map(({ id, label }) => (
            <Pressable
              key={id}
              onPress={() => selectTab(id)}
              className={`px-1 pb-2.5 border-b-2 ${
                activeTab === id ? 'border-accent' : 'border-transparent'
              }`}
            >
              <Text className={`text-sm ${activeTab === id ? 'text-accent' : 'text-ink-faint'}`}>
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
