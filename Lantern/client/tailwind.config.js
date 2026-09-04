/** @type {import('tailwindcss').Config} */
// 色は global.css の CSS 変数で定義し、ライト/ダークを切り替える。
// トークンの由来は `DESIGN.md`（2026-08-09 に全面的に寄せた）。
const withAlpha = (name) => `rgb(var(${name}) / <alpha-value>)`

module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // DESIGN.md の名前。**新しく書くコードはこちらを使う。**
        surface: {
          DEFAULT: withAlpha('--color-surface'),
          lowest: withAlpha('--color-surface-container-lowest'),
          low: withAlpha('--color-surface-container-low'),
          mid: withAlpha('--color-surface-container'),
          high: withAlpha('--color-surface-container-high'),
          highest: withAlpha('--color-surface-container-highest'),
        },
        'on-surface': {
          DEFAULT: withAlpha('--color-on-surface'),
          variant: withAlpha('--color-on-surface-variant'),
        },
        outline: {
          DEFAULT: withAlpha('--color-outline'),
          variant: withAlpha('--color-outline-variant'),
        },
        'lantern-glow': withAlpha('--color-lantern-glow'),
        'on-lantern': withAlpha('--color-on-lantern'),
        'on-primary': withAlpha('--color-on-primary'),
        'primary-container': withAlpha('--color-primary-container'),
        'on-primary-container': withAlpha('--color-on-primary-container'),
        secondary: withAlpha('--color-secondary'),
        tertiary: {
          DEFAULT: withAlpha('--color-tertiary'),
          container: withAlpha('--color-tertiary-container'),
        },
        'on-tertiary': withAlpha('--color-on-tertiary'),
        // AI の声。青緑ではなく琥珀と同系の砂色（global.css の説明を参照）
        'ai-surface': withAlpha('--color-ai-surface'),
        'discovery-surface': withAlpha('--color-discovery-surface'),
        'discovery-ink': withAlpha('--color-discovery-ink'),
        'ai-ink': withAlpha('--color-ai-ink'),
        error: {
          DEFAULT: withAlpha('--color-error'),
          container: withAlpha('--color-error-container'),
        },

        // 旧名。値は上と同じものを指す（global.css の説明を参照）。
        // 340箇所を一度に書き換えないための橋渡し。
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
          // **淡い灯りの帯。**`amber-light` の新しい名前（2026-09-04）。
          // 灯りの色は選べるので（`lib/accent.js`）、`amber` と呼ぶと
          // 月や蛍を選んだ人の画面で**名前が嘘になる**
          soft: withAlpha('--color-amber-light'),
          hover: withAlpha('--color-primary-hover'),
          text: withAlpha('--color-primary-text'),
        },
        'text-primary': withAlpha('--color-text-primary'),
        'text-secondary': withAlpha('--color-text-secondary'),
        'background-info': withAlpha('--color-background-info'),
        'text-info': withAlpha('--color-text-info'),
        'home-bg': withAlpha('--color-home-bg'),
        'home-warm': withAlpha('--color-home-warm'),
        // border は透過率込みで定義するため <alpha-value> を使わない
        border: 'var(--color-border)',
      },
      fontFamily: {
        // 実体は client/lib/fonts.js が expo-font で読み込む。
        // **和文は Noto Sans JP。** DESIGN.md の Hanken Grotesk /
        // Source Sans 3 は和文の字を持たないため、そのままでは使えない。
        // 理由は fonts.js に書いた。
        display: ['NotoSansJP_700Bold', 'sans-serif'],
        body: ['NotoSansJP_400Regular', 'sans-serif'],
        strong: ['NotoSansJP_700Bold', 'sans-serif'],
        // 欧文だけの「Lantern」の綴りに使う
        latin: ['HankenGrotesk_700Bold', 'sans-serif'],
        // ラベル・数字
        label: ['Inter_500Medium', 'sans-serif'],
        'label-sm': ['Inter_600SemiBold', 'sans-serif'],
        mono: ['Inter_500Medium', 'sans-serif'],
      },
      fontSize: {
        // DESIGN.md の typography をそのまま持ってきたもの。
        //
        // **色とサイズに同じ名前を使わないこと。** Tailwind はどちらも
        // `text-` で出すため、`lantern` を両方に置くと1つのクラスが
        // 色とサイズの両方を指してしまう。
        display: ['40px', { lineHeight: '48px', letterSpacing: '-0.8px' }],
        'headline-lg': ['32px', { lineHeight: '40px', letterSpacing: '-0.32px' }],
        'headline-lg-mobile': ['28px', { lineHeight: '34px' }],
        'headline-md': ['24px', { lineHeight: '30px' }],
        // 記録の本文。**19px は「じっくり読むため」の大きさ**（DESIGN.md）
        'body-lg': ['19px', { lineHeight: '32px' }],
        'body-md': ['17px', { lineHeight: '26px' }],
        'label-md': ['14px', { lineHeight: '20px', letterSpacing: '0.14px' }],
        'label-sm': ['12px', { lineHeight: '16px', letterSpacing: '0.6px' }],

        // 旧名。値は上に合わせた。
        // quote=記録の本文 / body=通常本文 / aux=補助
        quote: ['19px', { lineHeight: '32px' }],
        body: ['17px', { lineHeight: '26px' }],
        aux: ['14px', { lineHeight: '20px', letterSpacing: '0.14px' }],
      },
      borderRadius: {
        // DESIGN.md の rounded。
        // 入力欄とボタンは 8px、面（カード）は 16px。
        DEFAULT: '0.5rem',
        sm: '0.25rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
      },
      spacing: {
        // 画面の左右。DESIGN.md は mobile 20px / desktop 40px
        margin: '20px',
        gutter: '16px',
        'stack-sm': '8px',
        'stack-md': '16px',
        'stack-lg': '32px',
        // 押せるものの最小寸法（HIG の 44pt）
        touch: '44px',
      },
      maxWidth: {
        // 本文の読みやすい幅。長すぎる行を作らない
        read: '680px',
      },
      boxShadow: {
        // 「Natural Bloom」。**ほとんど見えない濃さにする**
        bloom: '0 4px 12px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}
