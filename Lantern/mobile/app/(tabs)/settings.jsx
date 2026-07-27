import { useState } from 'react'
import { Pressable, SafeAreaView, Text, View } from 'react-native'
import { supabase } from '../../lib/supabase'

// A1では認証ガードの往復を確認するためログアウトのみ実装する。
// 残りの項目（アクティビティ・テーマ・エクスポート）はA5で実装する。
export default function SettingsTab() {
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    // onAuthStateChange が session=null を検知し、ルートレイアウトがLoginへ振り替える
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-1 px-5 pt-6">
        <Text className="text-[10px] text-ink-faint tracking-[3px] uppercase mb-0.5">Settings</Text>
        <Text className="font-display text-xl font-light text-ink mb-8">設定</Text>

        <Text className="text-[10px] text-ink-faint tracking-[3px] uppercase mb-3">アカウント</Text>
        <View className="bg-stone/50 rounded-xl px-4">
          <View className="flex-row items-center justify-between py-4">
            <View className="flex-1 mr-4">
              <Text className="text-sm text-ink">ログアウト</Text>
              <Text className="text-xs text-ink-faint mt-0.5">このデバイスからサインアウトします</Text>
            </View>
            <Pressable
              onPress={handleSignOut}
              disabled={signingOut}
              className="border border-red-200 rounded-full px-3.5 py-1.5 active:opacity-70 disabled:opacity-50"
            >
              <Text className="text-xs text-red-500">
                {signingOut ? 'ログアウト中...' : 'ログアウト'}
              </Text>
            </Pressable>
          </View>
        </View>

        <View className="flex-1 items-center justify-center">
          <Text className="text-xs text-ink-faint">残りの項目は A5 で実装します</Text>
        </View>
      </View>
    </SafeAreaView>
  )
}
