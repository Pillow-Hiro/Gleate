import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import Svg, { Path, Rect } from 'react-native-svg'
import * as DocumentPicker from 'expo-document-picker'
import Text from './Text'
import WebEditor from './WebEditor'
import FileList from './FileList'
import { list as listFiles, save as saveFile } from '../lib/fileStore'
import { useThemeContext } from '../lib/theme'
import { authFetch } from '../lib/supabase'
import { invalidateLogs } from '../lib/logsCache'
import { forgetLight, requestLight } from '../lib/lightBuffer'
import { todayStr } from '../lib/date'
import { loadFor as loadPhotoFor, remove as removePhoto, save as savePhoto } from '../lib/photoStore'
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

// 日付の行に置く小さな暦。**絵文字は使わない**ので図形で描く
function CalendarIcon({ color = '#847563' }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="5" width="18" height="16" rx="3" stroke={color} strokeWidth="1.8" />
      <Path d="M3 10h18M8 3v4M16 3v4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  )
}
// 書く面。**WebView をひとつ持つだけ**（`components/WebEditor.jsx`）。
//
// **モジュールの外に置くこと。**
//
// 2026-08-07 まで RecordForm の中で定義していた。1文字打つたびに
// `setForm` で再描画され、そのたびに別の関数になるため、React は
// 「別のコンポーネントに変わった」と見なして中身を作り直していた。
// 結果、**焦点が外れ、キーボードが閉じ、1文字しか打てなかった。**
//
// **枠を持たない**（2026-08-14・デザイン案 `3_write`）。
// 書くところが「入力欄」ではなく「紙」に見えるようにする。
//
// **読む面と書く面は1つ**（2026-08-20）。書いていない間だけ `Text` を
// 置く作りだったが、押すたびに WebView が生え直してちらつき、
// 書体が違って字の大きさも変わって見えた（WebView からは
// `expo-font` の書体が見えない）。描く部品を1つにすれば揃える必要がない。
//
// **道具はキーボードの上にしか置かない**（2026-08-15・作者の判断）。
// この面は「いま書いているのは自分だ」と列に登録するだけ
// （`components/EditorToolbar.jsx`）。
function Body({ value, onChange, placeholder, rows, onPhoto, onFile, editorRef }) {
  // 書いている最中かどうか。**書いている面だけが列に登録する**
  const [editing, setEditing] = useState(false)
  // いま効いている装飾。**面が知らせてくる。**
  // これが無いと、押したボタンが効いたのかどうかが分からない
  const [active, setActive] = useState(null)
  const { isDark } = useThemeContext()
  const owner = useId()
  const { register, release } = useEditorToolbar()

  // **キーボードの上の道具に、この面を渡す。**
  //
  // 装飾は**中で効かせる**（`exec`）。こちらから文字列を組み直すと、
  // WebView が持っている選択範囲が失われる。
  useEffect(() => {
    if (!editing) return
    register({
      owner,
      exec: (cmd) => editorRef.current?.exec(cmd),
      onPhoto,
      onFile,
      active,
      // **「日記の候補」で選ばれた1行を差し込む口。**
      // 中身は WebView が持っているので `value` を書き換えても
      // 画面には出ない。命令で入れる。
      onSuggest: (text) => editorRef.current?.insertText(text),
    })
    return () => release(owner)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, owner, active])

  return (
    <WebEditor
      ref={editorRef}
      value={value}
      onChange={onChange}
      onFocus={() => setEditing(true)}
      onBlur={() => setEditing(false)}
      onState={(st) => setActive({ bold: st.bold, italic: st.italic, bullet: st.bullet })}
      isDark={isDark}
      minHeight={rows * 32 + 16}
      placeholder={placeholder}
    />
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
// `editing` は**直す相手の記録**（2026-09-05・作者の指示で
// 「記録」タブの編集を全画面へ移した）。渡されると中身を載せて開き、
// 保存はその記録を書き換える。渡されなければ今までどおり白紙。
const RecordForm = forwardRef(function RecordForm(
  { targetDate, onSaved, question, hideSaveButton, bodyRows = 7, editing },
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
  const [form, setForm] = useState(() => ({
    created: editing?.created || '',
    // 見えない3つは**触らずに持ち回る**（`components/LogDetail.jsx` と同じ）。
    // 送らないとサーバーが空文字で上書きする（`main.py` の `/save`）
    enjoyable: editing?.enjoyable || '',
    struggled: editing?.struggled || '',
    next: editing?.next || '',
  }))
  // **書く欄はひとつだけ**（2026-09-04・作者の指示
  // 「よかったこと、困ったこと、次にやることの入力フィールドを消して、
  // アプローチ方法を変えましょう」）。
  //
  // ## なぜ消したか
  //
  // 2026-08-06 の実測（全18件）で 15/18 が「やったこと」だけで完結し、
  // 記入率は 次にやること 16.7% / よかった 5.6% / 困った 5.6% だった。
  // 畳んでも、チップにしても、紙の下に行として並べても動かなかった
  // （2026-08-14 / 2026-09-03 / 2026-09-03）。
  //
  // **置き方の問題ではなかった。** 書いたあとに自分で分類させる形が、
  // 書く手を止めていた。3度置き直して動かないものは、置き方ではない。
  //
  // ## 代わりに何をするか
  //
  // **手がかりが、詰まっている瞬間に一つだけ聞く**
  // （`modules/ai.py` の「手がかりのための問い」）。あそこには
  // こう書いてある——「書く瞬間は一行のままにしておきたい。だが
  // 手がかりには詰まりと打った手が要る。**同じ入力に両方を負わせない。**
  // 集めるのは『手がかりが欲しい』と思った瞬間にする。
  // **そのとき人は詰まっている。**一番濃いところで聞ける。」
  //
  // 欄を消すのは、**そこで始まっていた移動の完了**にあたる。
  //
  // ## 何を消していないか
  //
  // **列（`enjoyable` / `struggled` / `next`）は消さない。**
  // - これまでの記録に中身が入っている。読めなくなる
  // - 「記録」タブでは今までどおり出るし、直せる（`LogDetail.jsx`）
  // - 検索も書き出しも4つとも見る
  // - 灯りと手がかりは材料として読む（`modules/ai.py`）
  // - 手がかりの答えは `struggled` に入る。**いまはそこが唯一の書き手**
  //   （`components/HintPanel.jsx`）
  //
  // 送るのは空文字。古いビルドは今までどおり4つ送ってくるので、
  // サーバーは何も変えていない。
  const [loading, setLoading] = useState(false)
  const [slow, setSlow] = useState(false)
  const [saveError, setSaveError] = useState('')
  // **写真は記録ごと**（2026-09-05・作者の指示）。
  //
  // 新しく書くときは、まだ id が無い（サーバーが採番する）。
  // **選んだものを持っておき、残せた時点で id の名前で置く。**
  // 途中でやめた人の写真が端末に残らないのも、こちらの方が正しい。
  const [photoUrl, setPhotoUrl] = useState(() => loadPhotoFor(editing?.id).photo_url)
  const pending = useRef(null)

  // 全画面の「記録する」はこの外にある。**同じ手続きを呼ばせる。**
  // 保存の中身が2か所に分かれると、片方だけ古くなる
  useImperativeHandle(ref, () => ({ save: handleSave }))

  // 写真は端末に即座に置く。テキストの「記録する」を待たない。
  // ここで onSaved() を呼ばないのは、logs を取り直すと key が変わって
  // このフォームが作り直され、入力途中のテキストが消えるため。
  async function handlePhotoSelect(photo, thumb) {
    if (editing?.id) {
      setPhotoUrl(savePhoto(targetDate, photo, thumb, editing.id).photo_url)
      return
    }
    // まだ id が無い。**残せたときに置く**（`handleSave`）
    pending.current = { photo, thumb }
    setPhotoUrl(photo)
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

  // 添えたファイル。**端末の中だけ**（`lib/fileStore.js`）。
  //
  // **記録ごとに持つ**（2026-09-05・作者の指示）。写真と同じで、
  // 新しく書くときはまだ id が無いので**預かっておき、残せた時点で置く。**
  const [files, setFiles] = useState(() => (editing?.id ? listFiles('', editing.id) : []))
  const [pendingFiles, setPendingFiles] = useState([])
  function refreshFiles() {
    if (editing?.id) setFiles(listFiles('', editing.id))
  }

  async function pickFile() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true })
      if (res.canceled) return
      for (const asset of res.assets ?? []) {
        const name = asset.name || 'file'
        if (editing?.id) {
          saveFile(targetDate, asset.uri, name, editing.id)
        } else {
          // まだ id が無い。**残せたときに置く**（`handleSave`）
          setPendingFiles((prev) => [
            ...prev,
            { uri: asset.uri, name, size: asset.size ?? 0, pending: true },
          ])
        }
      }
      refreshFiles()
    } catch (e) {
      // 選べなくても記録は書ける
      console.warn('[File] 追加に失敗', e)
    }
  }

  async function handlePhotoRemove() {
    if (editing?.id) removePhoto(targetDate, editing.id)
    pending.current = null
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
        // **直すときは id を送る**（2026-09-05）。送らないと `new` の側に
        // 落ちて、直したつもりが**もう1件増える**
        body: JSON.stringify(
          editing?.id
            ? { ...form, id: editing.id, date: targetDate, defer_ai: true }
            : { ...form, new: true, date: targetDate, defer_ai: true },
        ),
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

      // **残せたので、預かっていた写真を置く**（2026-09-05）。
      // id はいまサーバーが返してきたもの。失敗しても記録は残っている
      if (pending.current && data.id) {
        try {
          savePhoto(targetDate, pending.current.photo, pending.current.thumb, data.id)
          pending.current = null
        } catch (e) {
          console.warn('[Photo] 保存に失敗', e)
        }
      }
      if (pendingFiles.length && data.id) {
        for (const f of pendingFiles) {
          try {
            saveFile(targetDate, f.uri, f.name, data.id)
          } catch (e) {
            console.warn('[File] 保存に失敗', e)
          }
        }
        setPendingFiles([])
      }

      // **控えが古くなった。**これを言わないと、記録タブへ移っても
      // 15秒は前の一覧が出る（`lib/logsCache.js` の `invalidateLogs`）。
      // `onSaved` より先に呼ぶ。あちらは取り直しの結果を受け取る側
      invalidateLogs()

      // **紙を白紙に戻す。**（2026-09-03・作者から「白紙にならない」）
      //
      // 書いたあとに紙が残っている呼ばれ方もある（記録タブの窓）。
      // 主欄は WebView が中身を持っていて `value` が届かないので、
      // 命令で消す（`WebEditor.jsx` の `clear`）。他の3つは `value` で消える。
      // **直したときは白紙に戻さない。** 呼ぶ側が閉じる
      if (!editing?.id) {
        setForm({ created: '', enjoyable: '', struggled: '', next: '' })
        bodyRef.current?.clear()
        setPhotoUrl(null)
      }
      if (onSaved) onSaved()

      // 灯りは**あとから届く。**ボタンはもう戻っている。
      //
      // **待ちはこの画面が持たない**（`lib/lightBuffer.js`）。
      // 灯りは十数秒かかる。書き終えるとこの画面は閉じるので、
      // ここで待っていても受け取る先が居ない。
      // 届いた灯りは戻った先に出る（`components/LightPending.jsx` と
      // 今日の記録のカード）。
      //
      // **書いた記録の id を渡す**（2026-09-04）。渡さないとサーバーは
      // 日付で引いて**その日の1件目**に灯りを付ける（`main.py` の
      // `/api/light`）。2件目を書いた人には、朝の記録への返事が返っていた。
      if (data.deferred) requestLight(targetDate, data.id || '')
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

      {/* **書く欄はひとつだけ**（2026-09-04）。よかったこと・困ったこと・
          次にやることの欄は消した。理由は上の状態のところに書いてある。

          問いはプレースホルダとして中に出す。欄の上に別行で置くと
          「読むもの」が増えるが、中に出せば書き始める場所と問いが
          同じ位置になる。書き始めれば自然に消える。

          今日の記録のときだけ差し替える。過去の日を編集するときに
          今日の問いを出しても合わない。
          問いが取れなかったときは元の固定文に戻る。 */}
      <Body
        editorRef={bodyRef}
        value={form.created}
        onChange={(v) => setForm((f) => ({ ...f, created: v }))}
        rows={bodyRows}
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

      {/* 添えたファイル。**サーバーへは送らない**（端末の中だけ）。
          まだ置いていないものは、消し方をこちらが持つ（`FileList`） */}
      <FileList
        files={[...files, ...pendingFiles]}
        onChange={refreshFiles}
        onRemove={(file) => {
          if (!file.pending) return
          setPendingFiles((prev) => prev.filter((f) => f.uri !== file.uri))
        }}
      />

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
