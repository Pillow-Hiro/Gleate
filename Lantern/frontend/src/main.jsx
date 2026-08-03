import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// テーマ初期化（レンダリング前に適用してフラッシュを防ぐ・手動設定のみ）
try {
  if (localStorage.getItem('lantern-theme') === 'dark') {
    document.documentElement.classList.add('dark')
  }
} catch { /* localStorage unavailable */ }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
