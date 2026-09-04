import { Pressable, View } from 'react-native'
import * as Sharing from 'expo-sharing'
import Svg, { Path } from 'react-native-svg'
import Text from './Text'
import { remove } from '../lib/fileStore'

// 記録に添えたファイルの一覧。
//
// **端末の中だけにある**（`lib/fileStore.js`）。
// 大きさは出すが、**件数は出さない。** 多い/少ないを評価しない。
//
// 開くのは共有シート。中身を見せる画面は作らない。
// PDF も zip も音声もあり得るので、**開き方は OS に任せる。**
function Doc({ color }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function readableSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// `onRemove` を渡すと、消し方をそちらに任せる（2026-09-05）。
// **まだ端末に置いていないファイル**（新しい記録に添えたもの）は、
// 置き場所が無いので `fileStore` では消せない（`RecordForm`）。
export default function FileList({ files, onChange, onRemove }) {
  if (!files || files.length === 0) return null

  async function open(file) {
    try {
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri)
    } catch (e) {
      console.warn('[File] 開けなかった', e)
    }
  }

  function drop(file) {
    if (onRemove) {
      onRemove(file)
      return
    }
    remove(file.uri)
    onChange()
  }

  return (
    <View className="bg-surface-lowest border border-border rounded-lg overflow-hidden">
      {files.map((file, i) => (
        <View
          key={file.uri}
          className={`flex-row items-center gap-3 px-4 py-3 ${
            i === files.length - 1 ? '' : 'border-b border-border'
          }`}
        >
          <Doc color="#847563" />
          <Pressable onPress={() => open(file)} className="flex-1 min-h-touch justify-center">
            <Text className="text-body-md text-on-surface" numberOfLines={1}>
              {file.name}
            </Text>
            {file.size ? (
              <Text className="text-label-sm text-outline mt-0.5">{readableSize(file.size)}</Text>
            ) : null}
          </Pressable>
          <Pressable
            onPress={() => drop(file)}
            accessibilityLabel={`${file.name} を外す`}
            hitSlop={8}
            className="min-h-touch justify-center px-1"
          >
            <Text className="text-label-md text-outline">✕</Text>
          </Pressable>
        </View>
      ))}
    </View>
  )
}
