import { forwardRef, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import Svg, { Path, Rect } from 'react-native-svg'
import * as DocumentPicker from 'expo-document-picker'
import Text from './Text'
import WebEditor from './WebEditor'
import { Appear } from './Motion'
import FileList from './FileList'
import { list as listFiles, save as saveFile } from '../lib/fileStore'
import { useThemeContext } from '../lib/theme'
import { authFetch } from '../lib/supabase'
import { invalidateLogs } from '../lib/logsCache'
import { forgetLight, requestLight } from '../lib/lightBuffer'
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
  // **外から欄を空にするための取っ手**（2026-09-03）。
  // `bare` の欄は WebView が中身を持っているので、`value` を空にしても
  // 画面は変わらない。渡された側が `clear()` を呼ぶ（`WebEditor.jsx`）。
  editorRef: externalEditorRef,
  // まだ開いていない欄。**キーボードの上の列に並ぶ**（`EditorToolbar.jsx`）。
  // 書いている欄が自分と一緒に渡すので、**どの欄からでも手が届く。**
  // 毎回作り直すと登録が回り続けるので、呼ぶ側が覚えておくこと
  extras,
}) {
  // 書いている最中かどうか。**押されるまで入力欄を置かない**（`bare` のとき）
  const [editing, setEditing] = useState(false)
  const ownEditorRef = useRef(null)
  const editorRef = externalEditorRef || ownEditorRef
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
  //
  // **装飾を持たない欄も登録する**（2026-09-03）。
  // 欄を開くチップを列へ移したので、登録しないと
  // 「よかったこと」を書いている最中に「困ったこと」を開けない。
  // 装飾の記号は出ない（`rich` を見て列が決める）。
  useEffect(() => {
    if (!editing) return
    register({
      owner,
      rich: Boolean(rich),
      exec: rich ? (cmd) => editorRef.current?.exec(cmd) : null,
      onPhoto,
      onFile,
      active,
      extras,
      // **「日記の候補」で選ばれた1行を差し込む口。**
      // 中身は WebView が持っているので `value` を書き換えても
      // 画面には出ない。命令で入れる（`bare` の欄だけが持つ）。
      onSuggest: bare ? (text) => editorRef.current?.insertText(text) : null,
    })
    return () => release(owner)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rich, editing, owner, active, extras])

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
        // **書いていることを列に伝える**（2026-09-03）。
        // 伝えないと、この欄を書いている間は列が消え、
        // 残りの欄を開くチップに手が届かない
        onFocus={() => setEditing(true)}
        onBlur={() => setEditing(false)}
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
//
// **欄を開くチップは、ここには無い**（2026-09-03・作者の判断）。
// キーボードの上の列へ移した（`components/EditorToolbar.jsx`）。
// 紙のすぐ下に置いていたが、記録を全画面にすると置き場所が無くなる。

// **ここは書いて残すだけ**（2026-09-03）。
//
// 灯りと手がかりは外へ出した（`components/LightCard.jsx` /
// `components/HintPanel.jsx`）。記録は全画面で書いて書き終えると閉じるので、
// **返ってくるものを、書いている画面が受け取れない。**
// どちらも「書いたあとに読むもの」で、置き場所は戻った先の紙。
//
// `ref` からは `save()` を呼べる。全画面の「記録する」は上の帯にあり、
// この中のボタンは出さない（`hideSaveButton`）。
// 戻り値は**残せたかどうか**。呼ぶ側はそれを見て閉じる。
const RecordForm = forwardRef(function RecordForm(
  { targetDate, onSaved, question, hideSaveButton, bodyRows = 7 },
  ref,
) {
  const isToday = targetDate === todayStr()
  const [y, m, d] = targetDate.split('-')
  const dateLabel = `${y}年${Number(m)}月${Number(d)}日`
  // **この紙はいつでも白紙**（2026-09-03・作者の判断）。
  //
  // 前は、その日の最後の記録を載せて開いていた。**別のことを書くと
  // 前のが消えた**（同じ記録を書き直したことになるため）。
  // 時刻の帯で選び直せるようにしたが、作者に「帯はいらない」と言われた。
  //
  // 白紙で開き、保存は必ず新しい記録として入る。
  // **直すのは「記録」タブ**（`components/LogDetail.jsx`）。
  const stamp = new Date()
  const timeLabel = `${String(stamp.getHours()).padStart(2, '0')}:${String(stamp.getMinutes()).padStart(2, '0')}`
  const [form, setForm] = useState({ created: '', enjoyable: '', struggled: '', next: '' })
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
  //
  // **白紙なので、開いた欄も無い。** 以前は既存の記録に中身のある欄を
  // 開いた状態で出していたが、載せる記録そのものが無くなった。
  const [openFields, setOpenFields] = useState(() => new Set())
  // **直前にチップで開いた欄。** その欄にだけ焦点を移す。
  //
  // `autoFocus` は生えたときにしか効かないので、開いた瞬間の1回だけ働く。
  const [justOpened, setJustOpened] = useState(null)

  // まだ開いていない欄。**キーボードの上の列に渡す**（`EditorToolbar.jsx`）。
  //
  // **覚えておくこと。**書いている欄はこれを一緒に登録するので、
  // 毎回作り直すと「登録 → 再描画 → 作り直し → 登録」で回り続ける。
  //
  // `label` は短い名前（キーボードの上の列。幅が無い）、
  // `full` は略さない名前（紙の上の行。**何を書く場所かを名前で伝える**）。
  const extras = useMemo(
    () =>
      EXTRA_FIELDS.filter(({ key }) => !openFields.has(key)).map(({ key, chip, label }) => ({
        key,
        label: chip,
        full: label,
        onPress: () => {
          setOpenFields((prev) => new Set(prev).add(key))
          setJustOpened(key)
        },
      })),
    [openFields],
  )

  const [loading, setLoading] = useState(false)
  const [slow, setSlow] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [photoUrl, setPhotoUrl] = useState(loadPhoto(targetDate).photo_url)

  // 全画面の「記録する」はこの外にある。**同じ手続きを呼ばせる。**
  // 保存の中身が2か所に分かれると、片方だけ古くなる
  useImperativeHandle(ref, () => ({ save: handleSave }))

  // 写真は端末に即座に置く。テキストの「記録する」を待たない。
  // ここで onSaved() を呼ばないのは、logs を取り直すと key が変わって
  // このフォームが作り直され、入力途中のテキストが消えるため。
  async function handlePhotoSelect(photo, thumb) {
    setPhotoUrl(savePhoto(targetDate, photo, thumb).photo_url)
  }

  // 主欄（「やったこと」）の取っ手。**空にするために要る。**
  //
  // この欄だけ WebView で、中身は向こうが持っている。
  // `form.created` を空にしても画面は変わらないので、命令で消す
  // （`WebEditor.jsx` の `clear`）。
  const bodyRef = useRef(null)

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

  const SLOW_SAVE_MS = 6000

  // **戻り値は「残せたか」。** 呼ぶ側（`app/write.jsx`）はこれを見て
  // 画面を閉じるかどうかを決める。上限に当たったときは閉じない——
  // 閉じると、書いたものが行き場を失う。
  async function handleSave() {
    setLoading(true)
    setSlow(false)
    // 書き直したので、前の灯りは捨てる。**受け皿からも消す**
    forgetLight(targetDate)
    setSaveError('')
    const slowTimer = setTimeout(() => setSlow(true), SLOW_SAVE_MS)
    try {
      // **灯りを待たない**（2026-08-23）。
      // `defer_ai` を送ると、保存できた時点でサーバーが返す。
      // 押した人を AI の生成時間だけ立ち止まらせる理由が無い。
      const res = await authFetch('/save', {
        method: 'POST',
        // **必ず新しい記録として入れる**（2026-09-03）。
        //
        // この紙は白紙でしか開かないので、ここから既存を直すことはない。
        // `new` を送らないと、サーバーは日付で既存を見つけて上書きする
        // （`main.py` の `/save`）。**別のことを書いたのに前のが消える。**
        body: JSON.stringify({ ...form, new: true, date: targetDate, defer_ai: true }),
      })
      // **上限に当たったときは、そう言う**（2026-09-02）。
      // 「保存に失敗しました。接続を確認してください」だと、
      // 直せない原因を直そうとさせることになる
      if (res.status === 409) {
        const body = await res.json().catch(() => null)
        setSaveError((body && body.message) || 'この日の記録はここまでです。')
        return false
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      // **控えが古くなった。**これを言わないと、記録タブへ移っても
      // 15秒は前の一覧が出る（`lib/logsCache.js` の `invalidateLogs`）。
      // `onSaved` より先に呼ぶ。あちらは取り直しの結果を受け取る側
      invalidateLogs()

      // **紙を白紙に戻す。**（2026-09-03・作者から「白紙にならない」）
      //
      // 書いたあとに紙が残っている呼ばれ方もある（記録タブの窓）。
      // 主欄は WebView が中身を持っていて `value` が届かないので、
      // 命令で消す（`WebEditor.jsx` の `clear`）。他の3つは `value` で消える。
      setForm({ created: '', enjoyable: '', struggled: '', next: '' })
      bodyRef.current?.clear()
      setOpenFields(new Set())
      setJustOpened(null)
      if (onSaved) onSaved()

      // 灯りは**あとから届く。**ボタンはもう戻っている。
      //
      // **待ちはこの画面が持たない**（`lib/lightBuffer.js`）。
      // 灯りは十数秒かかる。書き終えるとこの画面は閉じるので、
      // ここで待っていても受け取る先が居ない。
      // 届いた灯りは戻った先の紙に出る（`components/LightCard.jsx`）。
      if (data.deferred) requestLight(targetDate)
      return true
    } catch (e) {
      // 画面にはユーザー向けの一文だけ出す。詳細はログに残す
      console.warn('[Home] 記録の保存に失敗', e)
      setSaveError('保存に失敗しました。接続を確認してください。')
      return false
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
      </View>

      {/* 問いはプレースホルダとして入力欄の中に出す。
          欄の上に別行で置くと「読むもの」が増えるが、中に出せば
          書き始める場所と問いが同じ位置になる。
          プレースホルダなので、書き始めれば自然に消える。

          今日の記録のときだけ差し替える。過去の日を編集するときに
          今日の問いを出しても合わない。
          問いが取れなかったときは元の固定文に戻る。 */}
      <Field
        editorRef={bodyRef}
        extras={extras}
        value={form.created}
        onChange={(v) => setForm((f) => ({ ...f, created: v }))}
        label={`${isToday ? '今日' : 'この日'}のこと`}
        rows={bodyRows}
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
      {/* **開いた欄だけを並べる。**
          開く手立ては**キーボードの上の列**にある（`EditorToolbar.jsx`）。
          既定の姿は「やったこと」1段のまま。 */}
      {EXTRA_FIELDS.filter(({ key }) => openFields.has(key)).map(({ key, label }) => (
        <Appear key={key}>
          <Field
          value={form[key]}
          onChange={(v) => setForm((f) => ({ ...f, [key]: v }))}
          label={label}
          extras={extras}
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

      {/* **まだ開いていない欄を、いつでも見えるところに置く**
          （2026-09-03・作者から「ユーザーが気付けるように配置する」）。

          キーボードの上の列にもあるが、**列はキーボードが出ている間しか
          見えない。**この欄を一度も使っていない人は、書き始める前に
          何が書けるのかを知らないままになる。実測の記入率は
          次にやること 16.7% / よかった 5.6% / 困った 5.6%——
          使われていないのではなく、**在ることが見えていなかった。**

          チップではなく**行**にしてある。全画面には横幅があるので、
          丸めて小さくする理由が無い。名前も略さずに出す
          （「詰まったこと・困ったこと」）。**何を書く場所なのかは、
          名前でしか伝わらない。**

          これは手がかりの材料でもある（`lib/hint.js`）。過去の
          「困ったこと」を探しに行く仕組みなので、ここが空だと
          探しても見つからない。 */}
      {extras.length > 0 ? (
        <View className="border-t border-outline-variant">
          {extras.map(({ key, full, onPress }) => (
            <Pressable
              key={key}
              onPress={onPress}
              accessibilityLabel={`${full}を追加`}
              className="flex-row items-center gap-2 py-3 min-h-touch active:opacity-70"
            >
              <Text className="text-label-md text-primary">＋</Text>
              <Text className="text-body-md text-on-surface-variant">{full}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

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

      {/* **全画面のときはボタンを外に出す**（2026-09-03）。
          欄が画面いっぱいなので、下に置くと画面の外へ出てしまう。
          全画面では上の帯に置き、押すと保存して閉じる（`app/write.jsx`）。 */}
      {hideSaveButton ? null : (
        <Pressable
          onPress={handleSave}
          disabled={loading}
          className="bg-lantern-glow rounded-full py-3 min-h-touch justify-center items-center active:opacity-80 disabled:opacity-50"
        >
          <Text className="font-strong text-body-md text-on-lantern">
            {loading ? '保存中...' : '記録する'}
          </Text>
        </Pressable>
      )}

      {slow ? (
        <Text className="text-label-md text-outline text-center">
          まだ保存しています。もう少しかかります。
        </Text>
      ) : null}

      {saveError ? (
        <Text className="text-label-md text-error text-center">{saveError}</Text>
      ) : null}
    </View>
  )
})

export default RecordForm
