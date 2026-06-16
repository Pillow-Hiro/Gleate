import { useState, useEffect } from 'react'

const MONTHS_EN = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

const FALLBACKS = [
  '小さな一歩が、大きな旅になる。',
  '続けることに、やがて意味が宿る。',
  '昨日より少しでも前へ、それで十分。',
  '迷いながら進む人が、一番遠くへ行く。',
  '今日も記録することが、すでに答えだ。',
]

function localDateStr(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function SplashScreen({ onClose }) {
  const now = new Date()
  const dateLabel = `${now.getDate()} ${MONTHS_EN[now.getMonth()]}`

  const [quote, setQuote] = useState(() => FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)])
  const [bgStyle, setBgStyle] = useState({
    background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 55%, #0f3460 100%)',
  })
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // アニメーション開始（50ms遅延でCSS transitionを確実に発火）
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    fetch('/api/splash/content')
      .then(r => r.json())
      .then(data => {
        if (data.quote) setQuote(data.quote)

        const url = data.photo_url || `https://picsum.photos/seed/${localDateStr()}/800/1400`
        const img = new Image()
        img.onload = () => setBgStyle({ backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' })
        img.onerror = () => {
          const fallback = `https://picsum.photos/seed/${localDateStr()}/800/1400`
          const fi = new Image()
          fi.onload = () => setBgStyle({ backgroundImage: `url(${fallback})`, backgroundSize: 'cover', backgroundPosition: 'center' })
          fi.src = fallback
        }
        img.src = url
      })
      .catch(() => {})
  }, [])

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center cursor-pointer select-none"
      style={{ ...bgStyle, zIndex: 9999 }}
      onClick={onClose}
    >
      {/* グラデーションオーバーレイ */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.62) 100%)' }}
      />

      {/* コンテンツ */}
      <div className="relative z-10 text-center px-10 max-w-sm w-full">
        {/* 日付 */}
        <p
          className="text-white/80 tracking-[0.35em] uppercase mb-5 text-xs transition-all duration-700"
          style={{ opacity: visible ? 1 : 0, transitionDelay: '100ms' }}
        >
          {dateLabel}
        </p>

        {/* ロゴ */}
        <h1
          className="font-display text-3xl font-light text-white tracking-[0.28em] mb-7 transition-all duration-700"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            transitionDelay: '250ms',
          }}
        >
          Lantern
        </h1>

        {/* 一言 */}
        <p
          className="text-white/88 text-sm font-light leading-[1.9] tracking-wide transition-all duration-700"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(10px)',
            transitionDelay: '500ms',
          }}
        >
          {quote}
        </p>
      </div>

      {/* タップヒント */}
      <p
        className="absolute bottom-14 left-0 right-0 text-center text-xs text-white/38 tracking-[0.15em] transition-opacity duration-500"
        style={{ opacity: visible ? 1 : 0, transitionDelay: '900ms' }}
      >
        タップして続ける
      </p>
    </div>
  )
}
