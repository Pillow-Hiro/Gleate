import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { authFetch } from '../lib/supabase'
import { todayStr } from '../lib/date'
import { load as loadPhoto, remove as removePhoto, save as savePhoto } from '../lib/photoStore'
import PhotoPicker from './PhotoPicker'

// **モジュールの外に置くこと。**
//
// 2026-08-07 まで RecordForm の中で定義していた。
// 1文字打つたびに setForm で再描画され、そのたびに Field が
// 別の関数になるため、React は「別のコンポーネントに変わった」と見なして
// TextInput を作り直していた。結果、**入力欄からフォーカスが外れ、
// キーボードが閉じ、1文字しか打てなかった。**
//
// 記録アプリとして致命的な壊れ方だったが、Web では気づきにくく
// （ブラウザは入力中の要素を作り直しても見た目が近い）、
// 実機で初めて分かった。
function Field({ value, onChange, label, rows = 2, placeholder = '（任意）' }) {
  return (
    <View>
      <Text className="text-xs text-ink-faint mb-1.5">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
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

// Web版 frontend/src/pages/Home.jsx の RecordForm を移植したもの。
// 文言・保存先・項目は変更していない。
export default function RecordForm({ existingLog, targetDate, onSaved, question }) {
  const isToday = targetDate === todayStr()
  const [form, setForm] = useState({
    created: existingLog?.created || '',
    enjoyable: existingLog?.enjoyable || '',
    struggled: existingLog?.struggled || '',
    next: existingLog?.next || '',
  })
  const [detailOpen, setDetailOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [slow, setSlow] = useState(false)
  const [aiResponse, setAiResponse] = useState(existingLog?.ai_response || '')
  const [saveError, setSaveError] = useState('')
  const [photoUrl, setPhotoUrl] = useState(
    existingLog?.photo_url || loadPhoto(targetDate).photo_url,
  )

  // 写真は端末に即座に置く。テキストの「記録する」を待たない。
  // ここで onSaved() を呼ばないのは、logs を取り直すと key が変わって
  // このフォームが作り直され、入力途中のテキストが消えるため。
  async function handlePhotoSelect(photo, thumb) {
    setPhotoUrl(savePhoto(targetDate, photo, thumb).photo_url)
  }

  async function handlePhotoRemove() {
    removePhoto(targetDate)
    setPhotoUrl(null)
  }

  // 保存が長引いたときに、待っていることを伝える。
  //
  // サーバー（Render の無料枠）は一定時間で停止する。
  // 2026-08-06 の実測で、眠った状態からの初回は 43.8 秒かかった
  // （温まっていれば 0.2 秒）。1日1回開く道具なので、毎回冷えている。
  //
  // **黙って44秒待たせると、遅いのではなく壊れて見える。**
  // 押した手が悪かったのかと思わせない。
  // 原因（サーバーが眠っていた等）は書かない。利用者にできることが増えない。
  const SLOW_SAVE_MS = 6000

  async function handleSave() {
    setLoading(true)
    setSlow(false)
    setAiResponse('')
    setSaveError('')
    const slowTimer = setTimeout(() => setSlow(true), SLOW_SAVE_MS)
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
      clearTimeout(slowTimer)
      setLoading(false)
      setSlow(false)
    }
  }

  return (
    <View className="border border-border rounded-lg px-5 py-4 gap-4">
      {existingLog ? (
        <View className="self-start bg-sage-light rounded-full px-2 py-0.5">
          <Text className="text-[10px] text-sage">記録済</Text>
        </View>
      ) : null}

      {/* 問いはプレースホルダとして入力欄の中に出す。
          欄の上に別行で置くと「読むもの」が増えるが、中に出せば
          書き始める場所と問いが同じ位置になる。
          プレースホルダなので、書き始めれば自然に消える。

          今日の記録のときだけ差し替える。過去の日を編集するときに
          今日の問いを出しても合わない。
          問いが取れなかったときは元の固定文に戻る。 */}
      <Field
        value={form.created}
        onChange={(v) => setForm((f) => ({ ...f, created: v }))}
        label={`${isToday ? '今日' : 'この日'}のこと`}
        rows={5}
        placeholder={
          question && isToday
            ? question
            : `${isToday ? '今日' : 'この日'}どんなことをしましたか？`
        }
      />
      {/* 既定で見えているのは「やったこと」だけにする。
          実測（2026-08-06・全20件）で 17/20 が この1項目だけで完結しており、
          次にやること 15% / よかったこと 5% / 困ったこと 5% だった。
          既定の姿を実態に合わせ、4段の3（邪魔なUIがない）に寄せる。
          欄は消さない。5%とはいえ使われており、消すと後から分けられない。

          Web版はCSS gridで開閉していたが、RNにgridがないため出し分けで表現する */}
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
          <Field
            value={form.enjoyable}
            onChange={(v) => setForm((f) => ({ ...f, enjoyable: v }))}
            label="よかったこと・楽しかったこと"
          />
          <Field
            value={form.struggled}
            onChange={(v) => setForm((f) => ({ ...f, struggled: v }))}
            label="詰まったこと・困ったこと"
          />
          {/* 次にやることは「あったこと」ではなく予定で、他の3つと性質が違う。
              アイデアの溜め場とも役割が重なるため、ここに置く。 */}
          <Field
            value={form.next}
            onChange={(v) => setForm((f) => ({ ...f, next: v }))}
            label="次にやること"
          />
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

      {slow ? (
        <Text className="text-xs text-ink-faint text-center">
          まだ保存しています。もう少しかかります。
        </Text>
      ) : null}

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
