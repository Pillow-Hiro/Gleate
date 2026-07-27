import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase, authFetch } from '../../lib/supabase'
import { calcStreak } from '../../lib/date'
import { exportLogs } from '../../lib/exportLogs'
import { useThemeContext } from '../../lib/theme'
import { APP_VERSION } from '../../constants'

function SettingsRow({ label, description, children }) {
  return (
    <View className="flex-row items-center justify-between py-4 border-b border-border">
      <View className="flex-1 mr-4">
        <Text className="text-sm text-ink">{label}</Text>
        {description ? (
          <Text className="text-xs text-ink-faint mt-0.5">{description}</Text>
        ) : null}
      </View>
      <View>{children}</View>
    </View>
  )
}

function Section({ title, children }) {
  return (
    <View>
      <Text className="text-[10px] text-ink-faint tracking-[2px] mb-3">{title}</Text>
      <View className="bg-stone/50 rounded-xl px-4">{children}</View>
    </View>
  )
}

export default function Settings() {
  const [logs, setLogs] = useState([])
  const [signingOut, setSigningOut] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const { isDark, toggleTheme } = useThemeContext()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await authFetch('/api/logs')
        const data = await res.json()
        if (!cancelled) setLogs(data)
      } catch {
        // 取得失敗時は0件表示のままにする
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
      <ScrollView contentContainerClassName="px-5 pt-6 pb-10 gap-8">
        <View>
          <Text className="text-[10px] text-ink-faint tracking-[2px] mb-0.5">SETTINGS</Text>
          <Text className="font-display text-xl font-light text-ink">設定</Text>
        </View>

        <Section title="アクティビティ">
          <SettingsRow label="記録した日数" description="これまでの合計">
            <Text className="text-sm font-medium text-forest">{logs.length}日</Text>
          </SettingsRow>
          <SettingsRow label="現在の連続日数" description="今日まで続けた日数">
            <Text className="text-sm font-medium text-forest">{streak}日</Text>
          </SettingsRow>
        </Section>

        <Section title="表示">
          <SettingsRow label="テーマ" description="ボタンで手動切り替え">
            <Pressable onPress={toggleTheme} className="border border-sage/40 rounded-full px-3 py-1.5">
              <Text className="text-xs text-forest">
                {isDark ? '☀️ ライトに切替' : '🌙 ダークに切替'}
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
              <Text className="text-xs text-forest">{exporting ? '準備中...' : 'エクスポート'}</Text>
            </Pressable>
          </SettingsRow>
        </Section>
        {exportError ? <Text className="text-xs text-red-500">{exportError}</Text> : null}

        <Section title="アカウント">
          <SettingsRow label="ログアウト" description="このデバイスからサインアウトします">
            <Pressable
              onPress={handleSignOut}
              disabled={signingOut}
              className="border border-red-200 dark:border-red-900/40 rounded-full px-3.5 py-1.5 disabled:opacity-50"
            >
              <Text className="text-xs text-red-500">
                {signingOut ? 'ログアウト中...' : 'ログアウト'}
              </Text>
            </Pressable>
          </SettingsRow>
        </Section>

        <Section title="Lanternについて">
          <SettingsRow label="バージョン">
            <Text className="text-xs text-ink-faint">{APP_VERSION}</Text>
          </SettingsRow>
          <SettingsRow label="コンセプト" description="静かに寄り添う、あなただけの伴走者。">
            <View />
          </SettingsRow>
        </Section>
      </ScrollView>
    </SafeAreaView>
  )
}
