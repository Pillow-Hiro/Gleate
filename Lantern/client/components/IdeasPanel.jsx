import { useCallback, useEffect, useRef, useState } from 'react'
import GlassPressable from './GlassPressable'
import { Pressable, View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import Text from './Text'
import SwipeRow from './SwipeRow'
import WebEditor from './WebEditor'
import { authFetch } from '../lib/supabase'
import { useThemeContext } from '../lib/theme'

// アイデアの溜め場。
//
// 「思いついた瞬間に置いて、後で拾うもの」を扱う。
// 記録（4項目）はその日を振り返る構造だが、アイデアは日をまたいで残る。
//
// **件数を出さない。** 溜まっていることを責めない。
// 「〇件未完了」はタスク管理の作法で、Gleate が最も避けている形。
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
// ## 仕組みは `SwipeRow` へ移した（2026-09-11）
//
// 前に添えた曲にも同じ払いが要ると言われ、**ここの形を写すのではなく
// 1つにまとめた。**2つ持つと片方だけ直る。
//
// ここで三度やり直した経緯（自分で角度を測るのをやめ、行そのものを
// 横スクロールにして OS に裁かせる）は `SwipeRow.jsx` に移してある。

// 1行。**チェックと文だけ。**
function IdeaRow({ idea, onTogglePicked, onDelete, isLast }) {
  const picked = Boolean(idea.picked_at)

  return (
    <SwipeRow
      className={isLast ? '' : 'border-b border-border'}
      label={`${idea.text} を削除する`}
      onDelete={() => onDelete(idea)}
    >
      <View className="flex-row items-center gap-3 px-4 py-3">
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
    </SwipeRow>
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
        <GlassPressable
          onPress={handleAdd}
          disabled={!text.trim() || saving}
          className="self-end rounded-full px-5 min-h-touch justify-center disabled:opacity-40 active:opacity-80"
        >
          <Text className="font-strong text-label-md text-on-lantern">置く</Text>
        </GlassPressable>
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
