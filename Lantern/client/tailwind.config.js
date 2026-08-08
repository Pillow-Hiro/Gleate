/** @type {import('tailwindcss').Config} */
// 色は global.css の CSS 変数で定義し、ライト/ダークを切り替える。
// トークン名と値は旧 frontend/src/index.css の @theme から引き継いだもの
// （2026-08-04 に frontend/ を廃止し、こちらが唯一の定義になった）。
const withAlpha = (name) => `rgb(var(${name}) / <alpha-value>)`

module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cream: withAlpha('--color-cream'),
        stone: withAlpha('--color-stone'),
        parchment: withAlpha('--color-parchment'),
        forest: withAlpha('--color-forest'),
        sage: {
          DEFAULT: withAlpha('--color-sage'),
          light: withAlpha('--color-sage-light'),
        },
        ink: {
          DEFAULT: withAlpha('--color-ink'),
          soft: withAlpha('--color-ink-soft'),
          faint: withAlpha('--color-ink-faint'),
        },
        amber: {
          DEFAULT: withAlpha('--color-amber'),
          light: withAlpha('--color-amber-light'),
        },
        accent: withAlpha('--color-accent'),
        lantern: withAlpha('--color-lantern'),
        primary: {
          DEFAULT: withAlpha('--color-primary'),
          hover: withAlpha('--color-primary-hover'),
          text: withAlpha('--color-primary-text'),
        },
        'background-info': withAlpha('--color-background-info'),
        'text-info': withAlpha('--color-text-info'),
        // border は透過率込みで定義するため <alpha-value> を使わない
        border: 'var(--color-border)',

        // カラーシステム v1.4 の名前。定義は CLAUDE.md「カラーシステム」。
        // 上の古い名前は同じ値を指している（global.css の説明を参照）。
        // **新しく書くコードはこちらを使う。**
        'bg-base': withAlpha('--color-cream'),
        'brand-green': withAlpha('--color-brand-green'),
        'ai-teal': withAlpha('--color-ai-teal'),
        'lantern-warm': withAlpha('--color-lantern-warm'),
        'text-primary': withAlpha('--color-text-primary'),
        'text-secondary': withAlpha('--color-text-secondary'),
        // Home だけの特例
        'home-bg': withAlpha('--color-home-bg'),
        'home-warm': withAlpha('--color-home-warm'),
      },
      fontFamily: {
        // 実体は client/lib/fonts.js が expo-font で読み込む。
        // 読み込みが終わるまでは端末の既定にフォールバックする。
        display: ['NotoSerifJP_600SemiBold', 'serif'],
        body: ['NotoSansJP_400Regular', 'sans-serif'],
        // 英数字が混ざる箇所（日付・バージョン等）
        mono: ['Inter_400Regular', 'sans-serif'],
      },
      fontSize: {
        // 文字サイズの基準（CLAUDE.md「文字サイズ基準」）。
        // 実機で「小さい」と指摘されたため、本文を 15px に上げた。
        // Tailwind 既定の text-sm(14) / text-xs(12) より1段大きい。
        //
        // **色と同じ名前を使わないこと。** Tailwind は色もサイズも
        // `text-` 接頭辞で出すため、`lantern` という名前を両方に置くと
        // `text-lantern` が1つのクラスで色とサイズの両方を指す。
        // 「今日の灯り」用のサイズは quote と呼ぶ。
        quote: ['18px', { lineHeight: '1.8' }],
        body: ['15px', { lineHeight: '1.7' }],
        aux: ['13px', { lineHeight: '1.6' }],
      },
    },
  },
  plugins: [],
}
