import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import Text from '../../components/Text'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScreenFade } from '../../components/Motion'
import { BOTTOM_GAP, useTabBarInset } from '../../lib/tabBar'
import { useRouter } from 'expo-router'
import { authFetch } from '../../lib/supabase'
import { loadLogs } from '../../lib/logsCache'
import { MAX_RECORDS_PER_DAY, calcStreak, isDayFull, logsOfDay, todayStr } from '../../lib/date'
import AppHeader from '../../components/AppHeader'
import WriteTabs from '../../components/WriteTabs'
import HomeCard from '../../components/HomeCard'
import HintPanel from '../../components/HintPanel'
import WriteButton from '../../components/WriteButton'
import { useKeyboardHeight } from '../../lib/keyboard'
import { useRefreshOnFocus } from '../../lib/refreshOnFocus'
import { attach as attachPhotos } from '../../lib/photoStore'
import { isLighting, subscribeLight, getLight, lightNote } from '../../lib/lightBuffer'

// キーボードが出ているとき、**測った高さに足す**ぶん。
//
// **書く欄はもうここに無い**（2026-09-03）。全画面へ移した
// （`app/write.jsx`）。ここでキーボードが出るのは、手がかりの問いに
// 答えるときだけ（`components/HintCard.jsx`）。
//
// 高さそのものは `useKeyboardHeight` で測る。
// `automaticallyAdjustKeyboardInsets` には任せない——
// **この repo では効かない**（2026-08-17。`lib/keyboard.js` の由来）。
//
// これは `ScrollView` の下余白なので、**空けすぎても画面は壊れない。**
// 余るぶんはただの余白で、足りないと書いている字が見えない。
// **足りないほうが悪い**ので、多めに取る。
const KEYBOARD_GAP = 120
import MilestoneBanner from '../../components/MilestoneBanner'
import IdeasPanel from '../../components/IdeasPanel'
import Paywall from '../../components/Paywall'
import { paywallMessage } from '../../lib/plan'

const WEEKDAYS_JA = ['日','月','火','水','木','金','土']

function formatDateJa(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAYS_JA[date.getDay()]}曜日`
}

export default function Home() {
  // すりガラスのタブバーは内容の上に浮くので、その分だけ下を空ける
  const tabInset = useTabBarInset()
  // キーボードに隠れないよう、出ている高さを測る
  const keyboardHeight = useKeyboardHeight()
  const router = useRouter()
  const [question, setQuestion] = useState('')
  const [logs, setLogs] = useState([])
  const [refreshTick, setRefreshTick] = useState(0)
  // アイデアは 2026-08-08 に「記録」から移した。
  // 思いついた瞬間に置くものなので、書く場所にある方が自然。
  // 「記録」は残したものを見る場所であって、置く場所ではなかった。
  const [writeTab, setWriteTab] = useState('record')
  // 手がかりの枠を使い切ったときだけ出す（`components/HintPanel.jsx`）
  const [hintPaywall, setHintPaywall] = useState('')

  const dateJa = formatDateJa(new Date())

  // **ここは今日だけを扱う**（2026-09-04）。
  //
  // `?date=` を読んで過去の日も書けるようにしてあったが、
  // **そこへ遷移する場所がどこにも無くなっていた。**
  // 過去の日を書くのは記録タブの窓で、書く場所そのものは
  // 全画面（`app/write.jsx`）が `?date=` を受け取る。
  // 使われない分岐を5か所に残しておくと、次に触る人が
  // 「過去の日にも来る画面だ」と思って設計を歪める。
  const targetDate = todayStr()

  const refreshData = useCallback(() => setRefreshTick((t) => t + 1), [])

  // **全画面から戻ったら取り直す**（2026-09-03）。
  // 書いたのは別の画面（`app/write.jsx`）なので、ここの `useEffect` は
  // 走らない。取り直さないと、書いたのに入口が何も変わらない
  // （灯りも手がかりも、その日の記録があることも）。
  useRefreshOnFocus(refreshData)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
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
  // **数えるのは本物の記録だけ。**上限（`MAX_RECORDS_PER_DAY`）は
  // サーバーが行の数で見ているので、下の写真だけの日を混ぜない
  const dayLogs = logsOfDay(logs, targetDate)
  const full = isDayFull(logs, targetDate)

  const streak = calcStreak(logs)

  // **灯りを待っているか。**受け皿を見る（`lib/lightBuffer.js`）。
  //
  // 届いたら記録を取り直す。灯りは記録の一部として保存されるので、
  // **取り直せばカードに載る。**取り直さないと、待っている字が
  // 消えるだけで返事が出てこない。
  const [lighting, setLighting] = useState(() => isLighting(targetDate))
  // 灯りが来なかった理由。**待ち続けさせない**（`lib/lightBuffer.js`）
  const [note, setNote] = useState(() => lightNote(targetDate))
  useEffect(() => {
    let had = Boolean(getLight(targetDate))
    function sync() {
      setLighting(isLighting(targetDate))
      setNote(lightNote(targetDate))
      const now = Boolean(getLight(targetDate))
      if (now && !had) refreshData()
      had = now
    }
    sync()
    return subscribeLight(sync)
  }, [targetDate, refreshData])

  // **写真を合流させてから並べる**（2026-09-04・作者への報告どおり）。
  //
  // 写真は端末の中だけにあり、サーバーは返さない。合流させないと
  // `HomeCard` の写真の枝に**一度も火が入らない。**
  // 呼んでいたのは記録タブだけで、ホームとここは落ちていた。
  //
  // `attach` は写真だけの日に**`id` を持たない記録**も作る。
  // 出すのは構わない（写真だけでも記録）が、手がかりは付けられない
  // （下の `footer` を参照）。
  //
  // **新しい順。**書いた直後のものが一番上に来る。
  const cards = useMemo(
    () => [...logsOfDay(attachPhotos(logs), targetDate)].reverse(),
    [logs, targetDate],
  )

  function timeLabel(l) {
    if (!l.saved_at) return '記録'
    const t = new Date(l.saved_at)
    return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
  }

  // 全画面を開く。**紙からも右下のボタンからも同じところへ行く**
  function openWrite() {
    router.push({ pathname: '/write', params: { date: targetDate, question } })
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
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
            tabInset + BOTTOM_GAP + (keyboardHeight > 0 ? keyboardHeight + KEYBOARD_GAP : 0),
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
            <Text className="font-display text-headline-md text-on-surface">{dateJa}</Text>
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
        <WriteTabs value={writeTab} onChange={setWriteTab} />

        {/* **ここは入口になった**（2026-09-03・作者の判断）。
            書くのは全画面（`app/write.jsx`）。ここに残るのは、
            開く紙と、**書いたあとに読むもの**——灯りと手がかり。 */}
        <View
          className="gap-4"
          style={writeTab === 'record' ? undefined : { display: 'none' }}
        >
          {/* **押すと全画面が開く紙。**
              見た目は書く紙のまま（問いだけ）にしてある。
              「入口」と分かる別の飾りを足すと、押す前に一段考えることになる。

              **日付は書かない**（2026-09-03）。すぐ上の見出しに
              「2026年9月4日 木曜日」がある。**同じことを2回書かない**——
              2026-08-09 に「8 AUG」を外したのと同じ判断。
              ここに置くのは問いだけ。書き始める場所に、書き始める手がかりを置く。

              上限に達していたら開かない。書き終えてから 409 で断るより、
              **押せないことが先に分かる**方がよい。 */}
          {full ? (
            <View className="bg-surface-lowest rounded-lg px-5 py-5 shadow-bloom opacity-60">
              <Text className="text-body-md text-outline leading-relaxed">
                この日の記録はここまでです。直すときは「記録」から。
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={openWrite}
              accessibilityLabel="記録を書く"
              // **他のカードと違う姿にする**（2026-09-04・作者の指示
              //「新しいカードは分かりやすくタップしやすいように」）。
              //
              // 下に今日の記録が同じ形のカードで並ぶので、**同じ姿だと
              // 一枚目の記録に見える。**押すものだけ縁を灯り色にして、
              // 地も薄く敷く。記録のカードは無地の面のまま。
              className="bg-lantern-glow/5 border border-lantern-glow rounded-lg px-5 py-5 gap-3 active:opacity-80"
            >
              <Text className="text-body-md text-outline leading-relaxed">
                {question || '今日どんなことをしましたか。'}
              </Text>
              {/* **「書くと、別の記録として残ります」は置かない**
                  （2026-09-04・作者の指示で削除）。
                  下に今日の記録がカードで並ぶようになったので、
                  **増えることは見れば分かる。**字で言う必要がなくなった。 */}
              {/* **押せることを字で言う**（2026-09-04・作者の指示
                  「タップしやすいようにユーザーに認識させる工夫が必要」）。

                  紙の見た目は紙なので、影が付いていても**押すものには
                  見えない。**ホームの問いのカードと同じ形にする
                  （`app/(tabs)/home.jsx` の「これについて書く ›」）。
                  山括弧は「この先がある」の記号で、灯り色の字と合わせて
                  ここだけが押せる場所だと分かる。 */}
              <Text className="text-label-md text-primary">書きはじめる ›</Text>
            </Pressable>
          )}

          {/* **今日の記録**（2026-09-04・作者の指示「当日分の記録は
              書くタブ内にもカードとして表示する」）。

              **新しい順。**書いた直後のものが一番上に来る。
              日付ではなく時刻を出す——同じ日が並ぶので「今日」を
              3枚重ねても見分けがつかない。

              灯りはカードの中に出る（`components/HomeCard.jsx`）。
              まだ届いていない一番新しい記録には、息をする字が出る。 */}
          {cards.length > 0 ? (
            <View className="gap-4">
              <Text className="font-strong text-label-md text-on-surface-variant">
                今日の記録
              </Text>
              {cards.map((l, i) => (
                <HomeCard
                  key={l.id || `${l.date}-${i}`}
                  log={l}
                  label={timeLabel(l)}
                  lighting={i === 0 && lighting}
                  note={i === 0 ? note : ''}
                  // **手がかりはカードの中に置く**（2026-09-04・作者の指摘
                  // 「どのカードを対象にしているのだろうか？明確にしましょう」）。
                  //
                  // 一覧の下に1つ置いていたが、**どの記録から探すのかが
                  // 画面のどこにも書いていなかった。**中に置けば、
                  // 押したボタンが載っているカードがそのまま相手になる。
                  //
                  // **写真だけの日には出さない**（2026-09-04）。
                  // `attach` が作る札は `id` を持たないので、探す先も
                  // 答えを書く先も決まらない。押せるのに何も残らない
                  // ボタンを置かない。
                  footer={
                    l.id ? (
                      <HintPanel
                        date={targetDate}
                        target={l}
                        onSaved={refreshData}
                        onPaywall={(m) => setHintPaywall(m || paywallMessage(null))}
                      />
                    ) : null
                  }
                />
              ))}
            </View>
          ) : null}

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
        <View style={writeTab === 'ideas' ? undefined : { display: 'none' }}>
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
          - アイデアを書いているときも出さない。行き先が違う
          - **記号だけ**（作者の指示）。「書く」の字は置かない

          形と置き場所は `components/WriteButton.jsx`。
          ホーム・記録にも同じものを置いてある（作者の指示） */}
      {!full && writeTab === 'record' ? (
        <WriteButton date={targetDate} question={question} />
      ) : null}
      </ScreenFade>
    </SafeAreaView>
  )
}
