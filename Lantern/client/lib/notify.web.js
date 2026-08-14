import { DEFAULT_NOTIFY_HOUR, DEFAULT_NOTIFY_MINUTE } from './notifyText'

// Web では通知を扱わない。
//
// ブラウザの通知はタブを閉じると届かず、許可の求め方も端末ごとに違う。
// **届いたり届かなかったりする通知は、無い方がよい。**
// 「静かなきっかけ」は、当てにできることが前提になっている。
//
// 写真（`photoStore.web.js`）と同じ形。分岐ではなくファイルを分けるのは、
// そうしないと expo-notifications が Web のバンドルに乗るため。
export const isSupported = false

export async function loadSetting() {
  return { enabled: false, hour: DEFAULT_NOTIFY_HOUR, minute: DEFAULT_NOTIFY_MINUTE }
}

export async function saveSetting() {}

export async function requestPermission() {
  return false
}

export async function hasPermission() {
  return false
}

export async function syncSchedule() {
  return 0
}

export async function cancelAll() {}
