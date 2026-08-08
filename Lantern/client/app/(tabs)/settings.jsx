import { useEffect, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import Text from '../../components/Text'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BOTTOM_GAP, useTabBarInset } from '../../lib/tabBar'
import { supabase, authFetch } from '../../lib/supabase'
import { calcStreak } from '../../lib/date'
import { exportLogs } from '../../lib/exportLogs'
import { useThemeContext } from '../../lib/theme'
import { APP_VERSION } from '../../constants'

function SettingsRow({ label, description, children }) {
  return (
    <View className="flex-row items-center justify-between py-4 border-b border-border">
      <View className="flex-1 mr-4">
        <Text className="text-body text-ink">{label}</Text>
        {description ? (
          <Text className="text-aux text-ink-faint mt-0.5">{description}</Text>
        ) : null}
      </View>
      <View>{children}</View>
    </View>
  )
}

function Section({ title, children }) {
  return (
    <View>
      <Text className="font-strong text-aux text-ink-soft mb-2.5">{title}</Text>
      <View className="bg-stone/50 rounded-lg px-4">{children}</View>
    </View>
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

  const streak = calcStreak(logs)

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

        <Section title="アクティビティ">
          <SettingsRow label="記録した日数" description="これまでの合計">
            <Text className="font-strong text-body text-forest">{logs.length}日</Text>
          </SettingsRow>
          <SettingsRow label="現在の連続日数" description="今日まで続けた日数">
            <Text className="font-strong text-body text-forest">{streak}日</Text>
          </SettingsRow>
        </Section>

        <Section title="表示">
          <SettingsRow label="テーマ" description="ボタンで手動切り替え">
            <Pressable onPress={toggleTheme} className="border border-sage/40 rounded-full px-3 py-1.5">
              <Text className="text-aux text-forest">
                {isDark ? 'ライトにする' : 'ダークにする'}
              </Text>
            </Pressable>
          </SettingsRow>
        </Section>

        <Section title="データ">
          <SettingsRow label="データのエクスポート" description="JSON形式で共有">
            <Pressable
              onPress={handleExport}
              disabled={exporting}
              className="border border-sage/40 rounded-full px-3.5 py-1.5 disabled:opacity-50"
            >
              <Text className="text-aux text-forest">{exporting ? '準備中...' : 'エクスポート'}</Text>
            </Pressable>
          </SettingsRow>
        </Section>
        {exportError ? <Text className="text-aux text-error">{exportError}</Text> : null}

        <Section title="アカウント">
          <SettingsRow label="ログアウト" description="このデバイスからサインアウトします">
            <Pressable
              onPress={handleSignOut}
              disabled={signingOut}
              className="border border-error/30 rounded-full px-3.5 py-1.5 disabled:opacity-50"
            >
              <Text className="text-aux text-error">
                {signingOut ? 'ログアウト中...' : 'ログアウト'}
              </Text>
            </Pressable>
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
              <Text className="text-body text-ink leading-relaxed">
                記録・アイデア・連携がすべて消え、元に戻せません。
              </Text>
              <Text className="text-aux text-ink-faint leading-relaxed">
                端末の中にある写真は消えません。手元に残しておきたい記録があれば、
                先にエクスポートしてください。
              </Text>
              {deleteError ? (
                <Text className="text-aux text-error">{deleteError}</Text>
              ) : null}
              <View className="flex-row gap-3">
                <Pressable
                  onPress={handleDeleteAccount}
                  disabled={deleting}
                  className="border border-error/60 rounded-full px-3.5 py-1.5 disabled:opacity-50"
                >
                  <Text className="text-aux text-error">
                    {deleting ? '削除中...' : '削除する'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => { setConfirmDelete(false); setDeleteError('') }}
                  disabled={deleting}
                  className="border border-sage/40 rounded-full px-3.5 py-1.5 disabled:opacity-50"
                >
                  <Text className="text-aux text-forest">やめる</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <SettingsRow
              label="アカウントを削除する"
              description="記録とアイデアをすべて消します"
            >
              <Pressable
                onPress={() => setConfirmDelete(true)}
                className="border border-error/30 rounded-full px-3.5 py-1.5"
              >
                <Text className="text-aux text-error">削除</Text>
              </Pressable>
            </SettingsRow>
          )}
        </Section>

        <Section title="Lanternについて">
          <SettingsRow label="バージョン">
            <Text className="font-mono text-aux text-ink-faint">{APP_VERSION}</Text>
          </SettingsRow>
          <SettingsRow label="コンセプト" description="静かに寄り添う、あなただけの伴走者。">
            <View />
          </SettingsRow>
        </Section>
      </ScrollView>
    </SafeAreaView>
  )
}
