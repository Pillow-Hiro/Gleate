import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import { notifyBody, plannedTimes, DEFAULT_NOTIFY_HOUR } from './notifyText'

// 静かなきっかけ（2026-08-13）。
//
// **端末の中だけで完結する。** サーバーからは何も送らない。
// プッシュトークンも取らない。予約は端末が持ち、アプリを開いたときに
// 作り直す。**誰がいつ開いたかがサーバーに残らない。**
//
// 文面と時刻の組み立ては `notifyText.js`（純粋な計算・vitest で検査）。
// ここは端末の API を触る部分だけを持つ。
//
// Web は `notify.web.js` が「使えない」を返す。
// ブラウザの通知は許可の求め方も持続の仕方も別物なので、分けている。
const KEY = 'lantern.notify'
const CHANNEL = 'lantern-daily'

export const isSupported = true

// { enabled: boolean, hour: number }
export async function loadSetting() {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (!raw) return { enabled: false, hour: DEFAULT_NOTIFY_HOUR }
    const v = JSON.parse(raw)
    return {
      enabled: Boolean(v?.enabled),
      hour: Number.isInteger(v?.hour) ? v.hour : DEFAULT_NOTIFY_HOUR,
    }
  } catch {
    // 読めなければ「切」。**勝手に鳴らさない**
    return { enabled: false, hour: DEFAULT_NOTIFY_HOUR }
  }
}

export async function saveSetting(setting) {
  await AsyncStorage.setItem(KEY, JSON.stringify(setting))
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: '静かなきっかけ',
    importance: Notifications.AndroidImportance.DEFAULT,
    // **振動させない。** 割り込みの強さを上げると催促になる
    vibrationPattern: null,
    sound: null,
  })
}

// 許可を求める。**設定を「入」にしようとしたときにだけ呼ぶ。**
// 起動直後に求めると、何のための通知か分からないまま拒否される。
export async function requestPermission() {
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  if (!current.canAskAgain) return false
  const asked = await Notifications.requestPermissionsAsync()
  return Boolean(asked.granted)
}

export async function hasPermission() {
  const current = await Notifications.getPermissionsAsync()
  return Boolean(current.granted)
}

// 予約を作り直す。**必ず全部消してから並べ直す。**
// 積み増すと、時刻を変えたときに古い予約が残って二重に鳴る。
//
// `recordedToday` は呼び出し側が渡す。ここでは記録を取りに行かない。
// 通知のために記録を読みに行くと、通信の失敗が通知の有無を左右する。
export async function syncSchedule({ enabled, hour }, recordedToday) {
  await Notifications.cancelAllScheduledNotificationsAsync()
  if (!enabled) return 0
  if (!(await hasPermission())) return 0

  await ensureChannel()

  const now = new Date()
  const times = plannedTimes({ now, hour, recordedToday })
  for (let i = 0; i < times.length; i += 1) {
    const at = times[i]
    await Notifications.scheduleNotificationAsync({
      content: {
        // 題を置かない。iOS はアプリ名を出すので、
        // 「Lantern」を足すと同じ語が2回並ぶ
        body: notifyBody(Math.floor(at.getTime() / 86400000)),
        sound: null,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: at,
        channelId: CHANNEL,
      },
    })
  }
  return times.length
}

export async function cancelAll() {
  await Notifications.cancelAllScheduledNotificationsAsync()
}
