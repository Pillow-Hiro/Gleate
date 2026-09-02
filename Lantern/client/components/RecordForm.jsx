import { useEffect, useId, useRef, useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import Svg, { Path, Rect } from 'react-native-svg'
import * as DocumentPicker from 'expo-document-picker'
import Text from './Text'
import WebEditor from './WebEditor'
import { Appear, PressBounce } from './Motion'
import FileList from './FileList'
import { list as listFiles, save as saveFile } from '../lib/fileStore'
import { useThemeContext } from '../lib/theme'
import { authFetch } from '../lib/supabase'
import { invalidateLogs } from '../lib/logsCache'
import { getLight, isLighting, forgetLight, requestLight, subscribeLight } from '../lib/lightBuffer'
import { askHint } from '../lib/hint'
import HintCard from './HintCard'
import { todayStr } from '../lib/date'
import { load as loadPhoto, remove as removePhoto, save as savePhoto } from '../lib/photoStore'
import PhotoPicker from './PhotoPicker'
import { useEditorToolbar } from './EditorToolbar'

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
// **道具はキーボードの上にしか置かない**（2026-08-15）。
// 実装は `EditorToolbar.jsx`。欄の下には置かない — 作者の判断。
// この欄は「いま書いているのは自分だ」と登録するだけ。

// 「やったこと」以外の3項目。**畳んで並べる。**
const EXTRA_FIELDS = [
  { key: 'enjoyable', chip: 'よかったこと', label: 'よかったこと・楽しかったこと' },
  { key: 'struggled', chip: '困ったこと', label: '詰まったこと・困ったこと' },
  // 次にやることは「あったこと」ではなく予定で、他の3つと性質が違う。
  // アイデアの溜め場とも役割が重なるため、ここに置く。
  { key: 'next', chip: '次にやること', label: '次にやること' },
]

// 日付の行に置く小さな暦。**絵文字は使わない**ので図形で描く
function CalendarIcon({ color = '#847563' }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="5" width="18" height="16" rx="3" stroke={color} strokeWidth="1.8" />
      <Path d="M3 10h18M8 3v4M16 3v4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  )
}
function Field({
  value,
  onChange,
  label,
  rows = 2,
  placeholder = '（任意）',
  rich,
  bare,
  onPhoto,
  onFile,
  onClose,
  closeLabel,
  autoFocus,
}) {
  // 書いている最中かどうか。**押されるまで入力欄を置かない**（`bare` のとき）
  const [editing, setEditing] = useState(false)
  const editorRef = useRef(null)
  // いま効いている装飾。**欄が知らせてくる。**
  // これが無いと、押したボタンが効いたのかどうかが分からない
  const [active, setActive] = useState(null)
  const { isDark } = useThemeContext()
  // 装飾は「いまどこを選んでいるか」を知らないと入れられない。
  // TextInput が教えてくれるのはこれだけなので、控えておく。
  const [selection, setSelection] = useState(null)
  // **カーソルを動かしたい一瞬だけ `selection` を渡す。**
  // 常に渡すと、指でカーソルを動かせなくなる。
  const [pending, setPending] = useState(null)
  const inputRef = useRef(null)
  const owner = useId()
  const { register, release } = useEditorToolbar()

  function applyMark(next, cursor) {
    onChange(next)
    setPending({ start: cursor, end: cursor })
    setSelection({ start: cursor, end: cursor })
    // ボタンを押すと入力欄から焦点が外れる。戻さないとキーボードが閉じる
    inputRef.current?.focus()
  }

  // **キーボードの上の道具に、いまの欄を渡す。**
  //
  // `bare` の欄は WebView なので、**装飾は中で効かせる**（`exec`）。
  // こちらから文字列を組み直すと、中の選択が失われる。
  useEffect(() => {
    if (!rich || !editing) return
    register({
      owner,
      exec: (cmd) => editorRef.current?.exec(cmd),
      onPhoto,
      onFile,
      active,
      // **「日記の候補」で選ばれた1行を差し込む口。**
      // 中身は WebView が持っているので `value` を書き換えても
      // 画面には出ない。命令で入れる（`bare` の欄だけが持つ）。
      onSuggest: bare ? (text) => editorRef.current?.insertText(text) : null,
    })
    return () => release(owner)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rich, editing, owner, active])

  function handleSelectionChange(e) {
    setSelection(e.nativeEvent.selection)
    if (pending) setPending(null)
  }

  // **主欄は枠を持たない。**（2026-08-14・デザイン案 `3_write`）
  // 書くところが「入力欄」ではなく「紙」に見えるようにする。
  if (bare) {
    // **読む面と書く面を1つにした**（2026-08-20）。
    //
    // それまでは、書いていないあいだ `Text` を置き、押されたら
    // `WebEditor` に差し替えていた（素の `TextInput` を敷くと
    // スクロールのために指を置いただけで焦点が入るため）。
    //
    // 作者から2つ報告があった。**押すと一瞬消えて出直す**、
    // **押す前と後で字の大きさが違う。** どちらも同じ原因で、
    // 別々の部品が同じ文を描いていたことによる。
    //
    // - ちらつき … 差し替えのたびに WebView が生え直していた
    // - 字の大きさ … アプリの本文は Noto Sans JP（`lib/fonts.js` が
    //   `expo-font` で読む）だが、**WebView からは見えない。**
    //   中では `-apple-system` に落ちるので、同じ 19px でも
    //   和文の見た目の大きさが変わる
    //
    // 書体を合わせる道は無い（WebView に同じ書体を渡すには
    // 5MB の font を data URI で埋める必要がある）。
    // **描く部品を1つにすれば、揃える必要がなくなる。**
    //
    // WebView は指を置いただけでは焦点が入らない（押したときだけ）。
    // 差し替えをやめても、元の心配は起きない。
    return (
      <WebEditor
        ref={editorRef}
        value={value}
        onChange={onChange}
        onFocus={() => setEditing(true)}
        onBlur={() => setEditing(false)}
        onState={(s) => setActive({ bold: s.bold, italic: s.italic, bullet: s.bullet })}
        isDark={isDark}
        minHeight={rows * 32 + 16}
        placeholder={placeholder}
      />
    )
  }

  return (
    <View>
      <View className="flex-row items-center justify-between mb-1.5">
        <Text className="text-label-md text-outline">{label}</Text>
        {onClose ? (
          <Pressable onPress={onClose} className="min-h-touch px-1 justify-center active:opacity-70">
            <Text className="text-label-md text-outline">{closeLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {/* **開いた欄に焦点を移す**（2026-08-18）。
          チップを押して欄が現れても、焦点が動かないと
          `automaticallyAdjustKeyboardInsets`（`app/(tabs)/index.jsx`）が
          働かない。あれは**焦点の当たった欄しか送らない。**
          3つ開くと下2つがキーボードの下に隠れていた。

          押した人はそこに書くつもりで押しているので、
          焦点を移すのは見え方の都合だけでなく、順当な動きでもある。 */}
      <TextInput
        ref={inputRef}
        autoFocus={autoFocus}
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
// 欄を開くチップ。**押している間だけ沈む。**
// 色が薄くなるだけだと、押した手応えが無い（`components/Motion.jsx`）。
function Chip({ label, onPress }) {
  const [pressed, setPressed] = useState(false)
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityLabel={`${label}を追加`}
    >
      <PressBounce pressed={pressed}>
        <View className="flex-row items-center gap-1 border border-outline-variant rounded-full px-3 min-h-touch justify-center">
          <Text className="text-label-md text-primary">＋</Text>
          <Text className="text-label-md text-on-surface-variant">{label}</Text>
        </View>
      </PressBounce>
    </Pressable>
  )
}

// `onPaywall` は手がかりの枠を使い切ったときに呼ばれる。
// **ここでは Paywall を描かない。**フォームは記録を書く場所で、
// 売る面を持たせると、書いている最中に売り物が現れることになる。
// 出す場所は呼ぶ側が決める（`app/(tabs)/index.jsx`）。
export default function RecordForm({ existingLog, targetDate, onSaved, question, onPaywall }) {
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
  // **開いている欄。**（2026-08-14）
  //
  // それまでは「もっと詳しく書く」ひとつで3項目をまとめて畳んでいた。
  // 実機で「ユーザーが迷うかも」と言われた。畳まれていると
  // **何が書けるのかが分からない**まま、開くかどうかを決めることになる。
  //
  // 項目ごとのチップにした。**名前が見えているので、開く前に分かる。**
  // 押した欄だけが現れるので、既定の姿は1段のまま。
  //
  // **欄そのものは消さない**（CLAUDE.md）。実測で
  // 次にやること 16.7% / よかった 5.6% / 困った 5.6% と低いが、使われている。
  // 消すと後から分け直せない。
  const initiallyOpen = new Set(
    EXTRA_FIELDS.filter(({ key }) => existingLog?.[key]).map(({ key }) => key)
  )
  const [openFields, setOpenFields] = useState(initiallyOpen)
  // **直前にチップで開いた欄。** その欄にだけ焦点を移す。
  //
  // 既に開いている欄（記録を開き直したとき）には移さない。
  // `autoFocus` は生えたときにしか効かないので、開いた瞬間の1回だけ働く。
  const [justOpened, setJustOpened] = useState(null)
  const [loading, setLoading] = useState(false)
  const [slow, setSlow] = useState(false)
  // 灯りは**画面の外に置いてある**（`lib/lightBuffer.js`）。
  // このフォームは保存のたびに作り直されるので、ここで持つと消える。
  // 生えた時点で受け皿を見て、以後は変化を受け取る。
  const [lighting, setLighting] = useState(() => isLighting(targetDate))
  const [aiResponse, setAiResponse] = useState(
    () => getLight(targetDate) || existingLog?.ai_response || '',
  )

  useEffect(
    () =>
      subscribeLight(() => {
        // **受け皿が空でも消さない。** 保存済みの灯りを持っている場合がある
        const next = getLight(targetDate)
        if (next) setAiResponse(next)
        setLighting(isLighting(targetDate))
      }),
    [targetDate],
  )
  const [saveError, setSaveError] = useState('')

  // 手がかり。**書いたあとにだけ探せる**（`lib/hint.js`）
  const [hint, setHint] = useState(null)
  const [hinting, setHinting] = useState(false)
  const [savingAnswer, setSavingAnswer] = useState(false)
  // 既にある記録を開いているなら、その時点で探せる
  const [savedOnce, setSavedOnce] = useState(Boolean(existingLog))
  // どの記録を書いているか。**新規は空**（DB が採番する）
  const [recordId, setRecordId] = useState(existingLog?.id || '')
  const [photoUrl, setPhotoUrl] = useState(
    existingLog?.photo_url || loadPhoto(targetDate).photo_url,
  )

  // 写真は端末に即座に置く。テキストの「記録する」を待たない。
  // ここで onSaved() を呼ばないのは、logs を取り直すと key が変わって
  // このフォームが作り直され、入力途中のテキストが消えるため。
  async function handlePhotoSelect(photo, thumb) {
    setPhotoUrl(savePhoto(targetDate, photo, thumb).photo_url)
  }

  // 写真を選ぶ手続きは `PhotoPicker` が持っている。
  // キーボードの上のボタンからも同じ手続きを呼べるように、口を預かる
  const pickRef = useRef(null)
  function pickPhoto() {
    pickRef.current?.()
  }

  // 添えたファイル。**端末の中だけ**（`lib/fileStore.js`）
  const [files, setFiles] = useState(() => listFiles(targetDate))
  function refreshFiles() {
    setFiles(listFiles(targetDate))
  }

  async function pickFile() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true })
      if (res.canceled) return
      for (const asset of res.assets ?? []) {
        saveFile(targetDate, asset.uri, asset.name || 'file')
      }
      refreshFiles()
    } catch (e) {
      // 選べなくても記録は書ける
      console.warn('[File] 追加に失敗', e)
    }
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
  // 手がかりを探す。**断られたらペイウォールへ**（無料は通算5回）
  async function askForHint() {
    setHinting(true)
    try {
      const got = await askHint(targetDate)
      if (!got) return
      if (got.kind === 'paywall') {
        onPaywall?.(got.text)
        return
      }
      setHint(got)
    } finally {
      setHinting(false)
    }
  }

  // 問いへの答えを「困ったこと」に残す。**新しい経路を作らない。**
  //
  // `/save` をそのまま使う。`defer_ai` を付けて灯りは頼まない——
  // 答えを足しただけで灯りを作り直すと、書いた本人の言葉が
  // 上書きされたように見える。
  async function handleHintAnswer(answer) {
    setSavingAnswer(true)
    const next = { ...form, struggled: answer }
    setForm(next)
    try {
      const res = await authFetch('/save', {
        method: 'POST',
        body: JSON.stringify({ ...next, id: recordId || undefined, date: targetDate, defer_ai: true }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      invalidateLogs()
      if (onSaved) onSaved()
    } catch (e) {
      // **画面には出さない。**カードは「残しました」を出したあと。
      // ここで赤い字を足すと、何が起きたのか分からなくなる
      console.warn('[手がかり] 答えを残せなかった', e)
    } finally {
      setSavingAnswer(false)
    }
  }

  const SLOW_SAVE_MS = 6000

  async function handleSave() {
    setLoading(true)
    setSlow(false)
    // 書き直したので、前の灯りは捨てる。**受け皿からも消す**
    forgetLight(targetDate)
    setAiResponse('')
    setSaveError('')
    const slowTimer = setTimeout(() => setSlow(true), SLOW_SAVE_MS)
    try {
      // **灯りを待たない**（2026-08-23）。
      // `defer_ai` を送ると、保存できた時点でサーバーが返す。
      // 押した人を AI の生成時間だけ立ち止まらせる理由が無い。
      const res = await authFetch('/save', {
        method: 'POST',
        // **id を送る**（2026-09-02）。同じ日に複数件あるので、
        // 日付だけでは書き先が決まらない。新規なら空で送らない
        // **新しく作るときは明示する**（2026-09-02）。
        // 送らないと、サーバーは日付で既存を見つけて上書きしてしまう
        body: JSON.stringify({
          ...form,
          id: recordId || undefined,
          new: recordId ? undefined : true,
          date: targetDate,
          defer_ai: true,
        }),
      })
      // **上限に当たったときは、そう言う**（2026-09-02）。
      // 「保存に失敗しました。接続を確認してください」だと、
      // 直せない原因を直そうとさせることになる
      if (res.status === 409) {
        const body = await res.json().catch(() => null)
        setSaveError((body && body.message) || 'この日の記録はここまでです。')
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      // **書いた行の id を覚える**（2026-09-02）。覚えないと、
      // 次の保存で「新しい記録」として同じ日に2件目が生まれる
      if (data.id) setRecordId(data.id)
      if (data.ai_response) setAiResponse(data.ai_response)

      // **控えが古くなった。**これを言わないと、記録タブへ移っても
      // 15秒は前の一覧が出る（`lib/logsCache.js` の `invalidateLogs`）。
      // `onSaved` より先に呼ぶ。あちらは取り直しの結果を受け取る側
      invalidateLogs()
      // **ここから手がかりを探せる。** 書く前には材料が無い
      setSavedOnce(true)
      if (onSaved) onSaved()

      // 灯りは**あとから届く。**ボタンはもう戻っている。
      //
      // **待ちはこの画面が持たない**（`lib/lightBuffer.js`）。
      // 保存すると親が記録を取り直し、その拍子にこのフォームは
      // `key` が変わって作り直される。ここで待っていると、
      // 返ってきた頃には受け取る画面が居ない。
      if (data.deferred) requestLight(targetDate)
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
        // 写真とファイルの入口はキーボードの上の列に入る（`EditorToolbar`）
        onPhoto={pickPhoto}
        onFile={pickFile}
        // **`？` を使わない**（2026-08-18）。答えを求めない問いは `。` で
        // 終える。`？` は答えを迫る形で、原則3「問いには正解を求めない。
        // ユーザーが答えなくてもいい」に反する。差し込まれる方の問い
        // （`modules/questions/data.py` 全50問）はもともと全部 `。` で、
        // **ここだけが違う声で聞いていた。**
        placeholder={
          question && isToday
            ? question
            : `${isToday ? '今日' : 'この日'}どんなことをしましたか。`
        }
      />
      {/* **まだ開いていない欄をチップで出す。**
          押した欄だけが現れる。既定の姿は「やったこと」1段のまま。
          全部開いたらチップの列は消える。 */}
      {EXTRA_FIELDS.some(({ key }) => !openFields.has(key)) ? (
        <View className="flex-row flex-wrap gap-2">
          {EXTRA_FIELDS.filter(({ key }) => !openFields.has(key)).map(({ key, chip }) => (
            <Chip
              key={key}
              label={chip}
              onPress={() => {
                setOpenFields((prev) => new Set(prev).add(key))
                setJustOpened(key)
              }}
            />
          ))}
        </View>
      ) : null}

      {EXTRA_FIELDS.filter(({ key }) => openFields.has(key)).map(({ key, label }) => (
        <Appear key={key}>
          <Field
          value={form[key]}
          onChange={(v) => setForm((f) => ({ ...f, [key]: v }))}
          label={label}
          autoFocus={justOpened === key}
          // **畳めるようにする**（2026-08-15）。開いたら戻せなかった。
          //
          // 中身があるまま畳むと、**見えていない文が保存される。**
          // だから畳むときは消す。押す前にそう書いてある
          // （空なら「やめる」、書いてあれば「消して閉じる」）。
          onClose={() => {
            setForm((f) => ({ ...f, [key]: '' }))
            setOpenFields((prev) => {
              const next = new Set(prev)
              next.delete(key)
              return next
            })
            // 覚えを捨てる。捨てないと、開き直しても生え直さない扱いになる
            setJustOpened((prev) => (prev === key ? null : prev))
          }}
          closeLabel={form[key] ? '消して閉じる' : '閉じる'}
        />
        </Appear>
      ))}

      {/* 添えたファイル。**サーバーへは送らない**（端末の中だけ） */}
      <FileList files={files} onChange={refreshFiles} />

      {/* 選んだ写真の見た目。**選ぶボタンはキーボードの上にある** */}
      <PhotoPicker
        photoUrl={photoUrl}
        onSelect={handlePhotoSelect}
        onRemove={handlePhotoRemove}
        disabled={loading}
        previewOnly
        onReady={(pick) => { pickRef.current = pick }}
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
      ) : lighting ? (
        // **記録はもう残っている。**待っているのは灯りだけなので、
        // 「保存中」とは書かない。書いた人を不安にさせない
        <View className="bg-ai-surface rounded-lg px-5 py-4 mt-4">
          <Text className="text-label-md text-on-surface-variant">灯りをともしています。</Text>
        </View>
      ) : null}

      {/* **手がかり**（2026-09-02）。書いたあとにだけ出す。
          まだ保存していない記録には、探す材料が無い。

          押すと、材料が足りなければ問いが一つ返る（`lib/hint.js`）。
          答えは「困ったこと」に入り、次に詰まったときの材料になる。 */}
      {hint ? (
        <HintCard
          kind={hint.kind}
          text={hint.text}
          saving={savingAnswer}
          onAnswer={handleHintAnswer}
          onClose={() => setHint(null)}
        />
      ) : savedOnce ? (
        <Pressable
          onPress={askForHint}
          disabled={hinting}
          className="border border-outline-variant rounded-full py-3 min-h-touch justify-center items-center active:opacity-70 disabled:opacity-50"
        >
          <Text className="text-label-md text-primary">
            {hinting ? '探しています...' : '手がかりを探す'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}
