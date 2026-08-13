import { View } from 'react-native'
import Text from './Text'
import { localDateStr } from '../lib/date'

// Web版 Home.jsx の「今週の発見」を移植したもの。AIは使わない。
// 観察文の生成規則・文言は変更していない。
function snip(text, max = 24) {
  return text.length > max ? text.slice(0, max) + '…' : text
}

export function buildObservations(logs) {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 6)
  const weekLogs = logs
    .filter((l) => l.date >= localDateStr(weekAgo))
    .sort((a, b) => b.date.localeCompare(a.date))

  if (weekLogs.length === 0) return null

  const observations = []

  const latestEnjoyable = weekLogs.find((l) => l.enjoyable)?.enjoyable
  if (latestEnjoyable) {
    observations.push(`「${snip(latestEnjoyable)}」が、今週の記録に残っています。その言葉は、どこから来ているのでしょう。`)
  }

  const latestNext = weekLogs.find((l) => l.next)?.next
  if (latestNext) {
    observations.push(`「${snip(latestNext)}」が、この週に記録されています。それを書いた時のことを、今はどう感じますか。`)
  }

  const latestStruggled = weekLogs.find((l) => l.struggled)?.struggled
  if (latestStruggled && !latestEnjoyable) {
    observations.push(`「${snip(latestStruggled)}」が、今週の記録に残っています。その言葉を、今のあなたはどう感じますか。`)
  }

  const eveningCount = weekLogs.filter((l) => {
    if (!l.saved_at) return false
    const h = new Date(l.saved_at).getHours()
    return h >= 20 || h < 5
  }).length
  if (eveningCount >= 2) {
    observations.push(`今週は夜に記録した日が${eveningCount}日ありました。あなたにとって、夜はどんな時間でしょう。`)
  }

  if (observations.length === 0) {
    const latestCreated = weekLogs[0]?.created
    observations.push(
      latestCreated
        ? `「${snip(latestCreated)}」が、この週に記録されています。この記録を、今のあなたはどう感じますか。`
        : '今週の記録が、ここに残っています。'
    )
  }

  return observations.slice(0, 2)
}

export default function WeeklyDiscovery({ logs }) {
  if (logs.length === 0) return null
  const observations = buildObservations(logs)

  return (
    <View>
      <Text className="font-strong text-label-md text-primary mb-2.5">今週の発見</Text>
      <View className="bg-ai-surface rounded-lg px-5 py-4">
        {observations === null ? (
          <Text className="text-body-md text-ai-ink">今週の記録がまだありません。</Text>
        ) : (
          <View className="gap-2">
            {observations.map((obs, i) => (
              <Text key={i} className="text-body-md text-ai-ink leading-relaxed">{obs}</Text>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}
