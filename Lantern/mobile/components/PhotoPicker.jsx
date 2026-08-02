import { useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { compressPhoto } from '../lib/image'

// Web版 components/PhotoPicker.jsx と同じ役割。
// SDK 57 では MediaTypeOptions が非推奨のため mediaTypes に配列を渡す。
export default function PhotoPicker({ photoUrl, onSelect, onRemove, disabled }) {
  const [status, requestPermission] = ImagePicker.useMediaLibraryPermissions()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

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
          <Image
            source={{ uri: photoUrl }}
            className="w-full rounded-lg"
            style={{ height: 200 }}
            resizeMode="cover"
          />
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
    </View>
  )
}
