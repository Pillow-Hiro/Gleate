import { useRef, useState } from 'react'
import { InputAccessoryView, Keyboard, Platform, Pressable, TextInput, View } from 'react-native'
import Svg, { Path, Rect } from 'react-native-svg'
import Text from './Text'
import RichText from './RichText'
import { authFetch } from '../lib/supabase'
import { todayStr } from '../lib/date'
import { load as loadPhoto, remove as removePhoto, save as savePhoto } from '../lib/photoStore'
import PhotoPicker from './PhotoPicker'
import MarkdownToolbar from './MarkdownToolbar'

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
//
// 装飾の道具は iOS ではキーボードの上に載せる（`InputAccessoryView`）。
// Android にこの仕組みは無いので、そちらは欄の下に置く。
const ACCESSORY_ID = 'lantern-record-toolbar'
const USE_ACCESSORY = Platform.OS === 'ios'

// 日付の行に置く小さな暦。**絵文字は使わない**ので図形で描く
function CalendarIcon({ color = '#847563' }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="5" width="18" height="16" rx="3" stroke={color} strokeWidth="1.8" />
      <Path d="M3 10h18M8 3v4M16 3v4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  )
}
function Field({ value, onChange, label, rows = 2, placeholder = '（任意）', rich, bare, extra }) {
  // 書いている最中かどうか。**押されるまで入力欄を置かない**（`bare` のとき）
  const [editing, setEditing] = useState(false)
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
    const bar = (
      <View className="flex-row items-center justify-between px-1">
        <MarkdownToolbar value={value} selection={selection} onChange={applyMark} extra={extra} />
        <Pressable
          onPress={() => Keyboard.dismiss()}
          accessibilityLabel="キーボードを閉じる"
          className="min-h-touch px-3 justify-center active:opacity-70"
        >
          <Text className="font-strong text-label-md text-primary">完了</Text>
        </Pressable>
      </View>
    )

    // **触れただけでキーボードが開かないようにする**（2026-08-14）。
    //
    // 主欄は画面の大半を占める。そこに素の `TextInput` を敷くと、
    // スクロールのために指を置いただけで焦点が入り、キーボードが上がる。
    // 実機で「感度が良すぎる」と言われた。
    //
    // **書いていないときは入力欄を置かない。** 読む面を置き、
    // 押されたときに入力欄へ差し替える。指を滑らせただけでは開かない。
    //
    // 副産物として、**装飾が効いていることが目で分かる。**
    // 入力中は Markdown の記号がそのまま見えるが、
    // 離れると太字は太字として描かれる（`RichText`）。
    if (!editing) {
      return (
        <Pressable
          onPress={() => setEditing(true)}
          accessibilityLabel={placeholder}
          style={{ minHeight: rows * 32 + 16 }}
          className="justify-start"
        >
          {value ? (
            <RichText text={value} className="text-body-lg text-on-surface" />
          ) : (
            <Text className="text-body-lg text-outline">{placeholder}</Text>
          )}
        </Pressable>
      )
    }

    return (
      <View>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChange}
          onSelectionChange={handleSelectionChange}
          onBlur={() => setEditing(false)}
          selection={pending ?? undefined}
          inputAccessoryViewID={USE_ACCESSORY ? ACCESSORY_ID : undefined}
          autoFocus
          multiline
          scrollEnabled={false}
          textAlignVertical="top"
          style={{ minHeight: rows * 32 + 16 }}
          className="font-body text-body-lg text-on-surface"
          placeholder={placeholder}
          placeholderTextColor="#8E8478"
        />

        {/* **道具はキーボードの上に載せる**（2026-08-14）。
            欄の下に置いていたときは、キーボードが出た瞬間に隠れていた。
            「閉じる」も同じ場所にあったので、**キーボードを下ろすための
            ボタンが、キーボードに隠れて押せなかった。**

            iOS には入力補助ビュー（`InputAccessoryView`）があり、
            キーボードに貼り付いて上がってくる。これが正しい置き場所。
            Android には無いので、そちらは欄の下に置いたままにする。 */}
        {rich && USE_ACCESSORY ? (
          <InputAccessoryView nativeID={ACCESSORY_ID}>
            <View className="bg-surface-low border-t border-border py-1">{bar}</View>
          </InputAccessoryView>
        ) : null}
        {rich && !USE_ACCESSORY ? (
          <View className="border-t border-border pt-2.5">{bar}</View>
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
  const [y, m, d] = targetDate.split('-')
  const dateLabel = `${y}年${Number(m)}月${Number(d)}日`
  const stamp = existingLog?.saved_at ? new Date(existingLog.saved_at) : new Date()
  const timeLabel = `${String(stamp.getHours()).padStart(2, '0')}:${String(stamp.getMinutes()).padStart(2, '0')}`
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
    <View className="bg-surface-lowest rounded-lg px-5 py-5 gap-4 shadow-bloom">
      {/* **日付の行**（2026-08-14・デザイン案 `3_write`）。
          暦 → 日付 → 時刻。書いている紙の上端にあたる。
          時刻は、すでにある記録なら保存した時刻、無ければ今の時刻。 */}
      <View className="flex-row items-center gap-2">
        <CalendarIcon />
        <Text className="font-label text-label-md text-on-surface-variant">{dateLabel}</Text>
        <Text className="text-label-md text-outline">·</Text>
        <Text className="font-label text-label-md text-outline">{timeLabel}</Text>
        {existingLog ? (
          <Text className="font-label text-label-md text-outline ml-auto">記録済</Text>
        ) : null}
      </View>

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
        rows={7}
        rich
        bare
        extra={
          // **写真は道具の列に入れる**（2026-08-14・デザイン案 `3_write`）。
          // 別の区画に置いていたので、装飾の道具と別物に見えていた。
          // クリップ（任意のファイル添付）は付けない。**扱えるのは写真だけ。**
          <PhotoPicker
            photoUrl={photoUrl}
            onSelect={handlePhotoSelect}
            onRemove={handlePhotoRemove}
            disabled={loading}
            compact
          />
        }
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

      {/* 選んだ写真の見た目。**選ぶボタンは道具の列にある** */}
      <PhotoPicker
        photoUrl={photoUrl}
        onSelect={handlePhotoSelect}
        onRemove={handlePhotoRemove}
        disabled={loading}
        previewOnly
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
