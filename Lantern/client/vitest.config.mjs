import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // lib/ の純粋関数だけを対象にする。
    // app/ と components/ は React Native のコンポーネントで、
    // vitest では解決できない（テストするなら jest-expo が要る）。
    // dist/ のビルド成果物を拾わないよう include を明示している。
    include: ['lib/**/*.test.js'],
  },
})
