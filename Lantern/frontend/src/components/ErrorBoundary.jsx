import { Component } from 'react'

// 描画中の例外で画面全体が白くなるのを防ぐ。
//
// 記録アプリで白画面が出ると「記録が消えた」と読めてしまう。
// 実際にはサーバーに残っているので、そのことを事実として伝える。
// 謝罪や励ましは置かない（AI憲法：評価しない・煽らない）。
//
// フックでは実装できないため、ここだけクラスコンポーネントを使う。
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // 握り潰さない。原因を追えるように残す
    console.error('[Lantern] 画面の描画に失敗', error, info?.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="max-w-sm text-center space-y-4">
          <p className="text-3xl opacity-40">◇</p>
          <p className="text-sm text-ink leading-relaxed">
            画面をうまく表示できませんでした。
          </p>
          <p className="text-xs text-ink-faint leading-relaxed">
            これまでの記録は残っています。
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-xs text-forest border border-sage/40 px-3.5 py-1.5 rounded-full hover:bg-sage-light transition-colors"
          >
            読み込み直す
          </button>
        </div>
      </div>
    )
  }
}
