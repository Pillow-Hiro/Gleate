import { Image, Modal, Pressable, Text, View } from 'react-native'

// Web版 components/PhotoLightbox.jsx と同じ役割。
// サムネイルではなく本体（photo_url）を渡すこと。縮小版を拡大しても意味がない。
// 記録モーダルの中から開くため Modal の入れ子になる。
export default function PhotoLightbox({ src, onClose }) {
  return (
    <Modal visible={Boolean(src)} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/90 items-center justify-center" onPress={onClose}>
        {src ? (
          <Image
            source={{ uri: src }}
            className="w-full h-full"
            resizeMode="contain"
            accessibilityLabel="写真"
          />
        ) : null}
        <View className="absolute top-12 right-5">
          <Pressable onPress={onClose} accessibilityLabel="閉じる" className="p-2">
            <Text className="text-white text-base">✕</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  )
}
