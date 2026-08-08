import { useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import Text from './Text'
import { authFetch } from '../lib/supabase'
import { remove as removePhoto, save as savePhoto } from '../lib/photoStore'
import PhotoPicker from './PhotoPicker'

// Web版 Journal.jsx の LogDetail を移植したもの。表示・編集・削除の挙動と文言は変更していない。
const DISPLAY_FIELDS = [
  { key: 'created', label: 'やったこと' },
  { key: 'enjoyable', label: 'よかったこと' },
  { key: 'struggled', label: '困ったこと' },
  { key: 'next', label: '次にやること' },
]

const EDIT_FIELDS = [
  { field: 'created', label: 'やったこと', placeholder: '今日やったこと' },
  { field: 'enjoyable', label: 'よかったこと', placeholder: 'よかったこと' },
  { field: 'struggled', label: '困ったこと', placeholder: '詰まったこと' },
  { field: 'next', label: '次にやること', placeholder: '（任意）' },
]

export default function LogDetail({ log, onDelete, onUpdate }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await authFetch(`/api/logs/${log.date}`, { method: 'DELETE' })
      if (onDelete) onDelete(log.date)
    } catch (e) {
      console.warn(`[Journal] ${log.date} の削除に失敗`, e)
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  function handleEditStart() {
    setEditForm({
      created: log.created || '',
      enjoyable: log.enjoyable || '',
      struggled: log.struggled || '',
      next: log.next || '',
    })
    setEditing(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await authFetch('/save', {
        method: 'POST',
        body: JSON.stringify({ date: log.date, ...editForm }),
      })
      if (!res.ok) throw new Error('save failed')
      const data = await res.json()
      if (onUpdate) {
        onUpdate({ ...log, ...editForm, ai_response: data.ai_response ?? log.ai_response })
      }
      setEditing(false)
    } catch (e) {
      // エラー時は編集状態を維持し、入力を捨てない
      console.warn(`[Journal] ${log.date} の保存に失敗`, e)
    } finally {
      setSaving(false)
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

  if (editing) {
    return (
      <View className="mt-3 gap-3 pb-1">
        {EDIT_FIELDS.map(({ field, label, placeholder }) => (
          <View key={field}>
            <Text className="text-[10px] text-ink-faint mb-1">{label}</Text>
            <TextInput
              value={editForm[field]}
              onChangeText={(v) => setEditForm((f) => ({ ...f, [field]: v }))}
              placeholder={placeholder}
              placeholderTextColor="#999999"
              multiline
              textAlignVertical="top"
              style={{ minHeight: 72 }}
              className="bg-stone border border-border rounded-lg px-3 py-2.5 font-body text-body text-ink"
            />
          </View>
        ))}
        <View className="flex-row justify-end items-center gap-4 pt-1">
          <Pressable onPress={() => { setEditing(false); setEditForm({}) }}>
            <Text className="text-aux text-ink-faint">キャンセル</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            className="border border-sage/40 rounded-full px-3.5 py-1.5 disabled:opacity-50"
          >
            <Text className="text-aux text-forest">{saving ? '保存中...' : '保存する'}</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View className="mt-3 gap-2.5 pb-1">
      {DISPLAY_FIELDS.map(({ key, label }) =>
        log[key] ? (
          <View key={key}>
            <Text className="text-[10px] text-ink-faint">{label}</Text>
            <Text className="text-body text-ink leading-relaxed mt-0.5">{log[key]}</Text>
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
        <View className="bg-sage-light/60 border border-sage/20 rounded-xl px-5 py-4 gap-1.5 mt-3">
          <Text className="text-[10px] tracking-[2px] text-sage">LANTERN</Text>
          <Text className="text-body text-forest leading-relaxed">{log.ai_response}</Text>
        </View>
      ) : null}

      <View className="pt-1 flex-row justify-end items-center gap-3">
        {confirmDelete ? (
          <>
            <Text className="text-aux text-ink-faint">削除しますか？</Text>
            <Pressable onPress={() => setConfirmDelete(false)}>
              <Text className="text-aux text-ink-faint">キャンセル</Text>
            </Pressable>
            <Pressable onPress={handleDelete} disabled={deleting}>
              <Text className="text-aux text-red-500">{deleting ? '削除中...' : '削除する'}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable onPress={handleEditStart}>
              <Text className="text-aux text-ink-faint">編集</Text>
            </Pressable>
            <Pressable onPress={() => setConfirmDelete(true)}>
              <Text className="text-aux text-red-500">削除</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  )
}
