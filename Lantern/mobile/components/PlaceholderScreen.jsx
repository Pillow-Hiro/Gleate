import { SafeAreaView, Text, View } from 'react-native'

// A1（土台）用の仮画面。A2以降で各画面の実装に置き換える。
export default function PlaceholderScreen({ label, title, phase }) {
  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-1 px-5 pt-6">
        <Text className="text-[10px] text-ink-faint tracking-[3px] uppercase mb-0.5">{label}</Text>
        <Text className="font-display text-xl font-light text-ink">{title}</Text>
        <View className="flex-1 items-center justify-center">
          <Text className="text-xs text-ink-faint">{phase} で実装します</Text>
        </View>
      </View>
    </SafeAreaView>
  )
}
