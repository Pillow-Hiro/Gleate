import { useState } from 'react'
import { useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'
import Text from './Text'
import { authFetch } from '../lib/supabase'
import RichText from './RichText'
import { remove as removePhoto, save as savePhoto } from '../lib/photoStore'
import PhotoPicker from './PhotoPicker'

// 記録の1件を読む。**直すのはここではない**（2026-09-05・作者の指示）。
//
// 2026-09-04 まで、押すと4欄（のちに1欄）が開いた。装飾も写真も無い
// **二等の書く場所**で、全画面には有るものが揃っていなかった。
// 「編集」は `/write?id=` へ送る。書く場所を2つに分けない。
//
// 出すのは4項目とも。**これまでの記録に中身が入っており、
// 編集できないことと、見えないことは別。**
const DISPLAY_FIELDS = [
  { key: 'created', label: 'やったこと' },
  { key: 'enjoyable', label: 'よかったこと' },
  { key: 'struggled', label: '困ったこと' },
  { key: 'next', label: '次にやること' },
]

export default function LogDetail({ log, onDelete, onUpdate }) {
  const router = useRouter()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      // **id で消す**（2026-09-02）。日付版は同じ日を全部消すので、
      // 1日に複数件あると、片方を消したいときに両方消える
      await authFetch(`/api/logs/by-id/${log.id}`, { method: 'DELETE' })
      if (onDelete) onDelete(log.id, log.date)
    } catch (e) {
      console.warn(`[Journal] ${log.date} の削除に失敗`, e)
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  // 写真は端末の中にだけ置く。サーバーには送らない（lib/photoStore.js）。
  // テキストの保存（/save）とは経路が別なので、片方が他方を消すことはない。
  async function handlePhotoSelect(photo, thumb) {
    const urls = savePhoto(log.date, photo, thumb)
    if (onUpdate) onUpdate({ ...log, ...urls })
  }

  async function handlePhotoRemove() {
    removePhoto(log.date)
    if (onUpdate) onUpdate({ ...log, photo_url: null, photo_thumb_url: null })
  }

  return (
    <View className="mt-3 gap-2.5 pb-1">
      {DISPLAY_FIELDS.map(({ key, label }) =>
        log[key] ? (
          <View key={key}>
            <Text className="text-[10px] text-outline">{label}</Text>
            {/* 「やったこと」だけ装飾できる。他は素のテキスト。
                読む側も同じ扱いにする（RichText は素の文もそのまま出す） */}
            <View className="mt-0.5">
              <RichText text={log[key]} className="text-body text-on-surface leading-relaxed" />
            </View>
          </View>
        ) : null
      )}

      <PhotoPicker
        photoUrl={log.photo_url}
        onSelect={handlePhotoSelect}
        onRemove={handlePhotoRemove}
        disabled={deleting}
      />

      {log.ai_response ? (
        <View className="bg-ai-surface/60 border border-ai-ink/20 rounded-lg px-5 py-4 gap-1.5 mt-3">
          <Text className="text-[10px] tracking-[2px] text-ai-ink">LANTERN</Text>
          <Text className="text-body text-primary leading-relaxed">{log.ai_response}</Text>
        </View>
      ) : null}

      <View className="pt-1 flex-row justify-end items-center gap-3">
        {confirmDelete ? (
          <>
            <Text className="text-aux text-outline">削除しますか？</Text>
            <Pressable onPress={() => setConfirmDelete(false)}>
              <Text className="text-aux text-outline">キャンセル</Text>
            </Pressable>
            <Pressable onPress={handleDelete} disabled={deleting}>
              <Text className="text-aux text-error">{deleting ? '削除中...' : '削除する'}</Text>
            </Pressable>
          </>
        ) : (
          <>
            {/* **直すのも全画面**（2026-09-05・作者の指示）。
                ここに欄を出すと、装飾も写真も無い**二等の書く場所**に
                なる。書く場所を2つに分けない（`app/write.jsx`）。 */}
            <Pressable
              onPress={() => router.push({ pathname: '/write', params: { id: log.id } })}
            >
              <Text className="text-aux text-outline">編集</Text>
            </Pressable>
            <Pressable onPress={() => setConfirmDelete(true)}>
              <Text className="text-aux text-error">削除</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  )
}
