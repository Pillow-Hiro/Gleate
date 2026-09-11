import { useEffect, useState } from 'react'
import GlassPressable from './GlassPressable'
import { ActivityIndicator, Pressable, View } from 'react-native'
import Text from './Text'
import { isAvailable, loadOfferings, purchase, restore } from '../lib/purchases'
import { trialLabel } from '../lib/trialText'

// 断られたときに出す面。
//
// ## Apple が画面に求めるもの
//
// 審査ガイドライン 3.1.2(c) が**購入する前に**求めているのは、
// 何がいくらで手に入るかをはっきり示すこと。
//
// 1. 何が含まれるか
// 2. 期間（1か月／1年）
// 3. 価格（**ストアが返した文字列をそのまま**。自分で組み立てない）
// 4. 自動更新であること・解約しなければ更新されること
// 5. 購入を復元する導線
//
// **規約とプライバシーへのリンクは、この画面では求められていない。**
// 2026-08-24 まで「5. 利用規約とプライバシーポリシーへの導線／
// 抜けると差し戻される」と書いてあったが、原文を当たると 3.1.2 に
// その定めは無い。求めているのは 5.1.1(i) の方で、
// **アプリ内のどこかで容易に開けること**。設定の「Gleateについて」に
// 3つとも置いてある（`lib/openLegal.js`）。
//
// ## 煽らない
//
// 「今だけ」「お得」の類は書かない。`tests/test_ui_words.py` が
// 画面の文言を見張っている。**断る場所がいちばん煽りたくなる場所**なので、
// ここは特に気をつける。
//
// ## 鍵が無いとき
//
// `EXPO_PUBLIC_REVENUECAT_IOS_KEY` が未設定なら、購入は出さずに
// 「準備中」とだけ書く。**押せるのに必ず失敗するボタンを出さない。**

const PERIOD_LABEL = {
  MONTHLY: '1か月',
  ANNUAL: '1年',
  TWO_MONTH: '2か月',
  THREE_MONTH: '3か月',
  SIX_MONTH: '6か月',
  WEEKLY: '1週間',
  LIFETIME: '買い切り',
}

function periodOf(pkg) {
  return PERIOD_LABEL[pkg.period] || pkg.period || ''
}

// `title` は設定から開くときのためにある。既定は断られた場面の見出し。
// 設定には断られて来るのではなく**自分から見に来る**ので、
// 「記録を並べ直す」（＝その機能の名前）だと話が繋がらない。
export default function Paywall({ title = '記録を並べ直す', message, onClose, onPurchased }) {
  const [packages, setPackages] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const list = await loadOfferings()
      if (!cancelled) setPackages(list)
    })()
    return () => { cancelled = true }
  }, [])

  async function handleBuy(pkg) {
    setBusy(true)
    setNotice('')
    const r = await purchase(pkg)
    setBusy(false)
    // **やめたのは失敗ではない。** 何も出さずに戻る
    if (r.cancelled) return
    if (r.ok) {
      onPurchased?.()
      return
    }
    setNotice('購入を完了できませんでした。')
  }

  async function handleRestore() {
    setBusy(true)
    setNotice('')
    const r = await restore()
    setBusy(false)
    // **`ok` ではなく `active` を見る**（`lib/purchases.js` の `restore`）。
    // 復元するものが無くても処理そのものは通る
    if (r.ok && r.active) {
      onPurchased?.()
      setNotice('購入を復元しました。')
      return
    }
    setNotice('復元できる購入は見つかりませんでした。')
  }

  return (
    <View className="bg-surface-lowest rounded-lg px-5 py-5 shadow-bloom gap-4">
      {/* **詰めた**（2026-08-20）。作者から「大きくて見にくい」。
          Apple 3.1.2 が求める6つ（名前・期間・価格・自動更新の説明・
          規約とポリシーへの導線・復元）は落とさず、行数だけ減らす。

          - 含まれるもの4行 → 1行（中黒で並べる）
          - 無料の範囲の一文を短く
          - 自動更新の説明を2文に
          - 余白を py-6/gap-5 → py-5/gap-4 */}
      <View className="gap-1.5">
        <Text className="font-strong text-body-lg text-on-surface">
          {title}
        </Text>
        <Text className="text-body-md text-on-surface-variant leading-relaxed">
          {message}
        </Text>
      </View>

      {/* 何が含まれるか。**無料側も書く。**
          何を失うのかではなく、どちらに何があるのかを見せる。

          **2026-08-23 に短くした。** それまでは
          「有料では、同じ輪を月と年の幅で回せます」のように、
          Gleate の考え方から説き起こしていた。作者から
          「わかりにくい。もっと単純な文でいい」と指摘があった。

          断られた人がこの画面で知りたいのは1つだけで、
          **何が無料で何が有料か。**思想は読みたいときに読むもので、
          断られた瞬間に読ませるものではない。

          並べるだけにして、見出しを付けた。文を減らすほど、
          どちらに何があるかが目で追える。 */}
      <View className="gap-3">
        <View className="gap-1">
          <Text className="font-strong text-label-md text-on-surface">無料で使えるもの</Text>
          <Text className="text-body-md text-on-surface-variant leading-relaxed">
            記録・写真・検索・書き出し・今日の灯り・今週の発見
          </Text>
        </View>
        <View className="gap-1">
          <Text className="font-strong text-label-md text-on-surface">有料で開くもの</Text>
          <Text className="text-body-md text-on-surface-variant leading-relaxed">
            月ごとの振り返り・過去との対話・頻出キーワード・
            YouTube と Twitch の読み解き
          </Text>
        </View>
      </View>

      {/* 期間と価格。**ストアが返した文字列をそのまま出す。**
          自分で組み立てない（通貨記号・桁区切り・税の扱いが国ごとに違う） */}
      {!isAvailable() || (packages !== null && packages.length === 0) ? (
        <Text className="text-body-md text-on-surface-variant">
          いまは購入の準備中です。
        </Text>
      ) : packages === null ? (
        <ActivityIndicator />
      ) : (
        <View className="gap-2">
          {packages.map((pkg) => (
            <GlassPressable
              key={pkg.id}
              onPress={() => handleBuy(pkg)}
              disabled={busy}
              className="rounded-full py-3.5 px-6 items-center active:opacity-80"
            >
              <Text className="font-strong text-body-md text-on-lantern">
                {periodOf(pkg)}　{pkg.price}
              </Text>
              {/* **無料お試しは値段と一緒に出す。**
                  値段だけ見せて試用期間を隠すと、買う前に条件が分からない
                  （Apple の審査 3.1.2）。長さはストアが返した値から組む */}
              {trialLabel(pkg.intro) ? (
                <Text className="text-label-sm text-on-lantern">{trialLabel(pkg.intro)}</Text>
              ) : null}
            </GlassPressable>
          ))}
        </View>
      )}

      {notice ? (
        <Text className="text-label-md text-on-surface-variant">{notice}</Text>
      ) : null}

      {/* 自動更新の説明。**審査で最初に見られる。** 短くしても
          「解約しない限り更新される」「どこに請求される」「どこで解約する」
          の3つは残す */}
      <Text className="text-label-sm text-outline leading-relaxed">
        解約しない限り自動更新され、App Store アカウントに請求されます。
        解約は「設定 › Apple ID › サブスクリプション」から。
      </Text>

      {/* 復元。**これは残す。**機種変更・再インストールで買い直させない。

          規約・プライバシー・特商法へのリンクは 2026-08-24 に外した。
          **どれも設定の「Gleateについて」にある。**
          同じ行き先を2か所に置くと、片方だけ直す日が来る。 */}
      <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
        <Pressable onPress={handleRestore} disabled={busy} className="py-1">
          <Text className="text-label-md text-secondary">購入を復元</Text>
        </Pressable>
      </View>

      {onClose ? (
        <Pressable onPress={onClose} className="min-h-touch justify-center items-center">
          <Text className="text-label-md text-outline">閉じる</Text>
        </Pressable>
      ) : null}
    </View>
  )
}
