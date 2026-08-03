import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { authFetch, uploadPhoto, removePhoto } from '../lib/supabase'
import { todayStr } from '../lib/date'
import PhotoPicker from './PhotoPicker'

// Web版 frontend/src/pages/Home.jsx の RecordForm を移植したもの。
// 文言・保存先・項目は変更していない。
export default function RecordForm({ existingLog, targetDate, onSaved }) {
  const isToday = targetDate === todayStr()
  const [form, setForm] = useState({
    created: existingLog?.created || '',
    enjoyable: existingLog?.enjoyable || '',
    struggled: existingLog?.struggled || '',
    next: existingLog?.next || '',
  })
  const [detailOpen, setDetailOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState(existingLog?.ai_response || '')
  const [saveError, setSaveError] = useState('')
  const [photoUrl, setPhotoUrl] = useState(existingLog?.photo_url || null)

  // 写真は別APIで即座に保存する。テキストの「記録する」を待たない。
  // ここで onSaved() を呼ばないのは、logs を取り直すと key が変わって
  // このフォームが作り直され、入力途中のテキストが消えるため。
  async function handlePhotoSelect(photo, thumb) {
    const data = await uploadPhoto(targetDate, photo, thumb)
    setPhotoUrl(data.photo_url)
  }

  async function handlePhotoRemove() {
    await removePhoto(targetDate)
    setPhotoUrl(null)
  }

  async function handleSave() {
    setLoading(true)
    setAiResponse('')
    setSaveError('')
    try {
      const res = await authFetch('/save', {
        method: 'POST',
        body: JSON.stringify({ ...form, date: targetDate }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.ai_response) setAiResponse(data.ai_response)
      if (onSaved) onSaved()
    } catch (e) {
      // 画面にはユーザー向けの一文だけ出す。詳細はログに残す
      console.warn('[Home] 記録の保存に失敗', e)
      setSaveError('保存に失敗しました。接続を確認してください。')
    } finally {
      setLoading(false)
    }
  }

  function Field({ fieldKey, label, rows = 2, placeholder = '（任意）' }) {
    return (
      <View>
        <Text className="text-xs text-ink-faint mb-1.5">{label}</Text>
        <TextInput
          value={form[fieldKey]}
          onChangeText={(v) => setForm((f) => ({ ...f, [fieldKey]: v }))}
          multiline
          textAlignVertical="top"
          style={{ minHeight: rows * 22 + 16 }}
          className="bg-cream border border-border rounded px-3 py-2 text-sm text-ink"
          placeholder={placeholder}
          placeholderTextColor="#999999"
        />
      </View>
    )
  }

  return (
    <View className="border border-border rounded-lg px-5 py-4 gap-4">
      {existingLog ? (
        <View className="self-start bg-sage-light rounded-full px-2 py-0.5">
          <Text className="text-[10px] text-sage">記録済</Text>
        </View>
      ) : null}

      <Field
        fieldKey="created"
        label={`${isToday ? '今日' : 'この日'}のこと`}
        rows={5}
        placeholder={`${isToday ? '今日' : 'この日'}どんなことをしましたか？`}
      />
      <Field fieldKey="next" label="次にやること" />

      {/* Web版はCSS gridで開閉していたが、RNにgridがないため出し分けで表現する */}
      <Pressable
        onPress={() => setDetailOpen((o) => !o)}
        className="flex-row items-center gap-1.5"
      >
        <Text className="text-xs text-ink-faint">{detailOpen ? '⌄' : '›'}</Text>
        <Text className="text-xs text-ink-faint">
          {detailOpen ? 'もっと詳しく書く（閉じる）' : 'もっと詳しく書く'}
        </Text>
      </Pressable>

      {detailOpen ? (
        <View className="gap-4 pt-1">
          <Field fieldKey="enjoyable" label="よかったこと・楽しかったこと" />
          <Field fieldKey="struggled" label="詰まったこと・困ったこと" />
        </View>
      ) : null}

      <PhotoPicker
        photoUrl={photoUrl}
        onSelect={handlePhotoSelect}
        onRemove={handlePhotoRemove}
        disabled={loading}
      />

      <Pressable
        onPress={handleSave}
        disabled={loading}
        className="bg-forest dark:bg-primary rounded py-2.5 items-center active:opacity-80 disabled:opacity-50"
      >
        <Text className="text-sm text-cream dark:text-primary-text">
          {loading ? '保存中...' : '記録する'}
        </Text>
      </Pressable>

      {saveError ? (
        <Text className="text-xs text-red-500 text-center">{saveError}</Text>
      ) : null}

      {aiResponse ? (
        <View className="bg-sage-light/60 border border-sage/20 rounded-xl px-5 py-4 mt-4 gap-1.5">
          <Text className="text-[10px] tracking-[2px] text-sage">LANTERN</Text>
          <Text className="text-sm leading-relaxed text-forest">{aiResponse}</Text>
        </View>
      ) : null}
    </View>
  )
}
