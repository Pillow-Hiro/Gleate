import { useEffect, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
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

// 1行。**アイコン → ラベル → 操作。**
//
// デザイン案の Settings に合わせた。案はシェブロン（›）を置いているが、
// **付けていない。** ここの行は「次の画面へ行く」ものではなく、
// その場で効く操作。シェブロンを付けると、押したら画面が変わると読める。
//
// 高さは 44px 以上（HIG）。`isLast` の行には区切り線を引かない。
// カードの縁と二重になる。
function SettingsRow({ icon, label, description, isLast, children }) {
  return (
    <View
      className={`flex-row items-center py-3.5 min-h-touch ${
        isLast ? '' : 'border-b border-border'
      }`}
    >
      {icon ? (
        <View className="w-9 h-9 rounded bg-surface-lowest items-center justify-center mr-3">
          <Text className="text-body-md text-on-surface-variant">{icon}</Text>
        </View>
      ) : null}
      <View className="flex-1 mr-4">
        <Text className="text-body-md text-on-surface">{label}</Text>
        {description ? (
          <Text className="text-label-md text-outline mt-0.5">{description}</Text>
        ) : null}
      </View>
      <View>{children}</View>
    </View>
  )
}

function Section({ title, children }) {
  return (
    <View>
      <Text className="font-strong text-label-md text-on-surface-variant mb-2.5">{title}</Text>
      <View className="bg-surface-low rounded-lg px-4">{children}</View>
    </View>
  )
}

// 行の右に置く操作。**輪郭だけの控えめなボタン**（DESIGN.md の ghost）。
function RowButton({ onPress, disabled, danger, children }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`border rounded-full px-3.5 min-h-touch justify-center disabled:opacity-50 ${
        danger ? 'border-error/30' : 'border-outline-variant'
      }`}
    >
      <Text className={`text-label-md ${danger ? 'text-error' : 'text-primary'}`}>{children}</Text>
    </Pressable>
  )
}

export default function Settings() {
  // すりガラスのタブバーは内容の上に浮くので、その分だけ下を空ける
  const tabInset = useTabBarInset()
  const [logs, setLogs] = useState([])
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
    const recordedToday = logs.some((l) => l.date === todayStr())
    await notify.syncSchedule(next, recordedToday)
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
  const { isDark, toggleTheme } = useThemeContext()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await authFetch('/api/logs')
        const data = await res.json()
        if (!cancelled) setLogs(data)
      } catch (e) {
        // 取得失敗時は0件表示のままにする
        console.warn('[Settings] 記録の取得に失敗', e)
      }
    })()
    return () => { cancelled = true }
  }, [])

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
      <ScrollView contentContainerClassName="px-5 pt-6 gap-8 w-full max-w-read self-center" contentContainerStyle={{ paddingBottom: tabInset + BOTTOM_GAP }}>
        <View>
          <Text className="font-display text-headline-md text-ink">設定</Text>
        </View>

        {/* **催促ではなく、静かなきっかけ**（CLAUDE.md「習慣化の定義」）。
            既定は「切」。**黙って鳴らさない。**
            日数も件数も出さない文面にしてある（`lib/notifyText.js`）。
            Web では通知を扱わないので、節ごと出さない。 */}
        {notify.isSupported ? (
          <Section title="通知">
            <SettingsRow
              icon="◔"
              label="毎日のきっかけ"
              description="決めた時刻に、そっと知らせます"
              isLast={!notifySetting.enabled}
            >
              <RowButton
                onPress={() => applyNotify({ ...notifySetting, enabled: !notifySetting.enabled })}
              >
                {notifySetting.enabled ? 'やめる' : '受け取る'}
              </RowButton>
            </SettingsRow>
            {notifySetting.enabled ? (
              <SettingsRow icon="◷" label="時刻" isLast>
                <View className="flex-row gap-1.5">
                  {NOTIFY_HOURS.map((h) => (
                    <Pressable
                      key={h}
                      onPress={() => applyNotify({ ...notifySetting, hour: h })}
                      className={`rounded-full px-2.5 py-2 ${
                        notifySetting.hour === h ? 'bg-lantern-glow' : 'bg-surface-lowest'
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
              </SettingsRow>
            ) : null}
          </Section>
        ) : null}
        {notifyBlocked ? (
          // **端末の設定を開く導線は置かない。** 断った人を追いかけない
          <Text className="text-label-md text-outline leading-relaxed">
            端末の設定で Lantern の通知が許可されていません。
          </Text>
        ) : null}

        <Section title="表示">
          <SettingsRow icon="◐" label="テーマ" description="ボタンで手動切り替え" isLast>
            <RowButton onPress={toggleTheme}>
              {isDark ? 'ライトにする' : 'ダークにする'}
            </RowButton>
          </SettingsRow>
        </Section>

        <Section title="データ">
          <SettingsRow icon="↧" label="データのエクスポート" description="JSON形式で共有" isLast>
            <RowButton onPress={handleExport} disabled={exporting}>
              {exporting ? '準備中...' : 'エクスポート'}
            </RowButton>
          </SettingsRow>
        </Section>
        {exportError ? <Text className="text-label-md text-error">{exportError}</Text> : null}

        <Section title="アカウント">
          <SettingsRow icon="→" label="ログアウト" description="このデバイスからサインアウトします" isLast>
            <RowButton onPress={handleSignOut} disabled={signingOut} danger>
              {signingOut ? 'ログアウト中...' : 'ログアウト'}
            </RowButton>
          </SettingsRow>
        </Section>

        <Section title="アカウントの削除">
          {/* App Store のガイドライン 5.1.1(v) が、アカウントを作れるアプリに
              アプリ内からの削除を求めている。無効化では足りない。

              2段階にしているのは、取り返しがつかないため。
              押し間違いで全部消えることがないようにする。
              煽らないが、何が起きるかは省略せずに書く。 */}
          {confirmDelete ? (
            <View className="py-4 gap-3">
              <Text className="text-body-md text-on-surface leading-relaxed">
                記録・アイデア・連携がすべて消え、元に戻せません。
              </Text>
              <Text className="text-label-md text-outline leading-relaxed">
                端末の中にある写真は消えません。手元に残しておきたい記録があれば、
                先にエクスポートしてください。
              </Text>
              {deleteError ? (
                <Text className="text-label-md text-error">{deleteError}</Text>
              ) : null}
              <View className="flex-row gap-3">
                <RowButton onPress={handleDeleteAccount} disabled={deleting} danger>
                  {deleting ? '削除中...' : '削除する'}
                </RowButton>
                <RowButton
                  onPress={() => { setConfirmDelete(false); setDeleteError('') }}
                  disabled={deleting}
                >
                  やめる
                </RowButton>
              </View>
            </View>
          ) : (
            <SettingsRow
              icon="✕"
              label="アカウントを削除する"
              description="記録とアイデアをすべて消します"
              isLast
            >
              <RowButton onPress={() => setConfirmDelete(true)} danger>
                削除
              </RowButton>
            </SettingsRow>
          )}
        </Section>

        <Section title="Lanternについて">
          <SettingsRow icon="◇" label="バージョン">
            <Text className="font-mono text-label-md text-outline">{APP_VERSION}</Text>
          </SettingsRow>
          <SettingsRow icon="✎" label="コンセプト" description="静かに寄り添う、あなただけの伴走者。" isLast>
            <View />
          </SettingsRow>
        </Section>
      </ScrollView>
    </SafeAreaView>
  )
}
