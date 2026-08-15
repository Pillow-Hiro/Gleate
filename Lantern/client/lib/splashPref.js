import AsyncStorage from '@react-native-async-storage/async-storage'

// 起動画面を毎回出すかどうか。
//
// **本来は1日1回**（`app/_layout.jsx`）。世界観としては強いが、
// 1日に何度も開くと邪魔になる、という判断でそうしてある。
//
// **2026-08-15 に切り替えを足した。** 作者が
// 「正しく表示されているか確かめたいので毎回出したい」と決めた。
// 確かめるたびに日付を跨ぐのを待つわけにはいかない。
//
// **いまの既定は「毎回」。** 確認が済んだら切って（あるいは既定を戻して）よい。
const KEY = 'lantern.splash_always'

export const DEFAULT_ALWAYS = true

export async function loadAlways() {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (raw === null) return DEFAULT_ALWAYS
    return raw === 'true'
  } catch {
    return DEFAULT_ALWAYS
  }
}

export async function saveAlways(value) {
  try {
    await AsyncStorage.setItem(KEY, value ? 'true' : 'false')
  } catch (e) {
    console.warn('[Splash] 設定の保存に失敗', e)
  }
}
