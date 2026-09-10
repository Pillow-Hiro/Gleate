import { useCallback, useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, Switch, View } from 'react-native'
import Text from '../../components/Text'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScreenFade } from '../../components/Motion'
import { useRefreshOnFocus } from '../../lib/refreshOnFocus'
import { BOTTOM_GAP, useTabBarInset } from '../../lib/tabBar'
import { supabase, authFetch } from '../../lib/supabase'
import { forgetLogs, loadLogs } from '../../lib/logsCache'
import { forgetAllLights } from '../../lib/lightBuffer'
import { forgetAll as forgetLinks } from '../../lib/linkStore'
import { forgetAll as forgetSuggests } from '../../lib/suggestStore'
import { exportLogs } from '../../lib/exportLogs'
import { useThemeContext } from '../../lib/theme'
import { THEME_LABELS, THEME_MODES } from '../../lib/themeMode'
import { APP_VERSION } from '../../constants'
import { buildStamp } from '../../lib/buildStamp'
import * as notify from '../../lib/notify'
import AppHeader from '../../components/AppHeader'
import TimeDial from '../../components/TimeDial'
import AccountMark from '../../components/AccountMark'
import { timeLabel } from '../../lib/notifyText'
import { todayStr } from '../../lib/date'
import { openPrivacy, openTerms, openTokushoho } from '../../lib/openLegal'
import { DEFAULT_ALWAYS, loadAlways, saveAlways } from '../../lib/splashPref'
import { clearSeen as replayOnboarding } from '../../lib/onboardingPref'
import { useRouter } from 'expo-router'

// 設定。**道具の手入れをする場所。**
//
// **2026-08-14 に減らした**（デザイン案 `5_settings`）。
// 行ごとに説明文を付け、区画を5つ並べ、右端にボタンを置いていた。
// 設定は読む場所ではなく触る場所なので、
// **入り切りは switch にし、説明は要る行にだけ残した。**
//
// 案にある Security・Cloud Sync・Help Center は**実装が無いので置かない。**
// 押しても何も起きない行は、無い方がよい。
//
// アクティビティ（記録した日数・連続日数）は「分析」にある。
// ここは歩みを見る場所ではない。
function Row({ label, value, isLast, onPress, children }) {
  const body = (
    <View
      className={`flex-row items-center justify-between gap-4 py-3.5 min-h-touch ${
        isLast ? '' : 'border-b border-border'
      }`}
    >
      <Text className="text-body-md text-on-surface">{label}</Text>
      {children ?? (value ? <Text className="text-label-md text-outline">{value}</Text> : null)}
    </View>
  )
  if (!onPress) return body
  return (
    <Pressable onPress={onPress} className="active:opacity-70">
      {body}
    </Pressable>
  )
}

// 3つから1つ選ぶ行。**switch ではなく、並べて選ばせる。**
//
// 外観は2026-08-17 に「入り切り」から「端末に合わせる／ライト／ダーク」の
// 3つになった。3つを switch では表せず、押すたびに回る1行にすると
// **次に何が来るのかが押すまで分からない。** 全部見せて、印を付ける。
function ChoiceRow({ label, selected, isLast, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className="active:opacity-70"
    >
      <View
        className={`flex-row items-center justify-between gap-4 py-3.5 min-h-touch ${
          isLast ? '' : 'border-b border-border'
        }`}
      >
        <Text
          className={`text-body-md ${selected ? 'font-strong text-primary' : 'text-on-surface'}`}
        >
          {label}
        </Text>
        {/* 選ばれている行は色と太さでも違う。**印だけに頼らない** */}
        {selected ? <Text className="text-body-md text-primary">✓</Text> : null}
      </View>
    </Pressable>
  )
}

function Group({ title, children }) {
  return (
    <View>
      {title ? (
        <Text className="font-strong text-label-md text-on-surface-variant mb-2">{title}</Text>
      ) : null}
      <View className="bg-surface-lowest rounded-lg px-4 shadow-bloom">{children}</View>
    </View>
  )
}

export default function Settings() {
  // すりガラスのタブバーは内容の上に浮くので、その分だけ下を空ける
  const tabInset = useTabBarInset()
  const router = useRouter()
  const { mode, setMode } = useThemeContext()
  const [logs, setLogs] = useState([])
  const [email, setEmail] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [notifySetting, setNotifySetting] = useState({ enabled: false, hour: 21, minute: 0 })
  const [timeOpen, setTimeOpen] = useState(false)
  // 既定と同じ値で始める。ここだけ true にしていると、
  // 読み込みが終わるまでの一瞬だけ入って見える
  const [splashAlways, setSplashAlways] = useState(DEFAULT_ALWAYS)
  // プラン。**取れるまでは何も言わない**（「無料」と出してから
  // 「有料」に変わると、一瞬だけ嘘をついたことになる）
  const [paid, setPaid] = useState(null)
  // **戻ってくるたびに聞き直す。**
  // 買った直後・解約した直後に設定を開いても、載せたときの1回しか
  // 聞いていないと古いまま出る（2026-08-23）。
  const [planTick, setPlanTick] = useState(0)
  useRefreshOnFocus(useCallback(() => setPlanTick((t) => t + 1), []))

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await authFetch('/api/plan')
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setPaid(Boolean(data.paid))
      } catch (e) {
        // 取れなくても設定は開ける。**プランの行だけ空にする**
        console.warn('[設定] プランの取得に失敗', e)
      }
    })()
    return () => { cancelled = true }
  }, [planTick])

  // 取れるまでは空。**「無料」と出してから「有料」に変わると
  // 一瞬だけ嘘をついたことになる**
  //
  // **売り物の名前で出す**（2026-08-23）。それまで「購読中」だった。
  // 状態の説明であって、何に入っているかが分からない。
  // ペイウォールにも App Store にも「Gleate Plus」と出るので、
  // ここだけ別の呼び方にすると、同じものが2つに見える。
  const planLabel = paid === null ? '' : paid ? 'Gleate Plus' : '無料'


  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // **控えを先に出す**（`lib/logsCache.js`）
        const data = await loadLogs((fresh) => { if (!cancelled) setLogs(fresh) })
        if (!cancelled) setLogs(data)
      } catch (e) {
        // 取得失敗時はエクスポートできる記録が0件のままになる
        console.warn('[Settings] 記録の取得に失敗', e)
      }
    })()
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setEmail(data?.user?.email || '')
    })
    notify.loadSetting().then((s) => { if (!cancelled) setNotifySetting(s) })
    loadAlways().then((v) => { if (!cancelled) setSplashAlways(v) })
    return () => { cancelled = true }
  }, [])

  // 予約は端末が持つ。**設定を触ったその場で作り直す。**
  // 積み増すと時刻を変えたときに二重に鳴る（`lib/notify.js` が全消ししてから並べる）。
  async function applyNotify(next) {
    if (next.enabled && !notifySetting.enabled) {
      // **「入」にしようとしたときにだけ許可を求める。**
      // 起動直後に求めると、何のための通知か分からないまま拒否される
      // **断られたら黙って戻す。** 端末の設定を開く導線は置かない
      // （追いかけない）。2026-08-20 に補足の一文も消した。
      const ok = await notify.requestPermission()
      if (!ok) return
    }
    setNotifySetting(next)
    await notify.saveSetting(next)
    await notify.syncSchedule(next, logs.some((l) => l.date === todayStr()))
  }

  async function handleSignOut() {
    setSigningOut(true)
    // **控えを消してからログアウトする。**
    // 残すと、同じ端末を別の人が使ったとき前の人の記録が一瞬見える
    await forgetLogs()
    forgetAllLights()
    // 添えたリンクも**前の人のものを次の人に見せない**（`lib/linkStore.js`）
    forgetLinks()
    forgetSuggests()
    await supabase.auth.signOut()
    // onAuthStateChange が session=null を検知し、認証ガードがLoginへ振り替える
  }

  // 実装はプラットフォームで分かれる（lib/exportLogs.js と lib/exportLogs.web.js）。
  // ネイティブは共有シート、Webは従来通りファイルのダウンロード。
  async function handleExport() {
    setExporting(true)
    setExportError('')
    try {
      await exportLogs(logs)
    } catch (err) {
      setExportError(
        err?.message === 'sharing unavailable'
          ? 'この端末では共有を利用できません。'
          : 'エクスポートに失敗しました。'
      )
    } finally {
      setExporting(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScreenFade>
      <AppHeader />
      <ScrollView
        contentContainerClassName="px-5 pt-6 gap-6 w-full max-w-read self-center"
        contentContainerStyle={{ paddingBottom: tabInset + BOTTOM_GAP }}
      >
        <View>
          <Text className="font-display text-headline-md text-on-surface">設定</Text>
        </View>

        {/* **押すと画面が変わる**（2026-08-15）。
            それまでは同じ画面でアドレスが開くだけで、めくった感じがしなかった。
            中身は `app/account.jsx`。**マイページ**（2026-09-04 に
            「アカウント」から改称）。灯りの色と紙の色もそちらへ移した——
            設定は道具の設定、色は自分の場所の設えで、性質が違う。 */}
        {email ? (
          <Group>
            <Pressable
              onPress={() => router.push('/account')}
              accessibilityLabel="マイページ"
              className="flex-row items-center gap-3 py-3.5 min-h-touch active:opacity-70"
            >
              <AccountMark email={email} />
              <Text className="flex-1 text-body-md text-on-surface">マイページ</Text>
              <Text className="text-label-md text-outline">›</Text>
            </Pressable>
          </Group>
        ) : null}

        <Group title="一般">
          {notify.isSupported ? (
            <Row label="毎日のきっかけ">
              <Switch
                value={notifySetting.enabled}
                onValueChange={(v) => applyNotify({ ...notifySetting, enabled: v })}
                trackColor={{ true: '#FBB03B' }}
              />
            </Row>
          ) : null}
          {notify.isSupported && notifySetting.enabled ? (
            <Row label="知らせる時刻" onPress={() => setTimeOpen(true)}>
              <View className="flex-row items-center gap-1.5">
                <Text className="font-strong text-body-md text-primary">
                  {timeLabel(notifySetting.hour, notifySetting.minute)}
                </Text>
                <Text className="text-label-md text-outline">⌄</Text>
              </View>
            </Row>
          ) : null}
          {/* **既定は1日1回**（`app/_layout.jsx`）。毎回見たい人だけ入にする。

              行の名前は「起動画面」だけにしてある（2026-08-16）。
              それまでは「起動画面を毎回出す」で、**入り切りの行に
              動詞が入って読みにくかった。** 隣の行も名詞
              （毎日のきっかけ・知らせる時刻）で揃えている。
              **切っても消えるわけではない**ので、
              入と切が何を指すのかは下の一文で言う。 */}
          <Row label="起動画面">
            <Switch
              value={splashAlways}
              onValueChange={(v) => { setSplashAlways(v); saveAlways(v) }}
              trackColor={{ true: '#FBB03B' }}
            />
          </Row>
          {/* **初回の案内をもう一度。**（2026-08-20）
              一度きりの画面なので、確かめるにはアプリを入れ直すしかなかった。
              押すとその場で出る（`lib/onboardingPref.js` が
              `app/_layout.jsx` へ合図を送る）。 */}
          <Row label="初回の案内" onPress={replayOnboarding} isLast>
            <Text className="text-label-md text-primary">もう一度見る</Text>
          </Row>
        </Group>


        {/* **外観。** 2026-08-17 に「端末に合わせる」を足して3つになった。
            それまではライト固定で、端末を夜モードにしていても
            Gleate だけ白いままだった。**記録は夜に書かれることが多い。**

            一般の中に置かず区画を分けたのは、**行が3つあるため。**
            switch の行に混ぜると、どこまでが1つの設定なのか読めなくなる。 */}
        <Group title="外観">
          {THEME_MODES.map((m, i) => (
            <ChoiceRow
              key={m}
              label={THEME_LABELS[m]}
              selected={mode === m}
              isLast={i === THEME_MODES.length - 1}
              onPress={() => setMode(m)}
            />
          ))}
        </Group>

        {/* **プラン。** 行は1つだけ。押すと `app/plan.jsx` へ。
            購入も復元もあちらに置く（Apple は復元の導線を求めている）。

            **2026-08-24。** それまでは「ここに購入ボタンは置かない。
            設定は道具の手入れをする場所で、売る場所ではない」としており、
            買うのは断られた画面からだけだった。考え方は筋が通っていたが、
            **探す人の動線と合っていなかった。**Apple の審査
            （iPad Air M3）が購入の場所を見つけられず、
            Guideline 2.1(b) で差し戻された。買おうと思った人も同じで、
            断られるまで待たないと行き先が無い。

            はじめは「プランを見る」という行を足したが、**プランの行が
            2つに割れた。**「現在のプラン」と並ぶと、どちらを押すのかを
            読んで決めることになる。**状態を見せる行そのものを入口にした。**
            いま何であるかを知りたくて押した人が、そのまま変えられる場所へ着く。 */}
        <Group title="プラン">
          <Row
            label="現在のプラン"
            value={planLabel}
            onPress={() => router.push('/plan')}
            isLast
          />
        </Group>

        {/* **中身が変わった**（2026-08-17）。
            JSON 1枚だったころは本文しか入っておらず、
            端末の中にしか無い写真と添付が救えていなかった。

            共有シートから「"ファイル"に保存」を選べば iCloud Drive へ置ける。
            **自動で外へ送る仕組みは持たない**（`lib/exportLogs.js`）。 */}
        <Group title="データ">
          <Row
            label={exporting ? '書き出し中...' : '記録を書き出す'}
            value="ZIP"
            onPress={exporting ? undefined : handleExport}
            isLast
          />
        </Group>
        {exportError ? <Text className="text-label-md text-error">{exportError}</Text> : null}

        {/* **3つとも外のページを開く。** アプリの中に複製を作らない。
            App Store Connect に出す URL と中身がずれると、
            どちらが本当かを外から確かめられなくなる（`lib/openLegal.js`）。

            特定商取引法に基づく表記は**有料で売るなら日本では必須**。
            置き場所として設定のここが一番見つけやすい（2026-08-16）。 */}
        <Group title="Gleateについて">
          <Row label="利用規約" value="↗" onPress={openTerms} />
          <Row label="プライバシーポリシー" value="↗" onPress={openPrivacy} />
          <Row label="特定商取引法に基づく表記" value="↗" onPress={openTokushoho} />
          {/* **いま動いているのがどれかを言えるようにする**（2026-09-06）。
              配信した直しが届いているのか、まだ古いままなのかが
              分からないと、**直っていないのか届いていないのかを
              区別できない**（`lib/buildStamp.js`） */}
          <Row label="バージョン" value={`${APP_VERSION}  ${buildStamp()}`} isLast />
        </Group>

        <Pressable
          onPress={handleSignOut}
          disabled={signingOut}
          className="items-center min-h-touch justify-center mt-2 disabled:opacity-50"
        >
          <Text className="font-strong text-body-md text-error">
            {signingOut ? 'ログアウト中...' : 'ログアウト'}
          </Text>
        </Pressable>

      </ScrollView>

      {/* 時刻はダイヤルで決める。**その場で効く。**
          「決定」を押させると、回した結果が効いていないように見える間ができる */}
      <Modal visible={timeOpen} animationType="slide" transparent onRequestClose={() => setTimeOpen(false)}>
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setTimeOpen(false)}>
          <Pressable className="bg-surface rounded-t-2xl px-5 pt-5 pb-8" onPress={() => {}}>
            <View className="self-center w-10 h-1 rounded-full bg-outline-variant mb-4" />
            <View className="flex-row items-center justify-between mb-4">
              <Text className="font-strong text-body-md text-on-surface">知らせる時刻</Text>
              <Pressable
                onPress={() => setTimeOpen(false)}
                className="min-h-touch px-2 justify-center active:opacity-70"
              >
                <Text className="font-strong text-body-md text-primary">完了</Text>
              </Pressable>
            </View>
            <TimeDial
              hour={notifySetting.hour}
              minute={notifySetting.minute}
              onChange={({ hour, minute }) => applyNotify({ ...notifySetting, hour, minute })}
            />
          </Pressable>
        </Pressable>
      </Modal>
      </ScreenFade>
    </SafeAreaView>
  )
}
