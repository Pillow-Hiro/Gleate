import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import Text from './Text'
import WebEditor from './WebEditor'
import { authFetch } from '../lib/supabase'
import { useThemeContext } from '../lib/theme'

// アイデアの溜め場。
//
// 「思いついた瞬間に置いて、後で拾うもの」を扱う。
// 記録（4項目）はその日を振り返る構造だが、アイデアは日をまたいで残る。
//
// **件数を出さない。** 溜まっていることを責めない。
// 「〇件未完了」はタスク管理の作法で、Lantern が最も避けている形。
// カレンダーで記録の多寡を評価しないのと同じ理由。
//
// 語は「使った」。2026-08-08 に「拾う」から変えた。
//
// 「拾う」はタスク化を避けるために選んだ語だったが、
// **作者自身が「どういう意味？」と尋ねた。** 意図が正しくても、
// 伝わらなければ意味がない。
//
// 「完了」は避ける。未完了という対が生まれ、残りが負債に見える。
// 「使った」なら、実際に何をしたかを言うだけで、対にならない。
//
// 使ったものには取り消し線を引く。**消さずに残す。**
// アイデアは減らすものではなく、溜まってよいもの。
//
// **2026-08-14 に「使った」「使いました」という字をやめた。**
// 意味は正しかったが、1行のメモに対して**字が多すぎた。**
// 丸いチェックに置き換えている（iOS のリマインダーと同じ形）。
// 押せば入り、もう一度押せば戻る。説明が要らない。
//
// **「完了」ではない**という考え方は変えていない。
// チェックは済んだ印ではなく、**使ったかどうかの印。**
// だから消えないし、件数も出さない。

// 丸いチェック。**絵文字は使わない**ので図形で描く
function CheckCircle({ checked }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle
        cx="12"
        cy="12"
        r="10"
        stroke={checked ? '#FBB03B' : '#847563'}
        strokeWidth="1.8"
        fill={checked ? '#FBB03B' : 'none'}
      />
      {checked ? (
        <Path
          d="M7.5 12.3l3 3 6-6.2"
          stroke="#1D1D1F"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </Svg>
  )
}

// 削除は**左に払うとゴミ箱が出る**（2026-08-15・iOS の作法）。
// それまでは行を押して開き、中の「削除」を押し、確認をもう一度押す
// という3手で、**押して開く操作が「使った」と紛らわしかった。**
//
// `react-native-gesture-handler` は直接の依存に入れていない
// （足すと指紋が変わり、配信済みのビルドへ OTA が届かなくなる）。
const TRASH_WIDTH = 80

function TrashIcon({ color = '#FFFFFF' }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 7h16M10 4h4M6 7l1 13h10l1-13M10 11v6M14 11v6"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// 1行。**チェックと文だけ。**
//
// 削除は**左に払うとゴミ箱が出る**（iOS の作法）。
//
// ## 払う仕組みを作り直した（2026-08-15・三度目）
//
// `PanResponder` で「横が縦より動いていたら奪う」と書いていたが、
// **一覧の縦スクロールに勝てなかった。** 比率を 2倍 → 1.2倍 → 同数と
// 緩めても、実機では取られ続けた。
//
// **判定を自分で書くのをやめた。** 行そのものを横スクロールにすると、
// 縦と横のどちらの操作なのかは **OS が裁く。**
// iOS の「メール」も同じ作り（入れ子のスクロール）で、
// 縦に流れている最中でも横に払える。
//
// 自分で角度を測るより、端末が持っている裁定に任せる方が強い。
//
// 幅は測って渡す。`onLayout` を待つあいだは行だけを描く
// （0 のまま横に並べると、ゴミ箱が画面の左端に見えてしまう）。
function IdeaRow({ idea, onTogglePicked, onDelete, isLast }) {
  const picked = Boolean(idea.picked_at)
  const [width, setWidth] = useState(0)
  const scroller = useRef(null)

  function handleDelete() {
    // 消す前に閉じておく。開いたまま次の行が繰り上がると、
    // 触っていない行のゴミ箱が出ているように見える
    scroller.current?.scrollTo({ x: 0, animated: false })
    onDelete(idea)
  }

  const row = (
    <View
      style={width ? { width } : undefined}
      className="flex-row items-center gap-3 px-4 py-3 bg-surface-lowest"
    >
      <Pressable
        onPress={() => onTogglePicked(idea)}
        accessibilityLabel={picked ? '使っていないことにする' : '使ったことにする'}
        hitSlop={10}
        className="min-h-touch justify-center"
      >
        <CheckCircle checked={picked} />
      </Pressable>

      <Text
        className={`flex-1 text-body-md leading-relaxed ${
          picked ? 'text-outline' : 'text-on-surface'
        }`}
        style={picked ? { textDecorationLine: 'line-through' } : undefined}
      >
        {idea.text}
      </Text>
    </View>
  )

  return (
    <View className={isLast ? '' : 'border-b border-border'} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width === 0 ? (
        row
      ) : (
        <ScrollView
          ref={scroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          // **吸い付く位置は2つだけ。** 閉じているか、開いているか
          snapToOffsets={[0, TRASH_WIDTH]}
          snapToEnd={false}
          decelerationRate="fast"
          bounces={false}
          overScrollMode="never"
          // 行の中のチェックは押せたままにする
          keyboardShouldPersistTaps="handled"
        >
          {row}
          <Pressable
            onPress={handleDelete}
            accessibilityLabel={`${idea.text} を削除する`}
            style={{ width: TRASH_WIDTH }}
            className="bg-error items-center justify-center"
          >
            <TrashIcon />
          </Pressable>
        </ScrollView>
      )}
    </View>
  )
}

export default function IdeasPanel() {
  const [ideas, setIdeas] = useState(null)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const { isDark } = useThemeContext()
  // 置いたあとに欄を空にする。**中身は WebView が持っている**ので、
  // こちらから空にするには作り直すしかない
  const [editorKey, setEditorKey] = useState(0)

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
        setEditorKey((k) => k + 1)
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
      {/* 入力はラベルも項目も置かない。
          メモ書き程度のものに4項目のフォームを出すのは重すぎる。

          **欄を大きくした**（2026-08-14）。1行だと、思いついたことが
          1行に収まる長さかどうかを先に考えることになっていた。
          複数行を受けるが、**返るのは1件**（性質は変えない）。 */}
      <View className="bg-surface-lowest rounded-lg p-4 gap-3 shadow-bloom">
        {/* **記録と同じ欄を使う**（2026-08-15）。
            素の `TextInput` では日本語の未確定の波線が出なかった。
            記録の欄（`WebEditor`）は中が本物の入力なので、
            変換中の見え方も OS が描いたものになる。

            **装飾は付けない。** キーボードの上の列に登録しないので、
            太字も箇条書きも出ない。1行のメモに道具立ては要らない。 */}
        <WebEditor
          key={editorKey}
          value={text}
          onChange={setText}
          isDark={isDark}
          minHeight={76}
          placeholder="思いついたこと"
        />
        <Pressable
          onPress={handleAdd}
          disabled={!text.trim() || saving}
          className="self-end bg-lantern-glow rounded-full px-5 min-h-touch justify-center disabled:opacity-40 active:opacity-80"
        >
          <Text className="font-strong text-label-md text-on-lantern">置く</Text>
        </Pressable>
      </View>

      {ideas === null ? (
        <View className="gap-3 pt-2">
          {[1, 2, 3].map((i) => (
            <View key={i} className="h-4 bg-surface-high rounded-full w-3/4" />
          ))}
        </View>
      ) : ideas.length === 0 ? (
        <Text className="text-body-md text-outline py-6">
          思いついたことを、ここに置いておけます。
        </Text>
      ) : (
        // **使ったものを下へ落とす。** 混ざっていると、
        // まだ使っていないものを目で拾い直すことになる。
        // 消さないので、下には残り続ける
        <View className="bg-surface-lowest border border-border rounded-lg overflow-hidden shadow-bloom">
          {[...ideas]
            .sort((a, b) => Number(Boolean(a.picked_at)) - Number(Boolean(b.picked_at)))
            .map((idea, i, arr) => (
              <IdeaRow
                key={idea.id}
                idea={idea}
                onTogglePicked={handleTogglePicked}
                onDelete={handleDelete}
                isLast={i === arr.length - 1}
              />
            ))}
        </View>
      )}
    </View>
  )
}
