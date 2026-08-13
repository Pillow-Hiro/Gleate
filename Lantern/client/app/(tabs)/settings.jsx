import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Switch, View } from 'react-native'
import Text from '../../components/Text'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BOTTOM_GAP, useTabBarInset } from '../../lib/tabBar'
import { supabase, authFetch } from '../../lib/supabase'
import { exportLogs } from '../../lib/exportLogs'
import { useThemeContext } from '../../lib/theme'
import { APP_VERSION } from '../../constants'
import * as notify from '../../lib/notify'
import { NOTIFY_HOURS, hourLabel } from '../../lib/notifyText'
import { todayStr } from '../../lib/date'
import { openPrivacy } from '../../lib/openPrivacy'

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
  const { isDark, toggleTheme } = useThemeContext()
  const [logs, setLogs] = useState([])
  const [email, setEmail] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [notifySetting, setNotifySetting] = useState({ enabled: false, hour: 21 })
  const [notifyBlocked, setNotifyBlocked] = useState(false)

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

  // 記録を消してから認証の利用者を消す（サーバー側 modules/account.py）。
  // 成功したらサインアウトする。セッションだけ残ると、
  // 消えたはずのアカウントで画面が開いたままになる。
  async function handleDeleteAccount() {
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await authFetch('/api/account', { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await supabase.auth.signOut()
    } catch (e) {
      // 消えていないのに消えたように見せない
      console.warn('[Settings] アカウントの削除に失敗', e)
      setDeleteError('削除できませんでした。通信を確認してもう一度お試しください。')
      setDeleting(false)
    }
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
      <ScrollView
        contentContainerClassName="px-5 pt-6 gap-6 w-full max-w-read self-center"
        contentContainerStyle={{ paddingBottom: tabInset + BOTTOM_GAP }}
      >
        <View>
          <Text className="font-display text-headline-md text-ink">設定</Text>
        </View>

        {/* 誰として使っているか。**顔写真は置かない。**
            プロフィールは持たない（`REQUIREMENTS.md`）。
            自分のアドレスが見えれば、どのアカウントかは分かる。 */}
        {email ? (
          <Group>
            <Row label="アカウント" value={email} isLast />
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
            <Row label="知らせる時刻">
              <View className="flex-row gap-1.5">
                {NOTIFY_HOURS.map((h) => (
                  <Pressable
                    key={h}
                    onPress={() => applyNotify({ ...notifySetting, hour: h })}
                    className={`rounded-full px-2 py-1.5 ${
                      notifySetting.hour === h ? 'bg-lantern-glow' : 'bg-surface-low'
                    }`}
                  >
                    <Text
                      className={`text-label-sm ${
                        notifySetting.hour === h ? 'text-on-lantern' : 'text-on-surface-variant'
                      }`}
                    >
                      {hourLabel(h)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Row>
          ) : null}
          <Row label="ダークテーマ" isLast>
            <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ true: '#FBB03B' }} />
          </Row>
        </Group>

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

        <Group title="Lanternについて">
          <Row label="プライバシーポリシー" value="↗" onPress={openPrivacy} />
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

        {/* App Store のガイドライン 5.1.1(v) が、アカウントを作れるアプリに
            アプリ内からの削除を求めている。無効化では足りない。

            2段階にしているのは、取り返しがつかないため。
            押し間違いで全部消えることがないようにする。
            煽らないが、何が起きるかは省略せずに書く。 */}
        {confirmDelete ? (
          <View className="bg-surface-low rounded-lg p-4 gap-3">
            <Text className="text-body-md text-on-surface leading-relaxed">
              記録・アイデア・連携がすべて消え、元に戻せません。
            </Text>
            <Text className="text-label-md text-outline leading-relaxed">
              端末の中にある写真は消えません。手元に残しておきたい記録があれば、
              先にエクスポートしてください。
            </Text>
            {deleteError ? <Text className="text-label-md text-error">{deleteError}</Text> : null}
            <View className="flex-row gap-3">
              <Pressable
                onPress={handleDeleteAccount}
                disabled={deleting}
                className="border border-error/30 rounded-full px-3.5 min-h-touch justify-center disabled:opacity-50"
              >
                <Text className="text-label-md text-error">
                  {deleting ? '削除中...' : '削除する'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => { setConfirmDelete(false); setDeleteError('') }}
                disabled={deleting}
                className="border border-outline-variant rounded-full px-3.5 min-h-touch justify-center disabled:opacity-50"
              >
                <Text className="text-label-md text-primary">やめる</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setConfirmDelete(true)}
            className="items-center min-h-touch justify-center"
          >
            <Text className="text-label-md text-outline underline">アカウントを削除する</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
