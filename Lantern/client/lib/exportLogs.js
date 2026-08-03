import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'

// ネイティブ版。一時ファイルに書き出して共有シートに渡す。
// Web版は exportLogs.web.js（Metroがプラットフォームで自動選択する）。
export async function exportLogs(logs) {
  const filename = `lantern-logs-${new Date().toISOString().slice(0, 10)}.json`
  const uri = `${FileSystem.cacheDirectory}${filename}`
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(logs, null, 2))

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('sharing unavailable')
  }
  await Sharing.shareAsync(uri, { mimeType: 'application/json', UTI: 'public.json' })
}
