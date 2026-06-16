import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

function SettingsRow({ label, description, children }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border last:border-b-0">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm text-ink">{label}</p>
        {description && <p className="text-xs text-ink-faint mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="space-y-0">
      <h2 className="text-[10px] text-ink-faint tracking-[0.18em] uppercase mb-2">{title}</h2>
      <div className="bg-stone/50 rounded-xl px-4">{children}</div>
    </section>
  )
}

export default function Settings() {
  const [logs, setLogs] = useState([])
  const [theme, setTheme] = useState(() => localStorage.getItem('lantern-theme') || 'light')

  useEffect(() => {
    fetch(`${API_BASE}/api/logs`)
      .then(r => r.json())
      .then(data => setLogs(data))
      .catch(() => {})
  }, [])

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('lantern-theme', next)
  }

  const streak = (() => {
    let count = 0
    const check = new Date()
    const logSet = new Set(logs.map(l => l.date))
    for (let i = 0; i < 365; i++) {
      const d = check.toISOString().slice(0, 10)
      if (!logSet.has(d)) break
      count++
      check.setDate(check.getDate() - 1)
    }
    return count
  })()

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div>
        <p className="text-[10px] text-ink-faint tracking-[0.18em] uppercase mb-0.5">Settings</p>
        <h1 className="font-display text-xl font-light text-ink">設定</h1>
      </div>

      {/* アクティビティ */}
      <Section title="アクティビティ">
        <SettingsRow label="記録した日数" description="これまでの合計">
          <span className="text-sm font-medium text-forest">{logs.length}日</span>
        </SettingsRow>
        <SettingsRow label="現在の連続日数" description="今日まで続けた日数">
          <span className="text-sm font-medium text-forest">{streak}日</span>
        </SettingsRow>
      </Section>

      {/* 表示 */}
      <Section title="表示">
        <SettingsRow label="テーマ" description="ライト / ダーク（準備中）">
          <button
            onClick={toggleTheme}
            className="text-xs text-ink-soft border border-border px-3 py-1.5 rounded-full hover:border-sage/50 transition-colors"
          >
            {theme === 'light' ? 'ライト' : 'ダーク'}
          </button>
        </SettingsRow>
      </Section>

      {/* データ */}
      <Section title="データ">
        <SettingsRow label="データのエクスポート" description="JSON形式でダウンロード">
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' })
              const a = document.createElement('a')
              a.href = URL.createObjectURL(blob)
              a.download = `lantern-logs-${new Date().toISOString().slice(0, 10)}.json`
              a.click()
            }}
            className="text-xs text-forest border border-sage/40 px-3.5 py-1.5 rounded-full hover:bg-sage-light transition-colors"
          >
            エクスポート
          </button>
        </SettingsRow>
      </Section>

      {/* Lanternについて */}
      <Section title="Lanternについて">
        <SettingsRow label="バージョン">
          <span className="text-xs text-ink-faint">v0.2</span>
        </SettingsRow>
        <SettingsRow label="コンセプト" description="AI伴走者 — 評価しない、決めない、照らすだけ。">
          <span />
        </SettingsRow>
      </Section>
    </div>
  )
}
