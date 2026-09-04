import { useCallback, useEffect, useState } from 'react'
import { RefreshControl, ScrollView, View } from 'react-native'
import Text from '../../components/Text'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScreenFade } from '../../components/Motion'
import UnderlineTabs from '../../components/UnderlineTabs'
import { BOTTOM_GAP, useTabBarInset } from '../../lib/tabBar'
import { loadLogs } from '../../lib/logsCache'
import { useRefreshOnFocus, usePullToRefresh } from '../../lib/refreshOnFocus'
import { calcStreak } from '../../lib/date'
import AppHeader from '../../components/AppHeader'
import OverviewPanel from '../../components/OverviewPanel'
import YouTubePanel from '../../components/YouTubePanel'
import TwitchPanel from '../../components/TwitchPanel'

// **分析。継続の可視化と、外の世界に届いた形跡。**
//
// 振り返り（言葉を読む）は「記録」のタブにある。
// ここは**全体を俯瞰する**場所。
//
// ## 煽らない
//
// 2026-08-13 に作者が「継続の可視化を煽らずに作る」と決めた。
// **入れないもの**（`REQUIREMENTS.md`「やらないこと」）:
// 進捗バー・炎のアイコン・達成率・他人との比較・総文字数と増減率・
// 気分の分類。
//
// **数字は事実として出すが、良し悪しを添えない。**
// 「記録した日数」「連続日数」は設定から移した。
// 設定は道具の手入れをする場所で、歩みを見る場所ではない。
//
// **年間マップは 2026-08-14 に外した**（`YearMap.jsx` と `lib/yearMap.js` を削除）。
// 記録の有無を1年ぶん並べた格子で、2状態しか持たない作りにしていたが、
// **カレンダーは「記録」タブに1つあれば足りる。**
// 同じものを2か所に置くと、片方だけ直る。
// デザイン案（`4_insight`）もタイルだけで格子を持たない。
//
// 案には「総単語数 +12%」があるが**入れない。**
// 書いた量を成果として測ることになり、増減率は評価そのもの
// （`REQUIREMENTS.md`「やらないこと」）。
//
// タブの状態は保持しない。画面を離れたら「まとめ」から始まる。
// 未連携でもタブは出す。隠すと機能があること自体に気づけないため。
//
// **「まとめ」を先頭に置いた**（2026-08-16）。
// それまでは YouTube から始まり、Twitch を見るには必ずタブを踏んだ。
// 場所が増えるほど「全部を見る」のに手数がかかる作りだった。
//
// 場所を足すときは `lib/platforms.js` の配列と、この TABS の両方。
// まとめの中身は配列だけで増える。
const TABS = [
  { id: 'overview', label: 'まとめ' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'twitch', label: 'Twitch' },
]

export default function Dashboard() {
  // すりガラスのタブバーは内容の上に浮くので、その分だけ下を空ける
  const tabInset = useTabBarInset()
  const [logs, setLogs] = useState([])
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((t) => t + 1), [])
  useRefreshOnFocus(refresh)
  // **引き下げて取り直す**（2026-09-04・作者の指示）
  const { refreshing, onRefresh } = usePullToRefresh(refresh)
  const [activeTab, setActiveTab] = useState('overview')
  // **一度開いたパネルは残す。**
  //
  // 2026-08-07 まで `activeTab === 'youtube' ? <A/> : <B/>` で
  // 出し分けていた。切り替えるたびに片方が破棄され、戻るたびに
  // 連携状態・チャンネル・動画一覧・推移を取り直していた。
  // 外部APIを経由するため数秒かかり、**タブを触るたびに待たされていた。**
  //
  // 開いたものだけ描画し、以後は隠すだけにする。
  // 最初から両方読むと初回が重くなるので、開くまでは作らない。
  const [opened, setOpened] = useState({ overview: true, youtube: false, twitch: false })

  function selectTab(id) {
    setActiveTab(id)
    setOpened((o) => (o[id] ? o : { ...o, [id]: true }))
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // **控えを先に出し、新しいものが来たら差し替える**（`lib/logsCache.js`）
        const data = await loadLogs((fresh) => { if (!cancelled) setLogs(fresh) })
        if (!cancelled) setLogs(data)
      } catch (e) {
        console.warn('[分析] 記録の取得に失敗', e)
      }
    })()
    return () => { cancelled = true }
  }, [tick])


  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScreenFade>
      <AppHeader />
      <ScrollView
        contentContainerClassName="px-5 pt-6 gap-6 w-full max-w-read self-center"
        contentContainerStyle={{ paddingBottom: tabInset + BOTTOM_GAP }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View>
          <Text className="font-display text-headline-md text-on-surface">分析</Text>
          {/* 案の "Recent writing habits." に当たる一文。
              **「振り返り」とは書かない。** それは「記録」タブの名前で、
              ここは俯瞰する場所。

              **「歩み」を使わない**（2026-08-18）。禁止ワードの
              「一歩」「前進」と同じ比喩で、記録を進み具合として
              評価する枠になる。起きた事だけを言う。 */}
          <Text className="text-body-md text-on-surface-variant mt-1">
            記録が残った日と、外に出したもの。
          </Text>
        </View>

        {/* 継続の可視化。**数字を並べるが、良し悪しを添えない。**
            「今月は先月より少ない」と読める並べ方をしない。

            **「続いている日」から言い換えた**（2026-08-18）。
            現在進行の言い方は「まだ続いている＝切らすな」と読める。
            起きた事実として過去形で置く。数字は同じ。 */}
        <View className="flex-row gap-4">
          <Stat label="記録した日" value={logs.length} unit="日" />
          <Stat label="続けて記録した日" value={calcStreak(logs)} unit="日" />
        </View>

        {/* 外の世界に届いた形跡。
            **フォロワー数は最も外部評価に近い指標なので上に置かない。** */}
        <UnderlineTabs tabs={TABS} value={activeTab} onChange={selectTab} />

        {/* display:'none' で隠す。unmount しないので状態と取得結果が残る */}
        {opened.overview ? (
          <View style={activeTab === 'overview' ? undefined : { display: 'none' }}>
            <OverviewPanel onOpen={selectTab} />
          </View>
        ) : null}
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
      </ScreenFade>
    </SafeAreaView>
  )
}

// 数字をそのまま置くだけ。
// **増減の矢印も、色による良し悪しも付けない。**
// 付けた瞬間、記録が達成すべき数字になる。
function Stat({ label, value, unit }) {
  return (
    <View className="flex-1 bg-surface-lowest rounded-lg px-4 py-5 items-center shadow-bloom">
      <Text className="font-label text-label-md text-outline mb-2">{label}</Text>
      <View className="flex-row items-baseline gap-1">
        <Text className="font-strong text-headline-lg text-on-surface">{value}</Text>
        <Text className="text-body-md text-on-surface-variant">{unit}</Text>
      </View>
    </View>
  )
}
