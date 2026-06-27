import { NavLink } from 'react-router-dom'
import { useEffect } from 'react'

const navItems = [
  {
    to: '/',
    label: '今日',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 15 15">
        <circle cx="7.5" cy="7.5" r="2.5" />
        <line x1="7.5" y1="1" x2="7.5" y2="2.5" />
        <line x1="7.5" y1="12.5" x2="7.5" y2="14" />
        <line x1="1" y1="7.5" x2="2.5" y2="7.5" />
        <line x1="12.5" y1="7.5" x2="14" y2="7.5" />
      </svg>
    ),
  },
  {
    to: '/journal',
    label: '記録',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 15 15">
        <rect x="2" y="1.5" width="11" height="12" rx="1.5" />
        <line x1="5" y1="5" x2="10" y2="5" />
        <line x1="5" y1="7.5" x2="10" y2="7.5" />
        <line x1="5" y1="10" x2="8" y2="10" />
      </svg>
    ),
  },
  {
    to: '/insights',
    label: '振り返り',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 15 15">
        <path d="M13 11A6 6 0 1 0 7 1c1.7 0 3.3.7 4.4 1.8L9.5 4.5" />
        <polyline points="11.5 1.5 13.5 5 10 5" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: '設定',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 15 15">
        <circle cx="7.5" cy="7.5" r="1.75" />
        <path d="M7.5 1.5v1.25M7.5 12.25v1.25M1.5 7.5h1.25M12.25 7.5h1.25M3.4 3.4l.88.88M10.72 10.72l.88.88M3.4 11.6l.88-.88M10.72 4.28l.88-.88" />
      </svg>
    ),
  },
]

function ThemeIcon({ isDark }) {
  if (isDark) {
    return (
      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" viewBox="0 0 14 14">
        <circle cx="7" cy="7" r="2.5" />
        <line x1="7" y1="1" x2="7" y2="2.5" />
        <line x1="7" y1="11.5" x2="7" y2="13" />
        <line x1="1" y1="7" x2="2.5" y2="7" />
        <line x1="11.5" y1="7" x2="13" y2="7" />
        <line x1="2.93" y1="2.93" x2="4.05" y2="4.05" />
        <line x1="9.95" y1="9.95" x2="11.07" y2="11.07" />
        <line x1="2.93" y1="11.07" x2="4.05" y2="9.95" />
        <line x1="9.95" y1="4.05" x2="11.07" y2="2.93" />
      </svg>
    )
  }
  return (
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" viewBox="0 0 14 14">
      <path d="M12 9.5A5.5 5.5 0 1 1 4.5 2a4 4 0 0 0 7.5 7.5z" />
    </svg>
  )
}

export default function HamburgerMenu({ open, onClose, isDark, onToggleTheme }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Overlay */}
      <div
        className={`md:hidden fixed inset-0 bg-black/40 z-40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`md:hidden fixed left-0 top-0 h-full w-64 bg-cream border-r border-border z-50 flex flex-col transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-5 border-b border-border flex items-center justify-between">
          <span className="font-display text-sm tracking-[0.22em] text-ink">
            Lantern
          </span>
          <button
            onClick={onClose}
            className="text-ink-faint hover:text-ink transition-colors p-1"
            aria-label="閉じる"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" viewBox="0 0 16 16">
              <line x1="3" y1="3" x2="13" y2="13" />
              <line x1="13" y1="3" x2="3" y2="13" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded text-sm transition-colors duration-100 ${
                  isActive
                    ? 'bg-sage-light text-forest font-medium'
                    : 'text-ink-soft hover:bg-stone hover:text-ink'
                }`
              }
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 pb-6 pt-3 border-t border-border flex items-center justify-between">
          <p className="text-[10px] text-ink-faint tracking-wider">Lantern v0.2</p>
          <button
            onClick={onToggleTheme}
            className="text-ink-faint hover:text-ink transition-colors p-1 rounded"
            aria-label={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
          >
            <ThemeIcon isDark={isDark} />
          </button>
        </div>
      </div>
    </>
  )
}
