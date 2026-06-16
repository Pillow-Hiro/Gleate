import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import Sidebar from './components/Sidebar'
import HamburgerMenu from './components/HamburgerMenu'
import SplashScreen from './components/SplashScreen'
import Home from './pages/Home'
import Journal from './pages/Journal'
import Insights from './pages/Insights'
import Settings from './pages/Settings'

function Layout({ onSplashOpen }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar onLogoClick={onSplashOpen} />
      <HamburgerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} onLogoClick={onSplashOpen} />

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
            <Route path="/settings" element={<Settings />} />
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

  function openSplash() {
    setSplashKey(k => k + 1)
    setShowSplash(true)
  }

  return (
    <BrowserRouter>
      {showSplash && <SplashScreen key={splashKey} onClose={() => setShowSplash(false)} />}
      <Layout onSplashOpen={openSplash} />
    </BrowserRouter>
  )
}
