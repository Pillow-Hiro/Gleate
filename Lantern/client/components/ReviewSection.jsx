import { useCallback, useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import Text from './Text'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { authFetch } from '../lib/supabase'
import { paywallMessage, readMaybePaywall } from '../lib/plan'
import Paywall from './Paywall'
import { formatAge } from '../lib/format'
import { useRouter } from 'expo-router'
import GlassPressable from './GlassPressable'
import DeepenResult, { shortDate } from './DeepenResult'
import { useRefreshOnFocus } from '../lib/refreshOnFocus'
import { chooseReading } from '../lib/readingChoiceStore'

// 振り返りの出し方（2026-09-13・作者の指示「分かりやすく表示したい」→ B案）。
//
// ## 何が読みにくかったか
//
// 観察と問いが**同じ大きさ**で、斜体と色しか違わなかった。そして
// 砂色の箱が3つ積むので、**3つあることも、どこで切れるかも**分からない。
//
// さらに 2026-09-13 に「問いを省いてよい」と許したところ、
// **無いときに空の行と余白だけが残っていた**（`<Text>{undefined}</Text>`）。
//
// ## 直した形
//
// 紙は1枚。
// 問いは**余白の線**に出す——灯り待ちや今週の発見で使っている
// `MarginNote` と同じ形で、「余白に置かれたもの」として揃う。
//
// 地の色は砂のまま（作者の指示「色はそのまま」）。
//
// ## 番号を外した（2026-09-13）
//
// 観察に 1・2・3 と通し番号を振っていた。3つあることが分かるように、
// という狙いだったが、作者から「**1と2という番号が割り振られている
// けどナニコレ？**」。
//
// **何の番号か説明が要る印は、印として働いていない。**しかも番号は
// 順位や手順に読める。観察に上下は無い。区切りの線だけで、
// 複数あることは分かる。
//
// ## 観察が1つになった（2026-09-13・作者の判断）
//
// 振り返りも観察を1つしか返さなくなったので、複数を1枚に並べる
// 一覧用の形は要らなくなった。**過去との対話と同じ `PatternCard`**
// で出す。
//
// 端末に残っている古い振り返り（観察3つの頃のもの）もあるので、
// **ここでも先頭の1つだけ出す。**サーバーで切っていても、控えは切れていない。

/** 問い。**余白の線に出す。**無ければ何も描かない */
function Question({ text }) {
  if (!text || !String(text).trim()) return null
  return (
    // 片側だけの線に角丸は付けない（`MarginNote.jsx`）
    <View className="border-l-2 border-outline-variant pl-3 mt-2.5">
      <Text className="text-body text-on-surface-variant leading-relaxed">{text}</Text>
    </View>
  )
}

/** 観察を1つ出す形。**振り返りと過去との対話が使う** */
export function PatternCard({ observation, question }) {
  return (
    <View className="bg-ai-surface/60 border border-ai-ink/20 rounded-lg px-5 py-4">
      <Text className="text-body text-on-surface leading-relaxed">{observation}</Text>
      <Question text={question} />
    </View>
  )
}

/**
 * 観察が立っている記録の日付（2026-09-13）。**数えた事実から出す**
 * ——文の中の日付は信用しない（`modules/ai.py` の `_attach_fact`）。
 * 押すとその日の記録が開く。**無料**。
 */
function Evidence({ dates, onOpen }) {
  if (!dates || dates.length === 0) return null
  return (
    <View className="flex-row flex-wrap gap-2">
      {dates.map((d) => (
        <Pressable
          key={d}
          onPress={() => onOpen(d)}
          accessibilityLabel={`${shortDate(d)}の記録を開く`}
          className="bg-surface-lowest border border-border rounded-full px-3 py-1 active:opacity-70"
        >
          <Text className="text-label-sm text-on-surface-variant">{shortDate(d)}</Text>
        </Pressable>
      ))}
    </View>
  )
}

// Web版 Journal.jsx の ReviewSection を移植したもの。
// localStorage は同期的に初期値を読めたが AsyncStorage は非同期なので、
// 初期値は null 固定にして useEffect で復元する。
export default function ReviewSection({ title, type, description }) {
  const storageKey = `lantern-review-${type}`
  const [patterns, setPatterns] = useState(null)
  const [generatedAt, setGeneratedAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [restored, setRestored] = useState(false)
  // 断られたときの一文。**null なら断られていない**
  const [paywall, setPaywall] = useState(null)
  const router = useRouter()

  // 無料の人にだけ、深掘りが有料だと**先に**書く。押してから知らせない。
  // 月次はそもそも有料の人しか見ないので、週次のときだけ訊く
  const [paid, setPaid] = useState(null)
  useEffect(() => {
    if (type !== 'weekly') return
    let cancelled = false
    ;(async () => {
      try {
        const res = await authFetch('/api/plan')
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setPaid(Boolean(data.paid))
      } catch (e) {
        console.warn('[Review] プランの取得に失敗', e)
      }
    })()
    return () => { cancelled = true }
  }, [type])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey)
        if (raw && !cancelled) {
          const stored = JSON.parse(raw)
          setPatterns(stored?.patterns ?? null)
          setGeneratedAt(stored?.generatedAt || '')
        }
      } catch (e) {
        // キャッシュが壊れていても初期状態として扱う
        console.warn('[Review] 振り返りキャッシュの読み込みに失敗', e)
      } finally {
        if (!cancelled) setRestored(true)
      }
    })()
    return () => { cancelled = true }
  }, [storageKey])

  // **深掘りの全画面から戻ったとき、控えを読み直す**（2026-09-13）。
  // 深掘りの結果は控えの観察に書き足されるので、ここで拾ってカードの下に出す
  const reload = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(storageKey)
      if (!raw) return
      const stored = JSON.parse(raw)
      setPatterns(stored?.patterns ?? null)
      setGeneratedAt(stored?.generatedAt || '')
    } catch (e) {
      console.warn('[Review] 振り返りキャッシュの読み直しに失敗', e)
    }
  }, [storageKey])
  useRefreshOnFocus(reload)

  // 根拠の記録を開く。**無料**——自分の記録への道に料金をかけない
  function openDate(date) {
    router.navigate({ pathname: '/journal', params: { date } })
  }

  async function generate() {
    setLoading(true)
    setPatterns([])
    setPaywall(null)
    try {
      const res = await authFetch('/api/review/generate', {
        method: 'POST',
        body: JSON.stringify({ type }),
      })
      // **断られたのは失敗ではない。** プランの案内を出す
      const { paidRequired, body: data } = await readMaybePaywall(res)
      if (paidRequired) {
        setPaywall(paywallMessage(data))
        return
      }
      if (!res.ok || !data) throw new Error()
      const now = new Date().toISOString()
      const newPatterns = data.patterns || []
      setPatterns(newPatterns)
      setGeneratedAt(now)
      await AsyncStorage.setItem(storageKey, JSON.stringify({ patterns: newPatterns, generatedAt: now }))
    } catch (e) {
      console.warn(`[Review] ${type} の生成に失敗`, e)
      setPatterns([])
    } finally {
      setLoading(false)
    }
  }

  const hasPatterns = patterns !== null && patterns.length > 0
  const isEmpty = patterns !== null && patterns.length === 0

  // 断られている間は本来の中身を出さない。**2つを同時に見せない**
  if (paywall) {
    return (
      <View className="gap-3">
        <Paywall
          message={paywall}
          onClose={() => setPaywall(null)}
          onPurchased={() => { setPaywall(null); generate() }}
        />
      </View>
    )
  }

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-3">
          <Text className="font-display text-body-lg text-on-surface">{title}</Text>
          <Text className="text-aux text-outline mt-0.5">{description}</Text>
        </View>
        <Pressable
          onPress={generate}
          disabled={loading}
          className="border border-ai-ink/40 rounded-full px-3.5 py-1.5 disabled:opacity-50"
        >
          <Text className="text-aux text-primary">{loading ? '読んでいます...' : '振り返る'}</Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="gap-3">
          {[1, 2].map((i) => (
            <View key={i} className="bg-surface-low/60 rounded-lg px-5 py-4 gap-2.5">
              <View className="h-3.5 bg-surface-high rounded-full w-full" />
              <View className="h-3.5 bg-surface-high rounded-full w-4/5" />
              <View className="h-3 bg-surface-high rounded-full w-2/3" />
            </View>
          ))}
        </View>
      ) : null}

      {!loading && hasPatterns ? (
        <View className="gap-2">
          {generatedAt ? <Text className="text-[10px] text-outline">{formatAge(generatedAt)}</Text> : null}
          <PatternCard observation={patterns[0].observation} question={patterns[0].question} />
          <Evidence dates={patterns[0].fact?.dates} onOpen={openDate} />
          {/* 深掘り（2026-09-13）。**押すと全画面、閉じると結果がここに残る**
              （作者の指示）。一度深掘りしたものは、ボタンの代わりに結果を出す */}
          {patterns[0].deepen ? (
            /* 見立ては、閉じたあとのここでも選べる（2026-09-22）。
               深掘りの結果が出たあと、全画面へ戻る道が無い */
            <DeepenResult
              result={patterns[0].deepen}
              onOpenRecord={openDate}
              chosen={typeof patterns[0].deepen.chosen === 'number' ? patterns[0].deepen.chosen : null}
              onChoose={async (index, reading) => {
                await chooseReading({
                  storageKey, index, reading, observation: patterns[0].observation,
                })
                reload()
              }}
            />
          ) : (
            <View className="items-start gap-1 mt-1">
              <GlassPressable
                onPress={() => router.push({ pathname: '/deepen', params: { type } })}
                className="rounded-full px-4 py-2 min-h-touch justify-center"
              >
                <Text className="font-strong text-label-md text-on-lantern">深掘りする</Text>
              </GlassPressable>
              {type === 'weekly' && paid === false ? (
                <Text className="text-label-sm text-outline">Gleate Plus で開きます</Text>
              ) : null}
            </View>
          )}
        </View>
      ) : null}

      {/* **「気づきを届けます」と言わない**（2026-08-18）。
          気づきは利用者のもので、Gleate が届けるのは並べ直した記録まで。
          AI憲法の中核原則は「①並べる ②差分を出す」までを AI の仕事とし、
          **③意味づけはユーザーだけが行う**と定めている。
          プロンプト側は「観察」で通っていたのに、
          ボタンの説明だけが③に踏み込んでいた。 */}
      {!loading && restored && patterns === null ? (
        <View className="border border-border border-dashed rounded-lg px-5 py-6 items-center">
          <Text className="text-body text-outline text-center">
            「振り返る」を押すと、Gleateが記録を並べます。
          </Text>
        </View>
      ) : null}

      {/* **未来を約束しない**（2026-08-18）。
          「記録が増えると、パターンが見えてきます。」と書いていた。
          禁止ワードの「きっと〇〇できます」と同じ形で、
          **空の画面が「もっと書け」と押していた。**
          いま無いという事実だけを言う。 */}
      {!loading && isEmpty ? (
        <View className="border border-border border-dashed rounded-lg px-5 py-6 items-center">
          <Text className="text-body text-outline text-center">まだ並べられるほどの記録がありません。</Text>
        </View>
      ) : null}
    </View>
  )
}
