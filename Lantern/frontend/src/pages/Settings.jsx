import { useState, useEffect } from 'react'
import { supabase, authFetch } from '../lib/supabase'

function localDateStr(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

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

export default function Settings({ isDark, onToggleTheme }) {
  const [logs, setLogs] = useState([])
  const [signingOut, setSigningOut] = useState(false)
  const [youtubeStatus, setYoutubeStatus] = useState({ connected: false, channel_name: null })
  const [youtubeConnecting, setYoutubeConnecting] = useState(false)

  useEffect(() => {
    authFetch('/api/logs')
      .then(r => r.json())
      .then(data => setLogs(data))
      .catch(() => {})

    authFetch('/api/youtube/status')
      .then(r => r.json())
      .then(data => setYoutubeStatus(data))
      .catch(() => {})
  }, [])

  async function handleYouTubeConnect() {
    setYoutubeConnecting(true)
    try {
      const res = await authFetch('/api/youtube/auth-url')
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setYoutubeConnecting(false)
    }
  }

  const streak = (() => {
    let count = 0
    const check = new Date()
    const logSet = new Set(logs.map(l => l.date))
    for (let i = 0; i < 365; i++) {
      const d = localDateStr(check)
      if (!logSet.has(d)) break
      count++
      check.setDate(check.getDate() - 1)
    }
    return count
  })()

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    // onAuthStateChange が session=null を検知して Login 画面に切り替わる
  }

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
        <SettingsRow label="テーマ" description="ボタンで手動切り替え">
          <button
            onClick={onToggleTheme}
            className="text-xs text-forest border border-sage/40 px-3 py-1.5 rounded-full hover:bg-sage-light transition-colors"
          >
            {isDark ? '☀️ ライトに切替' : '🌙 ダークに切替'}
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

      {/* 外部連携 */}
      <Section title="外部連携">
        {youtubeStatus.connected ? (
          <SettingsRow label="YouTube" description={youtubeStatus.channel_name || '連携済み'}>
            <button
              disabled
              className="text-xs text-ink-faint border border-border px-3.5 py-1.5 rounded-full opacity-40 cursor-not-allowed"
            >
              連携解除
            </button>
          </SettingsRow>
        ) : (
          <SettingsRow label="YouTube" description="チャンネルの活動記録と連携します">
            <button
              onClick={handleYouTubeConnect}
              disabled={youtubeConnecting}
              className="text-xs text-forest border border-sage/40 px-3.5 py-1.5 rounded-full hover:bg-sage-light transition-colors disabled:opacity-50"
            >
              {youtubeConnecting ? '移動中...' : 'YouTubeを連携する'}
            </button>
          </SettingsRow>
        )}
      </Section>

      {/* アカウント */}
      <Section title="アカウント">
        <SettingsRow label="ログアウト" description="このデバイスからサインアウトします">
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="text-xs text-red-500 border border-red-200 dark:border-red-900/40 px-3.5 py-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
          >
            {signingOut ? 'ログアウト中...' : 'ログアウト'}
          </button>
        </SettingsRow>
      </Section>

      {/* Lanternについて */}
      <Section title="Lanternについて">
        <SettingsRow label="バージョン">
          <span className="text-xs text-ink-faint">v0.5</span>
        </SettingsRow>
        <SettingsRow label="コンセプト" description="AI伴走者 — 評価しない、決めない、照らすだけ。">
          <span />
        </SettingsRow>
      </Section>
    </div>
  )
}
