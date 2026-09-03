import { useCallback, useEffect, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import Text from '../../components/Text'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScreenFade } from '../../components/Motion'
import { BOTTOM_GAP, useTabBarInset } from '../../lib/tabBar'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { authFetch } from '../../lib/supabase'
import { loadLogs } from '../../lib/logsCache'
import {
  MAX_RECORDS_PER_DAY,
  calcStreak,
  latestLogOf,
  logsOfDay,
  todayStr,
} from '../../lib/date'
import AppHeader from '../../components/AppHeader'
import WriteTabs from '../../components/WriteTabs'
import LightCard from '../../components/LightCard'
import HintPanel from '../../components/HintPanel'
import { useKeyboardHeight } from '../../lib/keyboard'
import { useRefreshOnFocus } from '../../lib/refreshOnFocus'

// キーボードが出ているとき、下に余分に空ける高さ。
//
// **書く欄はもうここに無い**（2026-09-03）。全画面へ移した
// （`app/write.jsx`）。ここでキーボードが出るのは、手がかりの問いに
// 答えるときだけ（`components/HintCard.jsx`）。
//
// これは `ScrollView` の下余白なので、**空けすぎても画面は壊れない。**
// 余るぶんはただの余白で、足りないと書いている字が見えない。
// **足りないほうが悪い**ので、多めに取る。
const KEYBOARD_GAP = 200
import MilestoneBanner from '../../components/MilestoneBanner'
import IdeasPanel from '../../components/IdeasPanel'
import Paywall from '../../components/Paywall'
import { paywallMessage } from '../../lib/plan'

// 右下のボタンに置く鉛筆。**絵文字は使わない**ので図形で描く
// （`components/RecordForm.jsx` の暦と同じ理由）
function PencilIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 20h4L19.5 8.5a2.1 2.1 0 00-3-3L5 17v3z"
        stroke="#1D1D1F"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

const WEEKDAYS_JA = ['日','月','火','水','木','金','土']

function formatDateJa(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAYS_JA[date.getDay()]}曜日`
}

function dateDisplayJa(dateStr) {
  const [, m, d] = dateStr.split('-')
  return `${Number(m)}月${Number(d)}日`
}

export default function Home() {
  // すりガラスのタブバーは内容の上に浮くので、その分だけ下を空ける
  const tabInset = useTabBarInset()
  // キーボードに隠れないよう、出ている高さを測る
  const keyboardHeight = useKeyboardHeight()
  const params = useLocalSearchParams()
  const router = useRouter()
  const [question, setQuestion] = useState('')
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshTick, setRefreshTick] = useState(0)
  // アイデアは 2026-08-08 に「記録」から移した。
  // 思いついた瞬間に置くものなので、書く場所にある方が自然。
  // 「記録」は残したものを見る場所であって、置く場所ではなかった。
  const [writeTab, setWriteTab] = useState('record')
  // 手がかりの枠を使い切ったときだけ出す（`components/HintPanel.jsx`）
  const [hintPaywall, setHintPaywall] = useState('')

  const now = new Date()
  const dateJa = formatDateJa(now)

  const dateParam = typeof params.date === 'string' ? params.date : null
  const targetDate = dateParam && dateParam <= todayStr() ? dateParam : todayStr()
  const isEditingPast = targetDate !== todayStr()

  const refreshData = useCallback(() => setRefreshTick((t) => t + 1), [])

  // **全画面から戻ったら取り直す**（2026-09-03）。
  // 書いたのは別の画面（`app/write.jsx`）なので、ここの `useEffect` は
  // 走らない。取り直さないと、書いたのに入口が何も変わらない
  // （灯りも手がかりも、その日の記録があることも）。
  useRefreshOnFocus(refreshData)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      setLoading(true)
      try {
        // **記録は控えから先に出す**（`lib/logsCache.js`）
        const [logsData, questionRes] = await Promise.all([
          loadLogs((fresh) => { if (!cancelled) setLogs(fresh) }),
          authFetch('/api/question'),
        ])
        if (!cancelled) setLogs(logsData)
        if (questionRes.ok) {
          const questionData = await questionRes.json()
          if (!cancelled) setQuestion(questionData.question || '')
        }
      } catch (e) {
        // 取得できなければ空のまま表示する
        console.warn('[書く] 記録・問いの取得に失敗', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [refreshTick])

  // **この紙はいつでも白紙**（2026-09-03・作者の判断）。
  //
  // 前日までは、その日の最後の記録を紙に載せて開いていた。
  // 書き足しにも書き直しにも見えるので、**別のことを書くと前のが消えた。**
  // 時刻の帯で選び直せるようにしてみたが、作者に「帯はいらない」と言われた。
  // 帯は、白紙で開かないことの埋め合わせでしかなかった。
  //
  // 白紙で開き、保存は必ず新しい記録として入る（`app/write.jsx`）。
  // **直すのは「記録」タブ**（`components/LogDetail.jsx`）。
  // 書く場所と直す場所を分けると、どちらも一つのことだけをする。
  const dayLogs = logsOfDay(logs, targetDate)
  const latestLog = latestLogOf(logs, targetDate)
  const full = dayLogs.length >= MAX_RECORDS_PER_DAY

  const [ty, tm, td] = targetDate.split('-')
  const dateLabel = `${ty}年${Number(tm)}月${Number(td)}日`

  const streak = calcStreak(logs)

  // 全画面を開く。**紙からも右下のボタンからも同じところへ行く**
  function openWrite() {
    router.push({ pathname: '/write', params: { date: targetDate, question } })
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <ScreenFade>
      <AppHeader />
      {/* **キーボードのぶんだけ下を空ける**（2026-08-17）。
          それまで避けが1つも無く、「よかったこと」「困ったこと」を開くと
          欄がキーボードの下に入って見えなかった。

          **書く欄はもうここに無い**（2026-09-03）。全画面へ移した。
          いま出るのは手がかりの問いに答えるときだけだが、
          そのときも同じ理由で下が要る。 */}
      <ScrollView
        contentContainerClassName="px-5 pt-6 gap-8 w-full max-w-read self-center"
        contentContainerStyle={{
          paddingBottom:
            tabInset + BOTTOM_GAP + (keyboardHeight > 0 ? KEYBOARD_GAP : 0),
        }}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* 日付ヘッダー。
            2026-08-09 まで「8 AUG」を上に重ねていた。
            すぐ下に「2026年8月8日 土曜日」があるので、**同じことを
            2回書いていた**。英字を上に置くと様になって見えるが、
            読む人に何も足していない。 */}
        <View>
          <View className="flex-row items-baseline">
            <Text className="font-display text-headline-md text-ink">{dateJa}</Text>
            {streak >= 2 ? (
              <Text className="text-label-md text-outline ml-2">· {streak}日目</Text>
            ) : null}
          </View>
        </View>

        <MilestoneBanner />

        {/* 記録とアイデアの切り替え。
            今日の灯りは 2026-08-12 に「ホーム」へ移した。ここには無い。
            過去日の編集中は出さない（アイデアは日付を持たないため）。
            形と動きの由来は `components/WriteTabs.jsx` に書いてある。 */}
        {!isEditingPast ? <WriteTabs value={writeTab} onChange={setWriteTab} /> : null}

        {/* **ここは入口になった**（2026-09-03・作者の判断）。
            書くのは全画面（`app/write.jsx`）。ここに残るのは、
            開く紙と、**書いたあとに読むもの**——灯りと手がかり。 */}
        <View
          className="gap-4"
          style={writeTab === 'record' || isEditingPast ? undefined : { display: 'none' }}
        >
          {isEditingPast ? (
            <View className="flex-row items-center justify-between">
              <Text className="text-label-md text-outline">
                {dateDisplayJa(targetDate)}の記録
              </Text>
              <Text onPress={() => router.replace('/')} className="text-label-md text-primary">
                ← 今日に戻る
              </Text>
            </View>
          ) : null}

          {/* **押すと全画面が開く紙。**
              見た目は書く紙のまま（日付の行と問い）にしてある。
              「入口」と分かる別の飾りを足すと、押す前に一段考えることになる。

              上限に達していたら開かない。書き終えてから 409 で断るより、
              **押せないことが先に分かる**方がよい。 */}
          {full ? (
            <View className="bg-surface-lowest rounded-lg px-5 py-5 gap-3 shadow-bloom opacity-60">
              <Text className="font-label text-label-md text-on-surface-variant">{dateLabel}</Text>
              <Text className="text-body-md text-outline leading-relaxed">
                この日の記録はここまでです。直すときは「記録」から。
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={openWrite}
              accessibilityLabel="記録を書く"
              className="bg-surface-lowest rounded-lg px-5 py-5 gap-3 shadow-bloom active:opacity-80"
            >
              <Text className="font-label text-label-md text-on-surface-variant">{dateLabel}</Text>
              <Text className="text-body-md text-outline leading-relaxed">
                {question && !isEditingPast
                  ? question
                  : `${isEditingPast ? 'この日' : '今日'}どんなことをしましたか。`}
              </Text>
              {/* **すでに記録があることだけ伝える**（2026-09-03）。
                  数は書かない（`REQUIREMENTS.md` F1「書く前に数を
                  意識させない」）。伝えたいのは件数ではなく、
                  **ここに書いても前のは消えない**ということ */}
              {dayLogs.length > 0 ? (
                <Text className="text-label-md text-outline">
                  書くと、別の記録として残ります。
                </Text>
              ) : null}
            </Pressable>
          )}

          {/* 灯り。**保存の十数秒あとに届く**（`components/LightCard.jsx`）。
              書いている画面はもう閉じているので、受け取るのはここ */}
          <LightCard date={targetDate} />

          {/* 手がかり。**書いたあとにだけ探せる。**
              探す先はその日のいちばん新しい記録（`components/HintPanel.jsx`） */}
          <HintPanel
            date={targetDate}
            target={latestLog}
            onSaved={refreshData}
            onPaywall={(message) => setHintPaywall(message || paywallMessage(null))}
          />

          {/* 手がかりの枠を使い切ったとき。**手がかりの外に出す。**
              読む場所に売り物を混ぜない（`components/HintPanel.jsx`） */}
          {hintPaywall ? (
            <Paywall
              title="Lantern Plus"
              message={hintPaywall}
              onClose={() => setHintPaywall('')}
              onPurchased={() => setHintPaywall('')}
            />
          ) : null}
        </View>

        {/* アイデア。display で隠すだけにして、入力途中の文字を消さない */}
        <View style={writeTab === 'ideas' && !isEditingPast ? undefined : { display: 'none' }}>
          <IdeasPanel />
        </View>

      </ScrollView>

      {/* **右下の書くボタン**（2026-09-03・作者の指示）。
          入口の紙は押せるが、**紙に見えるので押せると分からない。**
          押す場所がはっきりしているものを、いつもの位置に置く。

          - 流れない。紙は下へ送れば見えなくなるが、これは残る
          - **タブバーの上**。すりガラスのタブバーは内容の上に浮くので、
            その高さぶん持ち上げないと下半分が隠れる（`lib/tabBar.js`）
          - 上限に達したら出さない。押せないボタンを置くくらいなら、
            無い方がいい。理由は紙の側に書いてある
          - アイデアを書いているときも出さない。行き先が違う */}
      {!full && writeTab === 'record' ? (
        <Pressable
          onPress={openWrite}
          accessibilityLabel="記録を書く"
          style={{ position: 'absolute', right: 20, bottom: tabInset + 16 }}
          className="flex-row items-center gap-2 bg-lantern-glow rounded-full px-5 min-h-touch justify-center shadow-bloom active:opacity-80"
        >
          <PencilIcon />
          <Text className="font-strong text-label-md text-on-lantern">書く</Text>
        </Pressable>
      ) : null}
      </ScreenFade>
    </SafeAreaView>
  )
}
