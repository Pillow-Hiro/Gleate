import { useRef, useState } from 'react'
import { compressPhoto } from '../lib/image'

// 記録に添える写真の選択・プレビュー・削除。
// 1記録1枚。選び直しは同じ枠を置き換える。
// 圧縮はここで行い、親には Blob を渡す（アップロードは親の責務）。
export default function PhotoPicker({ photoUrl, onSelect, onRemove, disabled }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleChange(e) {
    const file = e.target.files?.[0]
    // 同じファイルを選び直しても change が発火するようリセットする
    e.target.value = ''
    if (!file) return

    setBusy(true)
    setError('')
    try {
      const { photo, thumb } = await compressPhoto(file)
      await onSelect(photo, thumb)
    } catch (err) {
      console.warn('[Photo] 写真の処理に失敗', err)
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
    } catch (err) {
      console.warn('[Photo] 写真の削除に失敗', err)
      setError('写真を削除できませんでした。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />

      {photoUrl ? (
        <div>
          <img src={photoUrl} alt="" className="w-full rounded-lg object-cover max-h-64" />
          <div className="flex justify-end gap-4 mt-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || busy}
              className="text-xs text-ink-faint hover:text-forest transition-colors disabled:opacity-50"
            >
              選び直す
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || busy}
              className="text-xs text-ink-faint hover:text-red-500 transition-colors disabled:opacity-50"
            >
              削除
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || busy}
          className="w-full border border-border border-dashed rounded-lg py-4 text-xs text-ink-faint hover:text-forest hover:border-sage/40 transition-colors disabled:opacity-50"
        >
          {busy ? '読み込み中...' : '写真を追加'}
        </button>
      )}

      {error && <p className="text-xs text-ink-faint">{error}</p>}
    </div>
  )
}
