import { useCallback, useRef } from 'react'
import { useFocusEffect } from 'expo-router'

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
