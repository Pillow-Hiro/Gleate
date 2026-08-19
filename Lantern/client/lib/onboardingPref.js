import AsyncStorage from '@react-native-async-storage/async-storage'

// 初回の案内を見たかどうか。
//
// **一度きり。** `lib/splashPref.js` と違って設定に切り替えを置かない。
// 毎回出す理由が無く、置くと「読む場所」が1行増える。
//
// **鍵に版を持たせている。** 案内の中身を大きく変えたときは
// `_v2` に上げれば、既に使っている人にももう一度出せる。
// 中身を差し替えたのに誰も見ない、という取りこぼしを防ぐ。
const KEY = 'lantern.onboarding_seen_v1'

export async function hasSeen() {
  try {
    return (await AsyncStorage.getItem(KEY)) === 'true'
  } catch (e) {
    // **読めなければ「見た」ことにする。** 逆にすると、
    // 保存が壊れている端末で開くたびに案内が出続ける
    console.warn('[Onboarding] 履歴の読み込みに失敗', e)
    return true
  }
}

export async function markSeen() {
  try {
    await AsyncStorage.setItem(KEY, 'true')
  } catch (e) {
    console.warn('[Onboarding] 履歴の保存に失敗', e)
  }
}

// 「もう一度見る」を押したことを、案内を出す側へ知らせる。
//
// **設定と `app/_layout.jsx` は親子ではない。** 設定はタブの中、
// 案内はその上に浮く別の層で、状態を直接渡す道が無い。
// `lib/splashHandoff.js` と同じ考え方で、間に小さな置き場を作る。
//
// Context にしないのは、**渡したいものが1回きりの合図**だからで、
// 値を持ち回る必要が無い。
const listeners = new Set()

export function onReset(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export async function clearSeen() {
  try {
    await AsyncStorage.removeItem(KEY)
  } catch (e) {
    console.warn('[Onboarding] 履歴の削除に失敗', e)
  }
  // **消せなくても知らせる。** その場で見たいという要求は満たせる
  // （次に開いたときにまた出るかどうかは別の話）
  listeners.forEach((fn) => {
    try { fn() } catch (e) { console.warn('[Onboarding] 通知に失敗', e) }
  })
}
