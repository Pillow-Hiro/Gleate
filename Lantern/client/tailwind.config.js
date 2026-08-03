/** @type {import('tailwindcss').Config} */
// 色は global.css の CSS 変数で定義し、ライト/ダークを切り替える。
// frontend/src/index.css の @theme と同じトークン名・同じ値を維持しているため、
// Web版の className をそのまま移植できる。
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
      },
      fontFamily: {
        // TODO(A5): expo-font で Noto Serif JP / Noto Sans JP を読み込む。
        // 現時点は端末の既定フォントにフォールバックする。
        display: ['NotoSerifJP', 'serif'],
        body: ['NotoSansJP', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
