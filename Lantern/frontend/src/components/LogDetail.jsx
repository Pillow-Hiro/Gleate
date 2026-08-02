import { useState } from 'react'
import { authFetch, uploadPhoto, removePhoto } from '../lib/supabase'
import PhotoPicker from './PhotoPicker'

// 1日の記録の詳細表示・編集・削除。
// 記録そのものを尊重するため、内容には何も加工を加えず、そのまま並べる。
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
        headers: { 'Content-Type': 'application/json' },
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

  function handleCancel() {
    setEditing(false)
    setEditForm({})
  }

  // 写真はテキストと別APIで扱う。/save は写真カラムに触れないため、
  // ここで更新しても後のテキスト編集で消えることはない。
  async function handlePhotoSelect(photo, thumb) {
    const data = await uploadPhoto(log.date, photo, thumb)
    if (onUpdate) onUpdate({ ...log, ...data })
  }

  async function handlePhotoRemove() {
    await removePhoto(log.date)
    if (onUpdate) onUpdate({ ...log, photo_url: null, photo_thumb_url: null })
  }

  const displayFields = [
    { key: 'created', label: 'やったこと' },
    { key: 'enjoyable', label: 'よかったこと' },
    { key: 'struggled', label: '困ったこと' },
    { key: 'next', label: '次にやること' },
  ]

  const editFields = [
    { field: 'created', label: 'やったこと', placeholder: '今日やったこと' },
    { field: 'enjoyable', label: 'よかったこと', placeholder: 'よかったこと' },
    { field: 'struggled', label: '困ったこと', placeholder: '詰まったこと' },
    { field: 'next', label: '次にやること', placeholder: '（任意）' },
  ]

  if (editing) {
    return (
      <div className="mt-3 space-y-3 pb-1">
        {editFields.map(({ field, label, placeholder }) => (
          <div key={field}>
            <label className="text-[10px] text-ink-faint tracking-wider uppercase block mb-1">{label}</label>
            <textarea
              value={editForm[field]}
              onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))}
              placeholder={placeholder}
              rows={3}
              className="w-full bg-stone border border-border rounded-lg px-3 py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-sage/50 transition-colors resize-none"
            />
          </div>
        ))}
        <div className="flex items-center justify-end gap-4 pt-1">
          <button onClick={handleCancel} className="text-xs text-ink-faint hover:text-ink transition-colors">
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs text-forest border border-sage/40 px-3.5 py-1.5 rounded-full hover:bg-sage-light transition-colors disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-2.5 pb-1">
      {displayFields.map(({ key, label }) =>
        log[key] ? (
          <div key={key}>
            <span className="text-[10px] text-ink-faint tracking-wider uppercase">{label}</span>
            <p className="text-sm text-ink leading-relaxed mt-0.5">{log[key]}</p>
          </div>
        ) : null
      )}

      <PhotoPicker
        photoUrl={log.photo_url}
        onSelect={handlePhotoSelect}
        onRemove={handlePhotoRemove}
        disabled={deleting}
      />

      {log.ai_response && (
        <div className="bg-sage-light/60 border border-sage/20 rounded-xl px-5 py-4 space-y-1.5 mt-3">
          <p className="text-[10px] tracking-[0.18em] uppercase text-sage">Lantern</p>
          <p className="text-sm text-forest leading-relaxed">{log.ai_response}</p>
        </div>
      )}
      <div className="pt-1 flex justify-end items-center gap-3">
        {confirmDelete ? (
          <>
            <span className="text-xs text-ink-faint">削除しますか？</span>
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-ink-faint hover:text-ink transition-colors">
              キャンセル
            </button>
            <button onClick={handleDelete} disabled={deleting} className="text-xs text-red-500 hover:text-red-600 transition-colors disabled:opacity-50">
              {deleting ? '削除中...' : '削除する'}
            </button>
          </>
        ) : (
          <>
            <button onClick={handleEditStart} className="text-xs text-ink-faint hover:text-forest transition-colors">
              編集
            </button>
            <button onClick={() => setConfirmDelete(true)} className="text-xs text-ink-faint hover:text-red-500 transition-colors">
              削除
            </button>
          </>
        )}
      </div>
    </div>
  )
}
