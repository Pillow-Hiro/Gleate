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
// **2026-08-18 に2本直した。**
//
// 1本目は「そろそろ、今日という日を残してみませんか。」だった。
// CLAUDE.md が良い例として挙げている文そのものだが、
// **「そろそろ」は遅れているという判定を含む。**
// この文面は記録の中身を見ない設計（上を参照）なので、
// 判定できる立場にない。昼に書いた人にも同じ言葉が届く。
//
// もう1本は「その日の言葉は、その日のうちにしか残せません。」
// **これは事実として誤っていた。** `app/(tabs)/index.jsx` は
// `dateParam <= todayStr()` で過去日を受け、記録が無い日でも
// 新しく書ける。加えて「今日を逃すと失われる」は焦らせる型で、
// 「離れても戻ってきやすくする」という習慣化の定義と逆を向く。
// 代わりを立てず、3本に減らした。**言えないことは言わない。**
const LINES = [
  '今日という日を、残しておけます。',
  '今日のことを、少しだけ書き留めておけます。',
  '書くことがなくても、開くだけで構いません。',
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

// 時刻は**ダイヤルで決める**（`components/TimeDial.jsx`）。
//
// 2026-08-14 に二度変えている。
// 5つの決め打ち → 24時間の格子 → hh:mm のダイヤル。
// どちらの中間も「用意された選択肢から選ぶ」形で、
// **自分の時間をそのまま指定できなかった。**
//
// **分は1分刻み**（2026-08-15）。5分刻みから変えた。
export const DEFAULT_NOTIFY_HOUR = 21
export const DEFAULT_NOTIFY_MINUTE = 0

export function timeLabel(hour, minute = 0) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
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
export function plannedTimes({ now, hour, minute = 0, recordedToday, days = SCHEDULE_DAYS }) {
  const out = []
  for (let d = 0; d < days; d += 1) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, hour, minute, 0, 0)
    if (d === 0 && (recordedToday || at <= now)) continue
    out.push(at)
  }
  return out
}
