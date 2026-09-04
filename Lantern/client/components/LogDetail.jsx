import { useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import Text from './Text'
import { authFetch } from '../lib/supabase'
import RichText from './RichText'
import { remove as removePhoto, save as savePhoto } from '../lib/photoStore'
import PhotoPicker from './PhotoPicker'

// Web版 Journal.jsx の LogDetail を移植したもの。表示・編集・削除の挙動と文言は変更していない。
const DISPLAY_FIELDS = [
  { key: 'created', label: 'やったこと' },
  { key: 'enjoyable', label: 'よかったこと' },
  { key: 'struggled', label: '困ったこと' },
  { key: 'next', label: '次にやること' },
]

// **直せるのは「やったこと」だけ**（2026-09-04・作者の指示
// 「3つの入力フィールドに関しては削除で」）。
//
// 書く側からは 2026-09-04 に消した（`components/RecordForm.jsx`）。
// **直す側にだけ残っていると、消したはずの欄が別の入口から生えてくる。**
//
// 読む側（`DISPLAY_FIELDS`）は4つのまま。これまでの記録に中身が
// 入っており、**編集できないことと、見えないことは別**。
// 消したのは入力欄であって、記録ではない。
//
// 保存では触っていない3つを**そのまま送り直す**（`handleSave`）。
// 送らないとサーバーは空文字で上書きする（`main.py` の `/save` は
// 4項目を毎回置き換える）。
const EDIT_FIELDS = [
  { field: 'created', label: 'やったこと', placeholder: 'この日やったこと' },
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

  function handleEditStart() {
    // **開くのは「やったこと」だけ。** 残り3つは触らずに持ち回る
    setEditForm({ created: log.created || '' })
    setEditing(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      // **id を送る**（2026-09-03）。消すのは 2026-09-02 に id へ移したが、
      // **直す方は日付のままだった。**
      //
      // 日付だけで送ると、サーバーはその日の**最初の**記録を書き換える
      // （`main.py` の `/save`）。1日に複数件置けるようにしてから、
      // 夜の記録を直すと朝の記録が消える経路になっていた。
      //
      // ここは「書く」と違って**必ず既存を直す**ので `new` は送らない。
      const res = await authFetch('/save', {
        method: 'POST',
        // **触っていない3つも送り直す**（2026-09-04）。
        // `/save` は4項目を毎回置き換えるので、送らないと空になる。
        // 入力欄は消したが、**入っているものは消さない。**
        body: JSON.stringify({
          enjoyable: log.enjoyable || '',
          struggled: log.struggled || '',
          next: log.next || '',
          ...editForm,
          id: log.id,
          date: log.date,
        }),
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
            <Text className="text-[10px] text-outline mb-1">{label}</Text>
            <TextInput
              value={editForm[field]}
              onChangeText={(v) => setEditForm((f) => ({ ...f, [field]: v }))}
              placeholder={placeholder}
              placeholderTextColor="#8E8478"
              multiline
              textAlignVertical="top"
              style={{ minHeight: 72 }}
              className="bg-surface-low border border-border rounded px-3 py-2.5 font-body text-body text-on-surface"
            />
          </View>
        ))}
        <View className="flex-row justify-end items-center gap-4 pt-1">
          <Pressable onPress={() => { setEditing(false); setEditForm({}) }}>
            <Text className="text-aux text-outline">キャンセル</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            className="border border-ai-ink/40 rounded-full px-3.5 py-1.5 disabled:opacity-50"
          >
            <Text className="text-aux text-primary">{saving ? '保存中...' : '保存する'}</Text>
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
            <Pressable onPress={handleEditStart}>
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
