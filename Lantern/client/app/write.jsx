import { useRef, useState } from 'react'
import { Dimensions, Pressable, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Text from '../components/Text'
import RecordForm from '../components/RecordForm'
import { EditorToolbarBar, TOOLBAR_MAX_HEIGHT } from '../components/EditorToolbar'
import { useKeyboardHeight } from '../lib/keyboard'
import { todayStr } from '../lib/date'
import { bodyRowsFor } from '../lib/keyboardMath'

// 記録を書く全画面。**作者の判断**（2026-09-03）。
//
// 「記録フィールドを全画面にしたい」「記録まるごと。全画面で保存まで」。
// 「書く」タブは入口になり、押すとここが上から被さる。
// 「記録する」で保存して閉じ、戻った先に灯りと手がかりが出る。
//
// ## なぜ列をここにも置くか
//
// 装飾の列は画面の一番外にある（`app/_layout.jsx`）が、
// **この画面はその上に出る。**下に隠れて見えないので、
// 同じ列をもう1つ置く（`EditorToolbarBar`。記録タブの窓と同じ理由）。
//
// ## なぜ「記録する」が上の帯にあるか
//
// 欄が画面いっぱいなので、ボタンを下に置くと画面の外へ出る。
// 上の帯なら、どれだけ書いても同じ場所にある。

export default function Write() {
  const params = useLocalSearchParams()
  const router = useRouter()
  const keyboardHeight = useKeyboardHeight()
  const formRef = useRef(null)
  const [saving, setSaving] = useState(false)

  // **未来の日付では開かない**（`app/(tabs)/index.jsx` と同じ扱い）
  const dateParam = typeof params.date === 'string' ? params.date : null
  const targetDate = dateParam && dateParam <= todayStr() ? dateParam : todayStr()
  // 問いは入口が持っている。**取り直さない。**
  // ここで `/api/question` を叩くと、開いた瞬間に問いの無い欄が出て、
  // あとから差し替わる
  const question = typeof params.question === 'string' ? params.question : ''

  async function save() {
    if (saving) return
    setSaving(true)
    try {
      // **残せたときだけ閉じる。** 上限（409）や通信の失敗で閉じると、
      // 書いたものが行き場を失う。断りの一文はフォームが出している
      const ok = await formRef.current?.save()
      if (ok) close()
    } finally {
      setSaving(false)
    }
  }

  // **入口へ戻る。** 履歴が無いとき（リンクで直に開いたとき）は
  // 戻る先が無いので、書く場所へ置き換える
  function close() {
    if (router.canGoBack()) router.back()
    else router.replace('/')
  }

  // **下の安全域は取らない**（2026-09-03）。
  //
  // 装飾の列は `position: absolute` で `bottom: キーボードの高さ` に置く。
  // RN の絶対配置は**親の内側（padding の内）**を基準にするので、
  // 下に安全域を取ると、その分だけ列がキーボードより上に浮き、
  // 隙間から後ろが見える。根元（`app/_layout.jsx`）も取っていない。
  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      {/* 上の帯。**閉じると保存だけ。**
          書いている最中に押せるものを増やさない */}
      <View className="flex-row items-center justify-between px-4 py-2 border-b border-border">
        <Pressable
          onPress={close}
          accessibilityLabel="閉じる"
          className="min-h-touch px-2 justify-center active:opacity-70"
        >
          <Text className="text-body-md text-outline">✕</Text>
        </Pressable>
        <Pressable
          onPress={save}
          disabled={saving}
          className="bg-lantern-glow rounded-full px-5 min-h-touch justify-center items-center active:opacity-80 disabled:opacity-50"
        >
          <Text className="font-strong text-label-md text-on-lantern">
            {saving ? '保存中...' : '記録する'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerClassName="px-5 pt-4 w-full max-w-read self-center"
        // **測ったキーボードの高さを足す**（2026-09-03・作者から
        // 「良かったことなどがキーボードに完全に隠れます」）。
        //
        // `automaticallyAdjustKeyboardInsets` に任せていたが、
        // **この repo では当てにできない**（2026-08-17 に判明済み。
        // `lib/keyboard.js` はそのために在る）。効いていなかったので、
        // 主欄の下にある3行がキーボードの裏に入ったまま出せなかった。
        //
        // 列の高さも足す。2段になると 100px あり、足りないと
        // 3行がチップの裏に入る。
        //
        // キーボードが下りているときの 60 は、**下の安全域のぶん**。
        // `SafeAreaView` から `bottom` を外したので（上記）、
        // 取らないとホームバーの帯に最後の行が入る。
        contentContainerStyle={{
          paddingBottom:
            keyboardHeight > 0 ? keyboardHeight + TOOLBAR_MAX_HEIGHT + 24 : 60,
        }}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <RecordForm
          ref={formRef}
          targetDate={targetDate}
          question={question}
          hideSaveButton
          bodyRows={bodyRowsFor(Dimensions.get('window').height)}
        />
      </ScrollView>

      {/* 装飾の列。**この画面は根の列より上に出る**ので、ここにも置く */}
      <EditorToolbarBar />
    </SafeAreaView>
  )
}
