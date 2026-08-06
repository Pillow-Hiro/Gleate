import { useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
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
export default function PhotoPicker({ photoUrl, onSelect, onRemove, disabled }) {
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

  return (
    <View className="gap-2">
      {photoUrl ? (
        <View>
          <Pressable onPress={() => setZoomed(true)} accessibilityLabel="写真を拡大する">
            <Image
              source={{ uri: photoUrl }}
              className="w-full rounded-lg"
              style={{ height: 200 }}
              resizeMode="cover"
            />
          </Pressable>
          <View className="flex-row justify-end gap-4 mt-1.5">
            <Pressable onPress={handlePick} disabled={disabled || busy}>
              <Text className="text-xs text-ink-faint">選び直す</Text>
            </Pressable>
            <Pressable onPress={handleRemove} disabled={disabled || busy}>
              <Text className="text-xs text-ink-faint">削除</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={handlePick}
          disabled={disabled || busy}
          className="border border-border border-dashed rounded-lg py-4 items-center"
        >
          <Text className="text-xs text-ink-faint">{busy ? '読み込み中...' : '写真を追加'}</Text>
        </Pressable>
      )}

      {error ? <Text className="text-xs text-ink-faint">{error}</Text> : null}

      <PhotoLightbox src={zoomed ? photoUrl : null} onClose={() => setZoomed(false)} />
    </View>
  )
}
