// 無料お試しの一文。**`react-native` を読み込まない**（検査のため）。
//
// Apple は「何の期間でいくらか」を購入画面に求める（審査 3.1.2）。
// **無料お試しを付けたなら、その長さも画面に出す。**
// 値段だけ出して試用期間を隠すと、買う前に条件が分からない。
//
// ストアが返す `introPrice` から組む。**自分で日数を決めない**
// （App Store Connect 側を変えたとき、画面だけ古い数字が残る）。

const UNITS = { DAY: '日間', WEEK: '週間', MONTH: 'か月', YEAR: '年' }

/**
 * 無料お試しの一文。付いていなければ空文字。
 *
 * 値引き（有料の導入価格）は**お試しではない**ので出さない。
 * 出すと「無料」と誤って伝わる。
 */
export function trialLabel(intro) {
  if (!intro) return ''
  if (Number(intro.price) !== 0) return ''
  const n = Number(intro.periodNumberOfUnits)
  const unit = UNITS[String(intro.periodUnit || '').toUpperCase()]
  if (!n || !unit) return ''
  return `最初の${n}${unit}は無料`
}
