import { useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, Switch, View } from 'react-native'
import Text from '../../components/Text'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BOTTOM_GAP, useTabBarInset } from '../../lib/tabBar'
import { supabase, authFetch } from '../../lib/supabase'
import { exportLogs } from '../../lib/exportLogs'
import { useThemeContext } from '../../lib/theme'
import { APP_VERSION } from '../../constants'
import * as notify from '../../lib/notify'
import AppHeader from '../../components/AppHeader'
import TimeDial from '../../components/TimeDial'
import AccountMark from '../../components/AccountMark'
import { timeLabel } from '../../lib/notifyText'
import { todayStr } from '../../lib/date'
import { openPrivacy, openTerms, openTokushoho } from '../../lib/openLegal'
import { DEFAULT_ALWAYS, loadAlways, saveAlways } from '../../lib/splashPref'
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
  const { isDark, toggleTheme } = useThemeContext()
  const [logs, setLogs] = useState([])
  const [email, setEmail] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [notifySetting, setNotifySetting] = useState({ enabled: false, hour: 21, minute: 0 })
  const [notifyBlocked, setNotifyBlocked] = useState(false)
  const [timeOpen, setTimeOpen] = useState(false)
  // 既定と同じ値で始める。ここだけ true にしていると、
  // 読み込みが終わるまでの一瞬だけ入って見える
  const [splashAlways, setSplashAlways] = useState(DEFAULT_ALWAYS)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await authFetch('/api/logs')
        const data = await res.json()
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
      const ok = await notify.requestPermission()
      if (!ok) {
        setNotifyBlocked(true)
        return
      }
      setNotifyBlocked(false)
    }
    setNotifySetting(next)
    await notify.saveSetting(next)
    await notify.syncSchedule(next, logs.some((l) => l.date === todayStr()))
  }

  async function handleSignOut() {
    setSigningOut(true)
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
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <AppHeader />
      <ScrollView
        contentContainerClassName="px-5 pt-6 gap-6 w-full max-w-read self-center"
        contentContainerStyle={{ paddingBottom: tabInset + BOTTOM_GAP }}
      >
        <View>
          <Text className="font-display text-headline-md text-ink">設定</Text>
        </View>

        {/* **押すと画面が変わる**（2026-08-15）。
            それまでは同じ画面でアドレスが開くだけで、めくった感じがしなかった。
            中身は `app/account.jsx`。アカウントの削除もそちらへ移した。 */}
        {email ? (
          <Group>
            <Pressable
              onPress={() => router.push('/account')}
              accessibilityLabel="アカウント"
              className="flex-row items-center gap-3 py-3.5 min-h-touch active:opacity-70"
            >
              <AccountMark email={email} />
              <Text className="flex-1 text-body-md text-on-surface">アカウント</Text>
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
          <Row label="ダークテーマ">
            <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ true: '#FBB03B' }} />
          </Row>
          {/* **既定は1日1回**（`app/_layout.jsx`）。毎回見たい人だけ入にする。

              行の名前は「起動画面」だけにしてある（2026-08-16）。
              それまでは「起動画面を毎回出す」で、**入り切りの行に
              動詞が入って読みにくかった。** 隣の行も名詞
              （毎日のきっかけ・知らせる時刻・ダークテーマ）で揃えている。
              **切っても消えるわけではない**ので、
              入と切が何を指すのかは下の一文で言う。 */}
          <Row label="起動画面" isLast>
            <Switch
              value={splashAlways}
              onValueChange={(v) => { setSplashAlways(v); saveAlways(v) }}
              trackColor={{ true: '#FBB03B' }}
            />
          </Row>
        </Group>

        {/* **切っても消えない。** 入と切がそれぞれ何になるのかを書く。
            switch の行の名前だけでは「切ると出なくなる」に読めてしまう */}
        <Text className="text-label-md text-outline leading-relaxed">
          入にすると、開くたびに出ます。切ると1日に1回です。
        </Text>

        {/* **端末の設定を開く導線は置かない。** 断った人を追いかけない */}
        {notifyBlocked ? (
          <Text className="text-label-md text-outline leading-relaxed">
            端末の設定で Lantern の通知が許可されていません。
          </Text>
        ) : null}

        <Group title="データ">
          <Row
            label={exporting ? 'エクスポート中...' : '記録をエクスポート'}
            value="JSON"
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
        <Group title="Lanternについて">
          <Row label="利用規約" value="↗" onPress={openTerms} />
          <Row label="プライバシーポリシー" value="↗" onPress={openPrivacy} />
          <Row label="特定商取引法に基づく表記" value="↗" onPress={openTokushoho} />
          <Row label="バージョン" value={APP_VERSION} isLast />
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
    </SafeAreaView>
  )
}
