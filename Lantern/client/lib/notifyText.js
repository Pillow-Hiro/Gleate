// 通知に載せる言葉。
//
// **催促にしない。** CLAUDE.md「習慣化の定義」が、通知は
// 「催促」ではなく「静かなきっかけ」だと定めている。
//
// 禁じられているのは、
// - 「継続しましょう」「また始めましょう」
// - 「3日間記録がありません」「〇日ぶりですね」（離脱期間への言及）
// - 連続日数を煽ること
//
// だからこの文面は**日数も件数も持たない。** 記録の中身も見ない。
// どの日に出しても同じ意味になる言葉だけを置く。
// 通知は本文が数語しか読まれないので、問いの資産（modules/questions/）は
// 使わない。あれは書く画面で読まれることを前提にした長さ。
//
// 1行目は CLAUDE.md が良い例として挙げている文そのもの。
const LINES = [
  'そろそろ、今日という日を残してみませんか。',
  '今日のことを、少しだけ書き留めておけます。',
  '書くことがなくても、開くだけで構いません。',
  'その日の言葉は、その日のうちにしか残せません。',
]

// 日ごとに順に選ぶ。**ランダムにしない。**
// 同じ日に何度組み立てても同じ文になる方が、
// 予約を作り直したときに通知の文面がちらつかない。
export function notifyBody(dayIndex) {
  const i = Math.abs(Math.trunc(dayIndex)) % LINES.length
  return LINES[i]
}

export function allNotifyBodies() {
  return [...LINES]
}

// 選べる時刻。**分は選ばせない。**
// 21:37 に意味は無く、決めることを増やすだけになる。
export const NOTIFY_HOURS = [8, 12, 18, 21, 23]

export const DEFAULT_NOTIFY_HOUR = 21

export function hourLabel(hour) {
  return `${String(hour).padStart(2, '0')}:00`
}

// 何日先まで予約を作るか。
//
// **毎日くり返す予約にしない。** くり返しにすると「今日はもう書いた」日を
// 飛ばせない。書いた日に「残してみませんか」が届くのは、
// 見ていないのと同じことになる。
// 1回きりの予約を数日ぶん並べ、アプリを開くたびに作り直す。
export const SCHEDULE_DAYS = 7

// いつ通知するかを組み立てる。**純粋な計算にする**（端末の API を触らない）。
//
// - 今日ぶんは、まだ時刻が来ていない かつ 今日の記録がない ときだけ入れる
// - 明日以降は、記録があるかどうかを知りようがないので必ず入れる
export function plannedTimes({ now, hour, recordedToday, days = SCHEDULE_DAYS }) {
  const out = []
  for (let d = 0; d < days; d += 1) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, hour, 0, 0, 0)
    if (d === 0 && (recordedToday || at <= now)) continue
    out.push(at)
  }
  return out
}
