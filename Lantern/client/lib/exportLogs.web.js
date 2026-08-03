// Web版。Web版フロントエンド（frontend/src/pages/Settings.jsx）と同じ
// Blob + <a download> 方式。expo-file-system はWeb向けの解決に失敗するため使わない。
export async function exportLogs(logs) {
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `lantern-logs-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}
