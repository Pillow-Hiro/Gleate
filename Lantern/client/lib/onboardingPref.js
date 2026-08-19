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
