import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, View } from 'react-native'
import Text from '../../components/Text'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScreenFade } from '../../components/Motion'
import WriteButton from '../../components/WriteButton'
import { attach as attachPhotos } from '../../lib/photoStore'
import { isDayFull } from '../../lib/date'
import { useRouter } from 'expo-router'
import { BOTTOM_GAP, useTabBarInset } from '../../lib/tabBar'
import { authFetch } from '../../lib/supabase'
import { useRefreshOnFocus, usePullToRefresh } from '../../lib/refreshOnFocus'
import { loadLogs } from '../../lib/logsCache'
import AppHeader from '../../components/AppHeader'
import HomeCard from '../../components/HomeCard'
import { greetingFor } from '../../lib/greeting'
import { todayStr } from '../../lib/date'
import { dailySample } from '../../lib/sample'
import WeeklyDiscovery from '../../components/WeeklyDiscovery'
import * as notify from '../../lib/notify'

// **直近の記録を眺める場所（2026-08-12 に新設）。**
//
// 「記録」との違いは、探すか眺めるか。
// ここは検索もカレンダーも持たない。**開いて上から下へ読むだけ。**
//
// **並べるのは日替わりの抜粋**（2026-08-14）。新しい順に並べるだけではない。
// 新しい順だけだと「記録」と同じものが並び、2つある意味が無かった。
// 抜粋にすると、しばらく開いていない記録が自分から出てくる。
//
// **その日のうちは同じ顔ぶれ**（`lib/sample.js`）。
// 開き直すたびに変わると、さっき見た記録が消えたように見える。
//
// **出すのは結果だけ**（`HomeCard`）。やったこと・写真・Lanternの言葉。
// 4項目を全部並べると、読み返す画面ではなく点検する画面になる。
// そのぶん枚数を3枚に絞り、1枚を大きくした。
//
// **上に今日の灯りを置く。**
// デザイン案の Home は「小さなラベル＋大きな一行」で始まる。
// Lantern でそこに当たるのは今日の灯り。
// 2026-08-12 に実機で「今日の灯りカードがない」と指摘された。
//
// **「書く」からは外した。** 同じものを2画面に置くと、
// どちらが本体なのか分からなくなる。
//
// **画面の見出しは時間帯の挨拶**（2026-08-13）。
// 2026-08-12 に一度「入れない」と決めたが、材料を時計だけに限れば
// 評価にならないため入れた。理由は `lib/greeting.js` に書いてある。
// ここに置いたのは、Home だけ見出しが無く、他のタブと形が揃っていなかったため。
const RECENT_LIMIT = 3

export default function Home() {
  const tabInset = useTabBarInset()
  const router = useRouter()
  const [logs, setLogs] = useState([])
  // 置いたアイデアの数。**取れなければ null のまま**（上の註釈）
  const [ideaCount, setIdeaCount] = useState(null)
  const [quote, setQuote] = useState('')
  // 今日の問い。**同じ日は同じ問い**（サーバーが日付から選ぶ）なので、
  // 書く画面が出すものと必ず一致する。渡す必要がない
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  // 読み込みのたびに評価し直す。開きっぱなしで日付が変わる場面までは追わない
  const greeting = greetingFor()
  // 抜粋の種は日付。日が変われば顔ぶれが変わる
  // **今日は抜かす**（2026-09-04・作者の指摘「ホームと書くで今日の
  // 記録が二重に出る」）。
  //
  // `dailySample` は必ず一番新しいものを含めるので、今日書くと
  // **ホームと書くタブに同じカードが並んでいた。**
  //
  // ホームは眺める場所、書くタブは書いた直後の場所。
  // ここを「これまで」に寄せると、役割が言葉どおりに分かれる。
  // 今日のぶんは、この上の**今日の灯り**が受け持っている。
  const past = logs.filter((l) => l.date !== todayStr())
  const shown = dailySample(past, RECENT_LIMIT, todayStr())

  const refresh = useCallback(() => setTick((t) => t + 1), [])
  useRefreshOnFocus(refresh)
  // **引き下げて取り直す**（2026-09-04・作者の指示）
  const { refreshing, onRefresh } = usePullToRefresh(refresh)

  // 読み込み中の表示は**最初の1回だけ。**
  // 戻ってくるたびに全面が読み込み中に戻ると、画面が瞬いて
  // 「開き直された」ように見える。取り直しは静かに済ませる。
  const firstLoad = useRef(true)

  // 置いたアイデアの数を取る（2026-09-09）。
  // **失敗しても黙る。**ホームの他の中身は取れているので、
  // 数が出ないだけにする（`ideaCount` は null のまま）
  useEffect(() => {
    let cancelled = false
    authFetch('/api/ideas')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list = Array.isArray(data) ? data : data && data.ideas
        if (!cancelled && Array.isArray(list)) setIdeaCount(list.length)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (firstLoad.current) setLoading(true)
      try {
        // **記録は控えから先に出す**（`lib/logsCache.js`）。
        // 灯りと問いは日替わりでサーバーが持っているので、そのまま聞く
        const [logsData, quoteRes, questionRes] = await Promise.all([
          // **写真を合流させる**（2026-09-04）。写真は端末の中だけに
          // あり、サーバーは返さない。合流させないと `HomeCard` の
          // 写真の枝に**一度も火が入らない**（`lib/photoStore.js`）
          loadLogs((fresh) => { if (!cancelled) setLogs(attachPhotos(fresh)) }),
          authFetch('/api/daily/quote'),
          authFetch('/api/question'),
        ])
        if (!cancelled) setLogs(attachPhotos(logsData))
        if (quoteRes.ok) {
          const q = await quoteRes.json()
          if (!cancelled) setQuote(q.quote || '')
        }
        if (questionRes.ok) {
          const q = await questionRes.json()
          if (!cancelled) setQuestion(q.question || '')
        }
      } catch (e) {
        console.warn('[Home] 記録の取得に失敗', e)
      } finally {
        firstLoad.current = false
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [tick])

  // 通知の予約を作り直す。**開くたびに。**
  // 1回きりの予約を数日ぶん並べているので（`lib/notifyText.js`）、
  // 補充しないと尽きる。ここでやるのは、今日の記録があるかを
  // 知っているのがこの画面だからで、**書いた日には送らない**ため。
  useEffect(() => {
    if (loading) return
    let cancelled = false
    ;(async () => {
      try {
        const setting = await notify.loadSetting()
        if (cancelled || !setting.enabled) return
        await notify.syncSchedule(setting, logs.some((l) => l.date === todayStr()))
      } catch (e) {
        // 通知が組めなくても画面は動く
        console.warn('[Home] 通知の予約に失敗', e)
      }
    })()
    return () => { cancelled = true }
  }, [loading, logs])

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
          <Text className="font-display text-headline-md text-on-surface">{greeting}</Text>
        </View>

        {/* 今日の灯り。**画面でいちばん強い面にする**（2026-08-14）。
            それまでは左に2pxの線を引くだけで、実機で「地味で気づきにくい」
            と言われた。静かに置くつもりが、**無いのと同じ**になっていた。

            琥珀で塗る。CLAUDE.md の「1画面に灯り色を2箇所以上置かない」は
            守れている — **この画面で琥珀に塗るのはここだけ。**
            今週の発見は灰、Lanternの言葉は砂。3つとも地の色が違う。 */}
        <View>
          <Text className="font-strong text-label-md text-primary mb-2.5">今日の灯り</Text>
          <View className="bg-lantern-glow rounded-lg px-5 py-5 min-h-[88px] justify-center shadow-bloom">
            {loading ? (
              <View className="w-40 h-4 bg-on-lantern/10 rounded-full" />
            ) : (
              <Text className="text-body-lg text-on-lantern leading-relaxed">
                {quote || '今日の記録が、ここに残る。'}
              </Text>
            )}
          </View>
        </View>

        {/* **今日の問い。** 2026-08-20 に「書く」から持ち上げた。
            それまでは記録欄の薄い灰色の文字（プレースホルダ）で、
            **1文字打つと消えていた。** 読み返せず、答えている感覚も残らない。
            50問（`modules/questions/data.py`）はこのアプリでいちばん質の高い
            資産なのに、いちばん弱い出し方をされていた。

            ここに置くと、体験の輪がホームで閉じる。

                今日の灯り → 問い → 書く → 戻る

            それまで4段が3つのタブに散っていて、**輪として設計されているのに
            輪として歩ける道が無かった。**

            地は琥珀にしない。CLAUDE.md の「1画面に灯り色を2箇所以上置かない」
            を守る（この画面の琥珀は今日の灯りだけ）。 */}
        {question ? (
          <View>
            <Text className="font-strong text-label-md text-on-surface-variant mb-2.5">
              今日の問い
            </Text>
            {/* **全画面へ直に行く**（2026-09-03）。
                それまでは「書く」タブへ送っていたが、書く場所が
                全画面に移ったので、そこで**もう一度押させる**ことになる。
                問いも一緒に連れていく（欄のプレースホルダになる）。 */}
            <Pressable
              onPress={() => router.push({ pathname: '/write', params: { question } })}
              accessibilityLabel={`${question} について書く`}
              // **書くタブの問いと同じ姿に**（2026-09-09・Stitch の案）。
              // 同じ役目のものが2つの画面で違って見えていた。
              // 縁は薄く、影で浮かせ、**問いを太く**する
              className="bg-surface-lowest border border-border rounded-lg px-5 py-5 gap-3 shadow-bloom active:opacity-70"
            >
              <Text className="font-strong text-body-lg text-on-surface leading-relaxed">
                {question}
              </Text>
              <Text className="text-label-md text-primary">これについて書く ›</Text>
            </Pressable>
          </View>
        ) : null}

        {/* 溜まっているもの（2026-09-09・Stitch の案 `lantern_1`）。
            **数えるのは「これまで」だけ。**続いた日数や今週の達成は
            出さない——`CLAUDE.md` が禁じている（Streak を煽る演出）。
            ここにあるのは**振り返る入口**であって、発奮させる的ではない。

            アイデアの数は別に取りに行く。**取れなければ数を出さない**
            ——ホームを1つの失敗で止めない。 */}
        {!loading && logs.length > 0 ? (
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => router.push('/journal')}
              accessibilityLabel="これまでの記録を見る"
              className="flex-1 bg-surface-lowest border border-border rounded-lg px-4 py-4 shadow-bloom active:opacity-70"
            >
              <Text className="font-strong text-headline-md text-on-surface">
                {logs.length}
              </Text>
              <Text className="text-label-md text-on-surface-variant mt-1">
                これまでの記録
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/')}
              accessibilityLabel="アイデアを見る"
              className="flex-1 bg-surface-lowest border border-border rounded-lg px-4 py-4 shadow-bloom active:opacity-70"
            >
              <Text className="font-strong text-headline-md text-on-surface">
                {ideaCount == null ? '—' : ideaCount}
              </Text>
              <Text className="text-label-md text-on-surface-variant mt-1">
                置いたアイデア
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* **今週の発見。** 2026-08-14 に「書く」から移した。
            観察は書く前ではなく、眺める場所にある方が読まれる。
            AIは使わない（`WeeklyDiscovery`）。 */}
        {!loading && logs.length > 0 ? <WeeklyDiscovery logs={logs} /> : null}

        {/* **骨組みを出さない**（2026-09-05・作者から「骨組みが見える」）。
            灰色の棒を3本置いていた。**あれが「骨組み」の正体。**

            記録は控えから先に出る（`lib/logsCache.js`）ので、2回目からは
            待ちがほぼ無い。初回だけ何も無い間ができるが、**空いている方が
            嘘の枠より正直。**書く場所（`app/(tabs)/index.jsx`）は
            2026-09-04 に同じ理由で外してある。

            読み込み中は何も出さない——`logs` が空なら下の「まだ記録が
            ありません」に落ちるが、それは**読み終えてから**にする。 */}
        {loading ? null : logs.length === 0 ? (
          <View className="items-center py-16">
            <Text className="text-3xl mb-4 opacity-40 text-on-surface">◇</Text>
            <Text className="text-body-md text-on-surface-variant">まだ記録がありません。</Text>
            <Text className="text-label-md text-outline mt-1.5">「書く」から残せます。</Text>
          </View>
        ) : (
          <View className="gap-4">
            {shown.map((log) => (
              <HomeCard key={log.id || log.date} log={log} />
            ))}
          </View>
        )}

        {/* デザイン案の「Older entries」。
            **行き先は「記録」タブに固定する**（2026-08-14）。
            振り返りを開いたままだと、押しても一覧が出なかった。
            **抜粋なので「これより前」ではない。** 全部を見るなら「記録」へ行く。
            ここに「もっと見る」を置いて延々と伸ばすと、
            探すための画面と役割が重なる。 */}
        {!loading && past.length > RECENT_LIMIT ? (
          <Pressable
            onPress={() => router.navigate('/journal?tab=record')}
            className="self-center border border-border rounded-full px-4 min-h-touch justify-center active:opacity-70"
          >
            <Text className="text-label-md text-primary">すべての記録</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {/* 右下の書くボタン。**ホーム・記録・書くの3つに置く**（作者の指示）。
          ここは問いを取っているので、一緒に連れていける
          （`components/WriteButton.jsx`）。

          **上限に達したら出さない**（2026-09-04・作者の指示で
          「書く」と同じ扱いにした）。押せないボタンを置くくらいなら
          無い方がいい。理由は「書く」タブの紙に書いてある。 */}
      {isDayFull(logs, todayStr()) ? null : <WriteButton question={question} />}
      </ScreenFade>
    </SafeAreaView>
  )
}
