import { Redirect } from 'expo-router'

// 旧URL（`/insights`）の受け皿。
//
// 2026-07-30 に Journal の振り返りタブへ統合し、
// 2026-08-12 に「ダッシュボード」タブへ移した。
// **行き先を付け替えること。** 統合先が変わるたびにここも変わる。
export default function InsightsRedirect() {
  return <Redirect href="/dashboard" />
}
