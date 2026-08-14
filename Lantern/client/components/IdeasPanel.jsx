import { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, PanResponder, Pressable, TextInput, View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import Text from './Text'
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

// 1行。**チェックと文だけ。**
//
// 削除は**左に払うとゴミ箱が出る**（2026-08-15・iOS の作法）。
// それまでは行を押して開き、中の「削除」を押し、確認をもう一度押す
// という3手で、**押して開く操作が「使った」と紛らわしかった。**
//
// `react-native-gesture-handler` は直接の依存に入れていないので、
// RN 標準の `PanResponder` で作る。依存を足すと指紋が変わり、
// 配信済みのビルドへ OTA が届かなくなる。
const TRASH_WIDTH = 80
// これ以上払ったら開く
const OPEN_AT = 32

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

function IdeaRow({ idea, onTogglePicked, onDelete, isLast }) {
  const picked = Boolean(idea.picked_at)
  const slide = useRef(new Animated.Value(0)).current
  const openRef = useRef(false)

  function settle(toValue) {
    openRef.current = toValue !== 0
    Animated.spring(slide, {
      toValue,
      useNativeDriver: true,
      bounciness: 0,
      speed: 18,
    }).start()
  }

  const pan = useRef(
    PanResponder.create({
      // **横に払ったときだけ拾う。** 縦は一覧のスクロールに渡す。
      //
      // `Capture` を使う（2026-08-15）。実機で「縦スクロールの方が強い」と
      // 言われた。`onMoveShouldSetPanResponder` は親が先に手を挙げたあとに
      // 呼ばれるので、**上の `ScrollView` に先を越されていた。**
      // `Capture` は親より先に判定される。
      //
      // 横が縦より勝っているときに奪う。
      //
      // **2026-08-15 に条件を緩めた。** 2倍を求めると、
      // 指がわずかに斜めに動いただけで一覧のスクロールに取られていた。
      // 1.2 倍で足りる（真横に払うつもりの指は、たいてい 2 倍を超えない）。
      onMoveShouldSetPanResponderCapture: (_e, g) =>
        Math.abs(g.dx) > 4 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
      onPanResponderMove: (_e, g) => {
        const base = openRef.current ? -TRASH_WIDTH : 0
        const next = Math.min(0, Math.max(-TRASH_WIDTH, base + g.dx))
        slide.setValue(next)
      },
      onPanResponderRelease: (_e, g) => {
        const base = openRef.current ? -TRASH_WIDTH : 0
        settle(base + g.dx < -OPEN_AT ? -TRASH_WIDTH : 0)
      },
      onPanResponderTerminate: () => settle(0),
    })
  ).current

  return (
    <View className={isLast ? '' : 'border-b border-border'}>
      <View>
        {/* ゴミ箱は下に敷いておく。払うと行がずれて現れる */}
        <View className="absolute right-0 top-0 bottom-0 justify-center">
          <Pressable
            onPress={() => onDelete(idea)}
            accessibilityLabel="このアイデアを削除する"
            style={{ width: TRASH_WIDTH }}
            className="h-full bg-error items-center justify-center rounded active:opacity-80"
          >
            <TrashIcon />
          </Pressable>
        </View>

        <Animated.View
          {...pan.panHandlers}
          style={{ transform: [{ translateX: slide }] }}
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
        </Animated.View>
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
      {/* 入力はラベルも項目も置かない。
          メモ書き程度のものに4項目のフォームを出すのは重すぎる。

          **欄を大きくした**（2026-08-14）。1行だと、思いついたことが
          1行に収まる長さかどうかを先に考えることになっていた。
          複数行を受けるが、**返るのは1件**（性質は変えない）。 */}
      <View className="bg-surface-lowest rounded-lg p-4 gap-3 shadow-bloom">
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          textAlignVertical="top"
          style={{ minHeight: 76 }}
          placeholder="思いついたこと"
          placeholderTextColor="#8E8478"
          className="font-body text-body-md text-on-surface"
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
