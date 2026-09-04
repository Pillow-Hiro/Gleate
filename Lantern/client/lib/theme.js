import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Platform, useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { colorScheme } from 'nativewind'

import {
  DEFAULT_MODE,
  nativewindScheme,
  normalizeMode,
  resolveIsDark,
  toggledMode,
} from './themeMode'
import { DEFAULT_ACCENT, normalizeAccent } from './accent'

// 外観。**3つから選ぶ**（2026-08-17 に2択から変更）。
//
//     端末に合わせる（既定） / ライト / ダーク
//
// それまでは入り切りの2択で、端末を夜モードにしていても
// Lantern だけ白いままだった。
//
// Web版 App.jsx はテーマを localStorage に持ち、html要素に .dark を付け外ししていた。
// RNでは NativeWind の colorScheme API に同じ役割を担わせる。
//
// 決め方そのものは `lib/themeMode.js`（`react-native` を読まない側。検査あり）。
const STORAGE_KEY = 'lantern-theme'
// 灯りの色。**外観とは別に覚える**（2026-09-04）。
// 明暗と色は別の選択で、片方を変えたらもう片方も戻る、では困る
const ACCENT_KEY = 'lantern-accent'

const ThemeContext = createContext({
  mode: DEFAULT_MODE,
  isDark: false,
  accent: DEFAULT_ACCENT,
  setMode: () => {},
  setAccent: () => {},
  toggleTheme: () => {},
})

export function useThemeContext() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(DEFAULT_MODE)
  // 灯りの色（`lib/accent.js`）。当てるのは根（`app/_layout.jsx`）
  const [accent, setAccentState] = useState(DEFAULT_ACCENT)
  // 端末の設定。`system` のときだけ見る。**変われば描き直される**ので、
  // アプリを開いたまま夜モードにしても付いていく
  const deviceScheme = useColorScheme()
  const isDark = resolveIsDark(mode, deviceScheme)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY)
        // 2026-08-17 より前は `light` / `dark` だけを入れていた。
        // **その2つはそのまま読める**ので、自分で選んだ人の設定は変わらない。
        // 何も入っていない人（一度も触っていない人）だけが `system` になる
        if (!cancelled) setModeState(normalizeMode(stored))
      } catch (e) {
        // 読めなければ既定（端末に合わせる）のままにする
        console.warn('[Theme] テーマ設定の読み込みに失敗', e)
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const stored = await AsyncStorage.getItem(ACCENT_KEY)
        // 知らない名前は既定へ落とす（`normalizeAccent`）。
        // preset を消したり名前を変えたりしても、画面が無色にならない
        if (!cancelled) setAccentState(normalizeAccent(stored))
      } catch (e) {
        console.warn('[Theme] 灯りの色の読み込みに失敗', e)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // NativeWind への反映は1か所にまとめる。**読み込み前でも動かす** —
  // 最初の一瞬だけ端末の設定に従い、読み終えたら選ばれた方へ寄る。
  // ここを待たせると、JS で塗る色（暗い）と `dark:` クラス（明るい）が
  // 食い違った画面が出る。
  useEffect(() => {
    colorScheme.set(nativewindScheme(mode, isDark, Platform.OS === 'web'))
  }, [mode, isDark])

  const setMode = useCallback((next) => {
    const safe = normalizeMode(next)
    setModeState(safe)
    AsyncStorage.setItem(STORAGE_KEY, safe).catch((e) => {
      console.warn('[Theme] テーマ設定の保存に失敗', e)
    })
  }, [])

  const setAccent = useCallback((next) => {
    const safe = normalizeAccent(next)
    setAccentState(safe)
    AsyncStorage.setItem(ACCENT_KEY, safe).catch((e) => {
      console.warn('[Theme] 灯りの色の保存に失敗', e)
    })
  }, [])

  // Web のサイドバーにある1押しの切り替え。**いま見えているものの逆へ**
  const toggleTheme = useCallback(() => {
    setMode(toggledMode(isDark))
  }, [isDark, setMode])

  const value = useMemo(
    () => ({ mode, isDark, accent, setMode, setAccent, toggleTheme }),
    [mode, isDark, accent, setMode, setAccent, toggleTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
