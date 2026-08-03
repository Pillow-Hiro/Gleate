import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { colorScheme } from 'nativewind'

const STORAGE_KEY = 'lantern-theme'

const ThemeContext = createContext({ isDark: false, toggleTheme: () => {} })

export function useThemeContext() {
  return useContext(ThemeContext)
}

// Web版 App.jsx はテーマを localStorage に持ち、html要素に .dark を付け外ししていた。
// RNでは NativeWind の colorScheme API に同じ役割を担わせる。
export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY)
        const dark = stored === 'dark'
        if (!cancelled) {
          setIsDark(dark)
          colorScheme.set(dark ? 'dark' : 'light')
        }
      } catch (e) {
        // 読めなければライトのままにする
        console.warn('[Theme] テーマ設定の読み込みに失敗', e)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev
      colorScheme.set(next ? 'dark' : 'light')
      AsyncStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light').catch(() => {})
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
