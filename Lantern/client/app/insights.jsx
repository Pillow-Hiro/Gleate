import { Redirect } from 'expo-router'

// Insights は 2026-07-30 に Journal の振り返りタブへ統合した。
// 旧URLをブックマークしている場合に備えて残している。
// 旧 Web の App.jsx にあった <Route path="/insights" element={<Navigate to="/journal" replace />} /> の移植。
export default function InsightsRedirect() {
  return <Redirect href="/journal" />
}
