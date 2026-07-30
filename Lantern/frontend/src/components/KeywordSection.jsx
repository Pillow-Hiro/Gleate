import { useState } from 'react'
import { authFetch } from '../lib/supabase'
import { localDateStr } from '../lib/date'

// キャッシュキーに当日の日付を含めることで実質1日TTLとする。
// Insights AI憲法に従い、感情分類はせず語と出現回数のみを表示する。
const KEYWORD_PERIODS = [
  { label: '直近1ヶ月', period: '1m' },
  { label: '直近3ヶ月', period: '3m' },
  { label: '直近半年', period: '6m' },
]

export default function KeywordSection() {
  const today = localDateStr()
  const [data, setData] = useState({})
  const [fetching, setFetching] = useState({})

  async function handleFetch(period) {
    const cacheKey = `insights_keywords_${period}_${today}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try {
        setData(d => ({ ...d, [period]: JSON.parse(cached) }))
        return
      } catch (e) {
        // 壊れたキャッシュは捨てて取得し直す。残すと毎日同じ日付キーで失敗し続ける。
        console.warn('[Insights] キーワードキャッシュの解析に失敗', e)
        localStorage.removeItem(cacheKey)
      }
    }
    setFetching(f => ({ ...f, [period]: true }))
    try {
      const res = await authFetch(`/api/insights/keywords?period=${period}`)
      if (!res.ok) {
        console.warn(`[Insights] キーワード取得が ${res.status} を返した (period=${period})`)
        return
      }
      const json = await res.json()
      localStorage.setItem(cacheKey, JSON.stringify(json.keywords))
      setData(d => ({ ...d, [period]: json.keywords }))
    } catch (e) {
      // 画面には何も出さない（AI憲法：必要以上に話さない）。原因追跡のためログだけ残す。
      console.warn('[Insights] キーワード取得に失敗', e)
    }
    finally {
      setFetching(f => ({ ...f, [period]: false }))
    }
  }

  return (
    <section className="space-y-5">
      <p className="text-[10px] text-ink-faint tracking-[0.18em] uppercase">キーワード</p>
      {KEYWORD_PERIODS.map(({ label, period }) => (
        <div key={period} className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-ink-soft">{label}</p>
            <button
              onClick={() => handleFetch(period)}
              disabled={fetching[period]}
              className="text-xs text-forest border border-sage/40 px-3.5 py-1 rounded-full hover:bg-sage-light/60 transition-colors disabled:opacity-50"
            >
              {fetching[period] ? '取得中...' : data[period] ? '再取得' : 'Lanternに聞く'}
            </button>
          </div>
          {data[period] && (
            <div className="flex flex-wrap gap-2">
              {data[period].length === 0 ? (
                <p className="text-sm text-ink-faint">この期間のキーワードを抽出できませんでした。</p>
              ) : (
                data[period].map(({ word, count }) => (
                  <span key={word} className="inline-flex items-baseline gap-1.5 text-xs bg-stone/60 text-ink-soft px-3 py-1 rounded-full">
                    {word}
                    <span className="text-[10px] text-ink-faint">{count}</span>
                  </span>
                ))
              )}
            </div>
          )}
        </div>
      ))}
    </section>
  )
}
