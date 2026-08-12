// 1年分の記録の有無を、週×曜日の格子に組み直す。
//
// **2状態しか持たない。** 記録あり / なし。
// 濃淡で「たくさん書いた日」を強調しない。
// CLAUDE.md「記録が多い＝良い、という価値観を作らない」に従う。
// 密度の階調を入れた瞬間、薄い日が「足りない日」に見える。
//
// 描画から切り離してあるのは、ここだけ vitest で検査できるため。

const DAY_MS = 86400000

function toKey(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function parse(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * 週の配列を返す。各週は日曜から土曜までの7セル。
 *
 * 最後の週に今日が入る。**先頭は52週前の日曜**なので、
 * 常に同じ形（53週×7日）になり、月によって列がずれない。
 *
 * @param {string[]} dates `YYYY-MM-DD` の配列（順不同・重複可）
 * @param {string} today 基準日
 * @param {number} weeks 何週分か
 */
export function buildYearGrid(dates, today, weeks = 53) {
  const has = new Set(dates)
  const end = parse(today)
  // 今日を含む週の土曜まで進める
  const lastSaturday = new Date(end.getTime() + (6 - end.getDay()) * DAY_MS)
  const firstSunday = new Date(lastSaturday.getTime() - (weeks * 7 - 1) * DAY_MS)

  const out = []
  for (let w = 0; w < weeks; w += 1) {
    const week = []
    for (let d = 0; d < 7; d += 1) {
      const day = new Date(firstSunday.getTime() + (w * 7 + d) * DAY_MS)
      const key = toKey(day)
      week.push({
        date: key,
        hasLog: has.has(key),
        // 今日より後ろは、まだ来ていないので何も置かない
        isFuture: key > today,
      })
    }
    out.push(week)
  }
  return out
}

/**
 * 格子の各列がどの月に属するかのラベル。
 *
 * **月が変わる列にだけ名前を置く。** 全部に置くと目盛りが密になり、
 * 格子そのものより目立つ。
 */
export function monthTicks(grid) {
  const ticks = []
  let last = null
  grid.forEach((week, i) => {
    const first = week.find((c) => !c.isFuture) || week[0]
    const month = first.date.slice(0, 7)
    if (month !== last) {
      ticks.push({ index: i, label: `${Number(month.slice(5))}月` })
      last = month
    }
  })
  return ticks
}
