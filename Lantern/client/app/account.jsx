import { useEffect, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Text from '../components/Text'
import AccountMark from '../components/AccountMark'
import { supabase, authFetch } from '../lib/supabase'

// アカウント。**設定から1枚めくったところ。**
//
// 2026-08-15 まで設定の中に畳んであり、押すとアドレスが開くだけだった。
// **開いた先が同じ画面だと、めくった感じがしない。**
//
// ここに置くのは「自分が誰として使っているか」だけ。
// **プロフィールは持たない**（`REQUIREMENTS.md`）。名前も顔写真も無い。
//
// **アカウントの削除をここへ移した。** 取り返しがつかない操作は、
// 設定を開いてすぐ目に入る場所にある必要がない。
// App Store のガイドライン 5.1.1(v) は「アプリの中から削除できること」を
// 求めているが、**設定の一段目にあることまでは求めていない。**
function Row({ label, value, isLast }) {
  return (
    <View
      className={`flex-row items-center justify-between gap-4 py-3.5 min-h-touch ${
        isLast ? '' : 'border-b border-border'
      }`}
    >
      <Text className="text-body-md text-on-surface">{label}</Text>
      {value ? <Text className="text-label-md text-outline">{value}</Text> : null}
    </View>
  )
}

export default function Account() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [since, setSince] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return
      setEmail(data?.user?.email || '')
      const at = data?.user?.created_at
      if (at) {
        const d = new Date(at)
        setSince(`${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`)
      }
    })
    return () => { cancelled = true }
  }, [])

  // 記録を消してから認証の利用者を消す（サーバー側 modules/account.py）。
  // 成功したらサインアウトする。セッションだけ残ると、
  // 消えたはずのアカウントで画面が開いたままになる。
  async function handleDelete() {
    setDeleting(true)
    setError('')
    try {
      const res = await authFetch('/api/account', { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await supabase.auth.signOut()
    } catch (e) {
      console.warn('[Account] 削除に失敗', e)
      setError('削除できませんでした。通信を確認してもう一度お試しください。')
      setDeleting(false)
    }
  }

  function back() {
    if (router.canGoBack()) router.back()
    else router.replace('/settings')
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <View className="flex-row items-center px-5 h-11">
        <Pressable onPress={back} className="min-h-touch justify-center active:opacity-70">
          <Text className="text-body-md text-primary">← 設定</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="px-5 pt-4 gap-6 w-full max-w-read self-center">
        <View className="items-center gap-3 py-4">
          <AccountMark email={email} size={64} />
          <Text className="text-body-md text-on-surface">{email}</Text>
        </View>

        <View className="bg-surface-lowest rounded-lg px-4 shadow-bloom">
          <Row label="メールアドレス" value={email} />
          {/* **事実だけ。** 「◯日目です」のような数え方はしない */}
          <Row label="使いはじめた日" value={since} isLast />
        </View>

        <Text className="text-label-md text-outline leading-relaxed">
          記録とアイデアはこのアカウントに紐づいています。
          写真と添付は端末の中だけにあり、サーバーには送っていません。
        </Text>

        {/* App Store のガイドライン 5.1.1(v)。無効化では足りない。
            2段階にしているのは、取り返しがつかないため。 */}
        {confirmDelete ? (
          <View className="bg-surface-low rounded-lg p-4 gap-3">
            <Text className="text-body-md text-on-surface leading-relaxed">
              記録・アイデア・連携がすべて消え、元に戻せません。
            </Text>
            <Text className="text-label-md text-outline leading-relaxed">
              端末の中にある写真と添付は消えません。手元に残しておきたい記録があれば、
              先にエクスポートしてください。
            </Text>
            {error ? <Text className="text-label-md text-error">{error}</Text> : null}
            <View className="flex-row gap-3">
              <Pressable
                onPress={handleDelete}
                disabled={deleting}
                className="border border-error/30 rounded-full px-3.5 min-h-touch justify-center disabled:opacity-50"
              >
                <Text className="text-label-md text-error">
                  {deleting ? '削除中...' : '削除する'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => { setConfirmDelete(false); setError('') }}
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
