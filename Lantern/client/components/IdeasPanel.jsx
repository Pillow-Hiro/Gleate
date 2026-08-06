import { useCallback, useEffect, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { authFetch } from '../lib/supabase'

// アイデアの溜め場。
//
// 「思いついた瞬間に置いて、後で拾うもの」を扱う。
// 記録（4項目）はその日を振り返る構造だが、アイデアは日をまたいで残る。
//
// **件数を出さない。** 溜まっていることを責めない。
// 「〇件未完了」はタスク管理の作法で、Lantern が最も避けている形。
// カレンダーで記録の多寡を評価しないのと同じ理由。
//
// 「完了」ではなく「拾った」。アイデアは達成すべきタスクではない。

function IdeaRow({ idea, onTogglePicked, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const picked = Boolean(idea.picked_at)

  return (
    <View className="border-b border-border py-3">
      <Pressable onPress={() => onTogglePicked(idea)}>
        <Text className={`text-sm leading-relaxed ${picked ? 'text-ink-faint' : 'text-ink'}`}>
          {idea.text}
        </Text>
      </Pressable>

      <View className="flex-row items-center justify-between mt-1.5">
        <Text className="text-[10px] text-ink-faint">
          {picked ? '拾いました' : ''}
        </Text>

        {confirmDelete ? (
          <View className="flex-row items-center gap-3">
            <Pressable onPress={() => setConfirmDelete(false)}>
              <Text className="text-xs text-ink-faint">キャンセル</Text>
            </Pressable>
            <Pressable onPress={() => onDelete(idea)}>
              <Text className="text-xs text-red-500">削除する</Text>
            </Pressable>
          </View>
        ) : (
          <View className="flex-row items-center gap-3">
            <Pressable onPress={() => onTogglePicked(idea)}>
              <Text className="text-xs text-ink-faint">
                {picked ? '戻す' : '拾う'}
              </Text>
            </Pressable>
            <Pressable onPress={() => setConfirmDelete(true)}>
              <Text className="text-xs text-red-500">削除</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  )
}

export default function IdeasPanel() {
  const [ideas, setIdeas] = useState(null)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await authFetch('/api/ideas')
      if (res.ok) setIdeas((await res.json()).ideas ?? [])
    } catch (e) {
      console.warn('[Ideas] 取得に失敗', e)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    const value = text.trim()
    if (!value || saving) return
    setSaving(true)
    try {
      const res = await authFetch('/api/ideas', {
        method: 'POST',
        body: JSON.stringify({ text: value }),
      })
      if (res.ok) {
        setIdeas((await res.json()).ideas ?? [])
        setText('')
      }
    } catch (e) {
      console.warn('[Ideas] 追加に失敗', e)
    } finally {
      setSaving(false)
    }
  }

  async function handleTogglePicked(idea) {
    const next = !idea.picked_at
    // 先に画面を更新する。往復を待つとメモとしての軽さが失われる
    setIdeas((prev) => prev.map((i) => (
      i.id === idea.id ? { ...i, picked_at: next ? new Date().toISOString() : null } : i
    )))
    try {
      await authFetch(`/api/ideas/${idea.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ picked: next }),
      })
    } catch (e) {
      console.warn('[Ideas] 更新に失敗', e)
      load()
    }
  }

  async function handleDelete(idea) {
    setIdeas((prev) => prev.filter((i) => i.id !== idea.id))
    try {
      await authFetch(`/api/ideas/${idea.id}`, { method: 'DELETE' })
    } catch (e) {
      console.warn('[Ideas] 削除に失敗', e)
      load()
    }
  }

  return (
    <View className="gap-4">
      {/* 入力は1行だけ。ラベルも項目も置かない。
          メモ書き程度のものに4項目のフォームを出すのは重すぎる。 */}
      <View className="flex-row items-center gap-2">
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
          placeholder="思いついたこと"
          placeholderTextColor="#999999"
          className="flex-1 bg-stone border border-border rounded-lg px-3 py-2.5 text-sm text-ink"
        />
        <Pressable
          onPress={handleAdd}
          disabled={!text.trim() || saving}
          className="border border-sage/40 rounded-full px-3.5 py-2 disabled:opacity-50"
        >
          <Text className="text-xs text-forest">置く</Text>
        </Pressable>
      </View>

      {ideas === null ? (
        <View className="gap-3 pt-2">
          {[1, 2, 3].map((i) => (
            <View key={i} className="h-4 bg-parchment rounded w-3/4" />
          ))}
        </View>
      ) : ideas.length === 0 ? (
        <Text className="text-sm text-ink-faint py-6">
          思いついたことを、ここに置いておけます。
        </Text>
      ) : (
        <View>
          {ideas.map((idea) => (
            <IdeaRow
              key={idea.id}
              idea={idea}
              onTogglePicked={handleTogglePicked}
              onDelete={handleDelete}
            />
          ))}
        </View>
      )}
    </View>
  )
}
