import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Sidebar from './components/Sidebar'
import HamburgerMenu from './components/HamburgerMenu'
import SplashScreen from './components/SplashScreen'
import Login from './pages/Login'
import Home from './pages/Home'
import Journal from './pages/Journal'
import Settings from './pages/Settings'
import Dashboard from './pages/Dashboard'
import Insights from './pages/Insights'

function Layout({ onSplashOpen, isDark, onToggleTheme }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar isDark={isDark} onToggleTheme={onToggleTheme} />
      <HamburgerMenu
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
      />

      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-30 bg-cream/95 backdrop-blur-sm border-b border-border h-12 flex items-center px-4 gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="text-ink-soft p-1 -ml-1"
            aria-label="メニューを開く"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" viewBox="0 0 18 18">
              <line x1="2" y1="4.5" x2="16" y2="4.5" />
              <line x1="2" y1="9" x2="16" y2="9" />
              <line x1="2" y1="13.5" x2="16" y2="13.5" />
            </svg>
          </button>
          <button
            onClick={onSplashOpen}
            className="font-display text-sm tracking-[0.2em] text-ink hover:text-ink-soft transition-colors"
          >
            Lantern
          </button>
        </header>

        <main className="flex-1 max-w-2xl mx-auto w-full px-5 py-8 md:py-12">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<Settings isDark={isDark} onToggleTheme={onToggleTheme} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [splashKey, setSplashKey] = useState(0)
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem('lantern-theme') === 'dark' } catch { return false }
  })
  // undefined = 確認中, null = 未ログイン, object = ログイン済み
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    // ダークモード初期適用
    document.documentElement.classList.toggle('dark', isDark)

    // 現在のセッションを取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // セッション変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  function openSplash() {
    setSplashKey(k => k + 1)
    setShowSplash(true)
  }

  function toggleTheme() {
    const next = !isDark
    setIsDark(next)
    try { localStorage.setItem('lantern-theme', next ? 'dark' : 'light') } catch { /* localStorage unavailable */ }
    document.documentElement.classList.toggle('dark', next)
  }

  // セッション確認中
  if (session === undefined) {
    return <div className="min-h-screen bg-cream" />
  }

  // 未ログイン
  if (session === null) {
    return <Login />
  }

  // ログイン済み
  return (
    <BrowserRouter>
      {showSplash && <SplashScreen key={splashKey} onClose={() => setShowSplash(false)} />}
      <Layout onSplashOpen={openSplash} isDark={isDark} onToggleTheme={toggleTheme} />
    </BrowserRouter>
  )
}
