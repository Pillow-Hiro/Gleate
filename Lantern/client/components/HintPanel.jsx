import { useState } from 'react'
import { Pressable } from 'react-native'
import Text from './Text'
import HintCard from './HintCard'
import { askHint } from '../lib/hint'
import { authFetch } from '../lib/supabase'
import { invalidateLogs } from '../lib/logsCache'

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

  // 問いへの答えを「困ったこと」に残す。**新しい経路を作らない。**
  //
  // `/save` をそのまま使う。`defer_ai` を付けて灯りは頼まない——
  // 答えを足しただけで灯りを作り直すと、書いた本人の言葉が
  // 上書きされたように見える。
  //
  // **書き先は手がかりが見ていた記録。** `id` を送らないと、
  // サーバーはその日の最初の記録を書き換える（`main.py` の `/save`）。
  // 中身もその記録から取る。空の4欄を送ると塗り潰しになる。
  async function answer(text) {
    if (!target?.id) return
    setSaving(true)
    try {
      const res = await authFetch('/save', {
        method: 'POST',
        body: JSON.stringify({
          created: target.created || '',
          enjoyable: target.enjoyable || '',
          next: target.next || '',
          struggled: text,
          id: target.id,
          date,
          defer_ai: true,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      invalidateLogs()
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
