import { useEffect, useState } from 'react'
import { Image, Modal, Pressable, ScrollView, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import Text from '../components/Text'
import AccountMark from '../components/AccountMark'
import AuthField from '../components/AuthField'
import { supabase, authFetch } from '../lib/supabase'
import { forgetLogs } from '../lib/logsCache'
import { forgetAllLights } from '../lib/lightBuffer'
import { forgetAll as forgetLinks } from '../lib/linkStore'
import { authErrorMessage } from '../lib/authError'
import * as avatar from '../lib/avatarStore'
import { compressPhoto } from '../lib/image'
import SwatchPicker from '../components/SwatchPicker'
import { useThemeContext } from '../lib/theme'
import { ACCENTS, accentSwatch } from '../lib/accent'
import { PAPERS, paperSwatch } from '../lib/paper'

// マイページ。**設定から1枚めくったところ。**
//
// 2026-08-15 まで設定の中に畳んであり、押すとアドレスが開くだけだった。
// **開いた先が同じ画面だと、めくった感じがしない。**
//
// **2026-09-04 に「アカウント」から改称し、灯りの色と紙の色を移した**
// （作者の指示）。設定は道具の設定、こちらは**自分の場所の設え**。
// 色を選ぶのは後者で、アドレスや画像と並ぶ方が素直だった。
//
// ここに置くのは「自分が誰として使っているか」と、その場所の見え方。
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
  // 色の選択（`lib/theme.js`）。見本は**いま見ている側**で引く
  const { isDark, accent, setAccent, paper, setPaper } = useThemeContext()
  const [email, setEmail] = useState('')
  const [since, setSince] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  // **「削除」と打たせる**（2026-08-15）。押し間違いで全部消えない
  const [typed, setTyped] = useState('')

  const [avatarUri, setAvatarUri] = useState(() => avatar.load())
  const [avatarError, setAvatarError] = useState('')

  const [password, setPassword] = useState('')
  const [changing, setChanging] = useState(false)
  const [passwordDone, setPasswordDone] = useState(false)
  const [passwordError, setPasswordError] = useState('')

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

  // アカウントの画像。**端末の中だけ**（`lib/avatarStore.js`）。
  // サーバーに置けば開発者が顔写真を見られる。記録の写真より本人に近い。
  async function pickAvatar() {
    setAvatarError('')
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
      })
      if (result.canceled) return
      const asset = result.assets[0]
      // 記録の写真と同じ手順で縮める。大きいまま端末に置かない
      const { photo } = await compressPhoto(asset.uri, asset.width, asset.height)
      setAvatarUri(avatar.save(photo))
    } catch (e) {
      console.warn('[Account] 画像の設定に失敗', e)
      setAvatarError('画像を設定できませんでした。')
    }
  }

  function clearAvatar() {
    avatar.remove()
    setAvatarUri(null)
  }

  // パスワードの変更。**いまのセッションで変える。**
  // 古いパスワードは聞かない（Supabase が求めていない）。
  // 端末が他人の手にある状況はアプリの外の問題で、
  // ここで1枚挟んでも守れない。
  async function changePassword() {
    if (password.length < 6) {
      setPasswordError('パスワードは6文字以上で設定してください。')
      return
    }
    setChanging(true)
    setPasswordError('')
    try {
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) throw err
      setPassword('')
      setPasswordDone(true)
    } catch (e) {
      setPasswordError(authErrorMessage(e))
    } finally {
      setChanging(false)
    }
  }

  // 記録を消してから認証の利用者を消す（サーバー側 modules/account.py）。
  // 成功したらサインアウトする。セッションだけ残ると、
  // 消えたはずのアカウントで画面が開いたままになる。
  async function handleDelete() {
    setDeleting(true)
    setError('')
    try {
      const res = await authFetch('/api/account', { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      // **控えも消す。**退会したのに記録が端末に残るのはおかしい
      await forgetLogs()
      forgetAllLights()
      // 添えたリンクも**前の人のものを次の人に見せない**
      forgetLinks()
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
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center px-5 h-11">
        <Pressable onPress={back} className="min-h-touch justify-center active:opacity-70">
          <Text className="text-body-md text-primary">← 設定</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="px-5 pt-4 gap-6 w-full max-w-read self-center">
        <View className="items-center gap-3 py-4">
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={{ width: 96, height: 96 }}
              className="rounded-full"
              resizeMode="cover"
            />
          ) : (
            <AccountMark email={email} size={96} />
          )}
          {avatar.isSupported ? (
            <View className="flex-row gap-4">
              <Pressable onPress={pickAvatar} className="min-h-touch justify-center active:opacity-70">
                <Text className="text-label-md text-primary">
                  {avatarUri ? '画像を変える' : '画像を設定'}
                </Text>
              </Pressable>
              {avatarUri ? (
                <Pressable onPress={clearAvatar} className="min-h-touch justify-center active:opacity-70">
                  <Text className="text-label-md text-outline">外す</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {avatarError ? <Text className="text-label-md text-error">{avatarError}</Text> : null}
          <Text className="text-body-md text-on-surface">{email}</Text>
        </View>

        <View className="bg-surface-lowest rounded-lg px-4 shadow-bloom">
          <Row label="メールアドレス" value={email} />
          {/* **事実だけ。** 「◯日目です」のような数え方はしない */}
          <Row label="使いはじめた日" value={since} isLast />
        </View>

        {/* パスワードの変更 */}
        <View>
          <Text className="font-strong text-label-md text-on-surface-variant mb-2">
            パスワードの変更
          </Text>
          <View className="bg-surface-lowest rounded-lg px-4 shadow-bloom">
            <AuthField
              icon="lock"
              label="新しいパスワード"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={changePassword}
            />
            {/* 条件は失敗する前に出す */}
            <Text className="text-label-md text-outline py-3">パスワードは6文字以上</Text>
          </View>
          {passwordError ? (
            <Text className="text-label-md text-error mt-2">{passwordError}</Text>
          ) : null}
          {passwordDone ? (
            <Text className="text-label-md text-ai-ink mt-2">新しいパスワードを設定しました。</Text>
          ) : null}
          <Pressable
            onPress={changePassword}
            disabled={changing || !password}
            className="self-end border border-outline-variant rounded-full px-4 min-h-touch justify-center mt-3 disabled:opacity-40"
          >
            <Text className="text-label-md text-primary">
              {changing ? '変更中...' : '変更する'}
            </Text>
          </Pressable>
        </View>

        {/* **色は設定から移した**（2026-09-04・作者の指示）。
            灯りと紙は別の選択なので、区画も分ける（`lib/accent.js` /
            `lib/paper.js`）。明暗の切り替えは設定に残してある——
            あれは色ではなく、いつ何を出すかの設定。 */}
        <SwatchPicker
          title="灯りの色"
          options={ACCENTS}
          value={accent}
          onChange={setAccent}
          swatchOf={(id) => accentSwatch(id, isDark)}
        />

        <SwatchPicker
          title="紙の色"
          options={PAPERS}
          value={paper}
          onChange={setPaper}
          swatchOf={(id) => paperSwatch(id, isDark)}
        />

        <Text className="text-label-md text-outline leading-relaxed">
          記録とアイデアはこのアカウントに紐づいています。
          写真・添付・アカウントの画像は端末の中だけにあり、サーバーには送っていません。
        </Text>

        {/* App Store のガイドライン 5.1.1(v)。無効化では足りない。

            **「削除」と打たせる**（2026-08-15）。
            2段階の確認は押し間違いを防ぐが、**続けて2回押すのは案外簡単**。
            打つ手間を挟むと、何をしようとしているかを一度読むことになる。 */}
        <Pressable
          onPress={() => { setConfirmDelete(true); setTyped(''); setError('') }}
          className="items-center min-h-touch justify-center"
        >
          <Text className="text-label-md text-outline underline">アカウントを削除する</Text>
        </Pressable>

        <Modal
          visible={confirmDelete}
          animationType="fade"
          transparent
          onRequestClose={() => setConfirmDelete(false)}
        >
          <View className="flex-1 bg-black/50 items-center justify-center px-6">
            <View className="w-full max-w-sm bg-surface rounded-lg p-5 gap-3">
              <Text className="font-strong text-body-md text-on-surface">アカウントを削除する</Text>
              <Text className="text-body-md text-on-surface leading-relaxed">
                記録・アイデア・連携がすべて消え、元に戻せません。
              </Text>
              <Text className="text-label-md text-outline leading-relaxed">
                端末の中にある写真と添付は消えません。手元に残しておきたい記録があれば、
                先にエクスポートしてください。
              </Text>
              <Text className="text-label-md text-on-surface-variant mt-1">
                続けるには「削除」と入力してください。
              </Text>
              <TextInput
                value={typed}
                onChangeText={setTyped}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="削除"
                placeholderTextColor="#8E8478"
                className="bg-surface-low border border-border rounded px-3 py-3 font-body text-body-md text-on-surface"
              />
              {error ? <Text className="text-label-md text-error">{error}</Text> : null}
              <View className="flex-row justify-end gap-3 pt-1">
                <Pressable
                  onPress={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="min-h-touch px-3 justify-center disabled:opacity-50"
                >
                  <Text className="text-label-md text-primary">やめる</Text>
                </Pressable>
                <Pressable
                  onPress={handleDelete}
                  disabled={deleting || typed.trim() !== '削除'}
                  className="border border-error/40 rounded-full px-4 min-h-touch justify-center disabled:opacity-30"
                >
                  <Text className="font-strong text-label-md text-error">
                    {deleting ? '削除中...' : '削除する'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

      </ScrollView>
    </SafeAreaView>
  )
}
