import { useState } from 'react'
import { Pressable } from 'react-native'
import Text from './Text'
import HintCard from './HintCard'
import { askHint } from '../lib/hint'
import { authFetch } from '../lib/supabase'

// 手がかり。**書く紙の外に出した**（2026-09-03）。
//
// 記録は全画面で書いて、書き終えると閉じる（`app/write.jsx`）。
// 探す材料はそこで書いたものなので、**探せるのは戻ってから。**
// 書いている最中に「探す」を置いても、まだ何も残っていない。
//
// `target` は**探す相手の記録**。カードの中に置くので、
// 押したボタンが載っているカードがそのまま相手になる
// （2026-09-04・作者から「どのカードを対象にしているのだろうか？
// 明確にしましょう」）。
//
// それまでは一覧の下に1つだけ置き、その日の最新を相手にしていた。
// **画面のどこにもそう書いていなかった**うえ、`askHint` は日付しか
// 送っていなかったので、**探すのは1件目・書き込むのは最新**という
// 噛み合わない状態だった。
//
// **無ければ何も出さない。** 材料が一つも無いのに探せると言わない。
//
// ## ここが「困ったこと」の唯一の書き手（2026-09-04）
//
// 書く面から3つの欄を消した（`components/RecordForm.jsx`）ので、
// `struggled` に字が入る道はここだけになった。
//
// **それが狙い。** 書く瞬間に「困ったことは？」と聞くと手が止まる。
// 手がかりを押した人は**いま詰まっている**ので、そこで聞けば
// 一番濃いところが取れる（`modules/ai.py` の「手がかりのための問い」）。
export default function HintPanel({ date, target, onSaved, onPaywall }) {
  const [hint, setHint] = useState(null)
  const [hinting, setHinting] = useState(false)
  const [saving, setSaving] = useState(false)

  // 手がかりを探す。**断られたらペイウォールへ**（無料は通算5回）
  async function ask() {
    setHinting(true)
    try {
      // **この記録から探す。** どのカードのボタンを押したかで決まる
      const got = await askHint(date, target?.id || '')
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

  // 問いへの答えは、**記録の項目に混ぜない**（2026-09-22・作者の指摘
  // 「書くから深堀りをした際に『困ったこと』として記録に残るのは
  // いかがなものか」）。
  //
  // 2026-09-04 から `/save` で `struggled`（困ったこと）に入れていた。
  // 「手がかりを押す人は、いま詰まっている」という前提だったが、**外れる。**
  // 旅の記録に置かれた問いへの答えが、困ったこととして残っていた。
  // 混ぜると `modules/facts.py` がつまずきとして数える。
  //
  // 置き場は `log_answers`（`modules/answers.py`）。問いも一緒に残す——
  // 答えだけでは、あとから読んで何の話か分からない。
  //
  // **表を流すまでは残らない**（`docs/sql/log_answers.sql` が返す 503）。
  // 画面には出さずにここへ書く。カードは「残しました」を出したあと。
  async function answer(text) {
    if (!target?.id) return
    setSaving(true)
    try {
      const res = await authFetch('/api/answers', {
        method: 'POST',
        body: JSON.stringify({
          log_id: target.id,
          date,
          question: hint?.text || '',
          answer: text,
          kind: 'hint',
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      onSaved?.()
    } catch (e) {
      // **画面には出さない。**カードは「残しました」を出したあと。
      // ここで赤い字を足すと、何が起きたのか分からなくなる
      console.warn('[手がかり] 答えを残せなかった', e)
    } finally {
      setSaving(false)
    }
  }

  if (!target) return null

  if (hint) {
    return (
      <HintCard
        kind={hint.kind}
        text={hint.text}
        saving={saving}
        onAnswer={answer}
        onClose={() => setHint(null)}
      />
    )
  }

  return (
    <Pressable
      onPress={ask}
      disabled={hinting}
      className="border border-outline-variant rounded-full py-3 min-h-touch justify-center items-center active:opacity-70 disabled:opacity-50"
    >
      <Text className="text-label-md text-primary">
        {hinting ? '探しています...' : '手がかりを探す'}
      </Text>
    </Pressable>
  )
}
