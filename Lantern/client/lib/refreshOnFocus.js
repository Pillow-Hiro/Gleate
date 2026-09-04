import { useCallback, useRef, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { refreshLogs } from './logsCache'

// 画面に戻ってきたら取り直す。
//
// **2026-08-23 まで、どのタブも開いた1度きりしか取っていなかった。**
//
// expo-router のタブは裏で生きたままなので、載せたときの `useEffect` は
// 二度と走らない。「書く」で保存しても、記録・ホーム・分析は
// **古い一覧を映したままだった。**
//
// 作者からは「記録への反映が遅い。1分以上待っても反映されない」と
// 見えていたが、実際は遅いのではなく、**待っても永久に出ない**
// （アプリを開き直すまで）。速さの話ではなく、取り直していなかった。
//
// **最初の焦点では走らせない。** 載せた直後の取得と二重になる。
export function useRefreshOnFocus(refresh) {
  const first = useRef(true)
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false
        return
      }
      refresh()
    }, [refresh]),
  )
}

/**
 * 引き下げて取り直す（2026-09-04・作者の指示）。
 *
 * `ScrollView` の `refreshControl` に渡す2つを返す。
 * 記録を**全件**取り直してから、画面の取り直しを呼ぶ（問いや観察など、
 * 記録以外のものはそれぞれの画面が持っているため）。
 *
 * **失敗しても赤い字は出さない。** 引き直せばいいだけで、
 * 記録は端末の控えに残っている（`lib/logsCache.js`）。
 */
export function usePullToRefresh(after) {
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refreshLogs()
      if (after) after()
    } catch (e) {
      console.warn('[記録] 引き下げての取り直しに失敗', e)
    } finally {
      setRefreshing(false)
    }
  }, [after])

  return { refreshing, onRefresh }
}

