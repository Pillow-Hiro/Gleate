import AsyncStorage from '@react-native-async-storage/async-storage'
import { authFetch } from './supabase'
import { todayStr } from './date'
import { withChoice } from './readingChoice'

// 選んだ見立てを残す（2026-09-22）。**なぜ選ばせるかは `readingChoice.js`。**
//
// 残す先は `log_answers`（`modules/answers.py`・kind は `reading`）。
// **記録の項目には混ぜない**——困ったことに入れていた頃は、
// `modules/facts.py` がつまずきとして数えていた。
//
// `docs/sql/log_answers.sql` を流すまでサーバーは 503 を返す。
// **印だけは控えに残す**ので、画面の見た目は変わらない。

/** 選んだ見立てを残す。**失敗しても画面は止めない** */
export async function chooseReading({ storageKey, index, reading, observation }) {
  try {
    await authFetch('/api/answers', {
      method: 'POST',
      body: JSON.stringify({
        kind: 'reading',
        // 何についての見立てかが分かるように、観察も一緒に残す
        question: observation || '',
        answer: reading?.text || '',
        date: todayStr(),
      }),
    })
  } catch (e) {
    console.warn('[深掘り] 選んだ見立てを残せなかった', e)
  }

  // 控えにも印を残す。**閉じて開き直しても、選んだものが分かる**
  try {
    const raw = await AsyncStorage.getItem(storageKey)
    if (raw) await AsyncStorage.setItem(storageKey, JSON.stringify(withChoice(JSON.parse(raw), index)))
  } catch (e) {
    console.warn('[深掘り] 控えに選んだ印を残せなかった', e)
  }
}
