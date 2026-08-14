import { useRef, useState } from 'react'
import { Keyboard, Pressable, TextInput, View } from 'react-native'
import Text from './Text'
import { authFetch } from '../lib/supabase'
import { todayStr } from '../lib/date'
import { load as loadPhoto, remove as removePhoto, save as savePhoto } from '../lib/photoStore'
import PhotoPicker from './PhotoPicker'
import MarkdownToolbar from './MarkdownToolbar'
import SuggestionButton from './SuggestionButton'

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
//
// `rich` を渡した欄だけ装飾のボタンが出る。**「やったこと」だけ。**
// 短いメモの欄に道具立てを出すのは重すぎる（`REQUIREMENTS.md` F1）。
function Field({ value, onChange, label, rows = 2, placeholder = '（任意）', rich, bare }) {
  // 装飾は「いまどこを選んでいるか」を知らないと入れられない。
  // TextInput が教えてくれるのはこれだけなので、控えておく。
  const [selection, setSelection] = useState(null)
  // **カーソルを動かしたい一瞬だけ `selection` を渡す。**
  //
  // 2026-08-14 まで、記号を入れたあとの位置を state に書くだけで
  // TextInput には渡していなかった。**押しても何も起きないように見えた。**
  // 実際には文字は入っていたが、カーソルが末尾へ飛ぶので
  // 「B を押す → 何も選ばれていない → 末尾に ** が2つ」になっていた。
  //
  // かといって常に `selection` を渡すと、指でカーソルを動かせなくなる。
  // 渡すのは1回だけにして、次の選択変更で下ろす。
  const [pending, setPending] = useState(null)
  const inputRef = useRef(null)

  function applyMark(next, cursor) {
    onChange(next)
    setPending({ start: cursor, end: cursor })
    setSelection({ start: cursor, end: cursor })
    // ボタンを押すと入力欄から焦点が外れる。戻さないとキーボードが閉じる
    inputRef.current?.focus()
  }

  function handleSelectionChange(e) {
    setSelection(e.nativeEvent.selection)
    if (pending) setPending(null)
  }

  // **主欄は枠を持たない。**（2026-08-14・デザイン案 `3_write`）
  // 書くところが「入力欄」ではなく「紙」に見えるようにする。
  // 装飾のボタンは欄の下に横一列で置く。ラベルの右に小さく並べていたときは、
  // 押す対象が見出しの一部のように見えていた。
  if (bare) {
    return (
      <View>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChange}
          onSelectionChange={handleSelectionChange}
          selection={pending ?? undefined}
          multiline
          textAlignVertical="top"
          style={{ minHeight: rows * 32 + 16 }}
          className="font-body text-body-lg text-on-surface"
          placeholder={placeholder}
          placeholderTextColor="#8E8478"
        />
        {rich ? (
          <View className="flex-row items-center justify-between border-t border-border pt-2.5">
            <MarkdownToolbar value={value} selection={selection} onChange={applyMark} />
            {/* **キーボードを下ろす。**
                本文の欄は改行を受け付けるので、キーボードの「完了」が
                改行になる。**下ろす方法が画面のどこにも無かった。** */}
            <Pressable
              onPress={() => Keyboard.dismiss()}
              accessibilityLabel="キーボードを閉じる"
              className="min-h-touch px-3 justify-center active:opacity-70"
            >
              <Text className="text-label-md text-primary">閉じる</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    )
  }

  return (
    <View>
      <Text className="text-label-md text-outline mb-1.5">{label}</Text>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        onSelectionChange={handleSelectionChange}
        selection={pending ?? undefined}
        multiline
        textAlignVertical="top"
        style={{ minHeight: rows * 22 + 16 }}
        className="bg-surface-lowest border border-border rounded px-3 py-2 font-body text-body-md text-on-surface"
        placeholder={placeholder}
        placeholderTextColor="#8E8478"
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
    <View className="bg-surface-low rounded-lg px-5 py-5 gap-4">
      {existingLog ? (
        <View className="self-start bg-ai-surface rounded-full px-2.5 py-0.5">
          <Text className="text-label-sm text-ai-ink">記録済</Text>
        </View>
      ) : null}

      {/* 問いはプレースホルダとして入力欄の中に出す。
          欄の上に別行で置くと「読むもの」が増えるが、中に出せば
          書き始める場所と問いが同じ位置になる。
          プレースホルダなので、書き始めれば自然に消える。

          今日の記録のときだけ差し替える。過去の日を編集するときに
          今日の問いを出しても合わない。
          問いが取れなかったときは元の固定文に戻る。 */}
      {/* **書きはじめの1行を、端末の中の出来事から選べる**（2026-08-14）。
          受け取るのは見出しだけで、続きは利用者が書く。
          出せない端末では何も描かれない（`SuggestionButton`）。

          **今日の記録のときだけ。** 過去の日を編集しているときに
          「今日の出来事」を勧めても合わない。 */}
      {isToday ? (
        <SuggestionButton
          onSelect={(title) =>
            setForm((f) => ({
              ...f,
              created: f.created ? `${f.created}
${title}` : title,
            }))
          }
        />
      ) : null}

      <Field
        value={form.created}
        onChange={(v) => setForm((f) => ({ ...f, created: v }))}
        label={`${isToday ? '今日' : 'この日'}のこと`}
        rows={7}
        rich
        bare
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
        className="flex-row items-center gap-1.5 min-h-touch"
      >
        <Text className="text-label-md text-outline">{detailOpen ? '⌄' : '›'}</Text>
        <Text className="text-label-md text-outline">
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
        className="bg-lantern-glow rounded-full py-3 min-h-touch justify-center items-center active:opacity-80 disabled:opacity-50"
      >
        <Text className="font-strong text-body-md text-on-lantern">
          {loading ? '保存中...' : '記録する'}
        </Text>
      </Pressable>

      {slow ? (
        <Text className="text-label-md text-outline text-center">
          まだ保存しています。もう少しかかります。
        </Text>
      ) : null}

      {saveError ? (
        <Text className="text-label-md text-error text-center">{saveError}</Text>
      ) : null}

      {aiResponse ? (
        <View className="bg-ai-surface rounded-lg px-5 py-4 mt-4">
          <Text className="text-body-md leading-relaxed text-ai-ink">{aiResponse}</Text>
        </View>
      ) : null}
    </View>
  )
}
