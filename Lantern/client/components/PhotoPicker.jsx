import { useEffect, useState } from 'react'
import { Image, Pressable, View } from 'react-native'
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import Text from './Text'
import * as ImagePicker from 'expo-image-picker'
import { compressPhoto } from '../lib/image'
import PhotoLightbox from './PhotoLightbox'

// ネイティブ版。SDK 57 では MediaTypeOptions が非推奨のため mediaTypes に配列を渡す。
//
// 写真は端末の中だけに置く（2026-08-06〜）。Web には置き場所が無いため
// PhotoPicker.web.jsx が何も描かない。理由は lib/photoStore.web.js にある。
//
// Platform.OS で分岐せずファイルを分けているのは、そうしないと
// expo-image-picker と写真まわりの文言が Web バンドルに乗ってしまうため。
// 道具の列に置く小さな絵。**絵文字は使わない**ので図形で描く
function ImageIcon({ color = '#514535' }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4.5" width="18" height="15" rx="2.5" stroke={color} strokeWidth="1.8" />
      <Circle cx="8.5" cy="9.5" r="1.6" fill={color} />
      <Path d="M4 17l4.5-4.5 3.5 3.5 3-3L20 17" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

// `compact` … 道具の列に置くアイコンだけの入口
// `previewOnly` … 選んだ写真の見た目だけ（入口は別の場所にある）
export default function PhotoPicker({
  photoUrl,
  onSelect,
  onRemove,
  disabled,
  compact,
  previewOnly,
  onReady,
}) {
  const [status, requestPermission] = ImagePicker.useMediaLibraryPermissions()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [zoomed, setZoomed] = useState(false)

  async function handlePick() {
    setError('')
    if (!status?.granted) {
      const next = await requestPermission()
      if (!next.granted) {
        setError('写真へのアクセスが許可されていません。')
        return
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
    })
    if (result.canceled) return

    const asset = result.assets[0]
    setBusy(true)
    try {
      const { photo, thumb } = await compressPhoto(asset.uri, asset.width, asset.height)
      await onSelect(photo, thumb)
    } catch (e) {
      console.warn('[Photo] 写真の処理に失敗', e)
      setError('写真を読み込めませんでした。')
    } finally {
      setBusy(false)
    }
  }

  // **選ぶ手続きだけを外へ渡す。**
  // キーボードの上のボタン（`EditorToolbar`）から呼ぶため。
  // 権限の確認も圧縮もここが持っているので、二重に書かない。
  useEffect(() => {
    if (onReady) onReady(handlePick)
  })

  async function handleRemove() {
    setBusy(true)
    setError('')
    try {
      await onRemove()
    } catch (e) {
      console.warn('[Photo] 写真の削除に失敗', e)
      setError('写真を削除できませんでした。')
    } finally {
      setBusy(false)
    }
  }

  // 道具の列に入る形。**押すと写真を選ぶ。** 選び直しも同じ入口
  if (compact) {
    return (
      <Pressable
        onPress={handlePick}
        disabled={disabled || busy}
        accessibilityLabel={photoUrl ? '写真を選び直す' : '写真を追加'}
        className={`min-w-touch min-h-touch items-center justify-center rounded active:bg-surface-low ${
          busy ? 'opacity-40' : ''
        }`}
      >
        <ImageIcon color={photoUrl ? '#825500' : '#514535'} />
      </Pressable>
    )
  }

  // 入口を別に置いてあるときは、選んだ写真だけを見せる
  if (previewOnly && !photoUrl) return null

  return (
    <View className="gap-2">
      {photoUrl ? (
        <View>
          <Pressable onPress={() => setZoomed(true)} accessibilityLabel="写真を拡大する">
            <Image
              source={{ uri: photoUrl }}
              className="w-full rounded"
              style={{ height: 200 }}
              resizeMode="cover"
            />
          </Pressable>
          <View className="flex-row justify-end gap-4 mt-1.5">
            {previewOnly ? null : (
              <Pressable onPress={handlePick} disabled={disabled || busy} className="min-h-touch justify-center">
                <Text className="text-label-md text-outline">選び直す</Text>
              </Pressable>
            )}
            <Pressable onPress={handleRemove} disabled={disabled || busy} className="min-h-touch justify-center">
              <Text className="text-label-md text-outline">削除</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={handlePick}
          disabled={disabled || busy}
          className="border border-border border-dashed rounded py-4 items-center"
        >
          <Text className="text-label-md text-outline">{busy ? '読み込み中...' : '写真を追加'}</Text>
        </Pressable>
      )}

      {error ? <Text className="text-label-md text-outline">{error}</Text> : null}

      <PhotoLightbox src={zoomed ? photoUrl : null} onClose={() => setZoomed(false)} />
    </View>
  )
}
