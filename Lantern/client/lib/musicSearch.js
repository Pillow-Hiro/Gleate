// Apple Music で曲を探す（2026-09-05・作者の指示「Apple music は9月の
// ビルドに組み込もう」）。**言葉を組み立てる所と、読み解く所だけ。**
// 通信そのものは呼ぶ側（`components/AttachRow.jsx`）が持つ。
// `react-native` を読み込まないのは検査のため（`lib/attachLink.js` と同じ）。
//
// ## ここは「黙って足さない」の例外ではない
//
// `lib/attachLink.js` にこう書いてある——**「何を見て、何を聴いていたか」を
// 外部へ知らせる通信を、黙って足さない。**貼られたリンクの題名を
// 取りに行かないのはそのため。
//
// 探すのは、その禁を破っていない。**線引きは「黙って」の側にある。**
// 送るのは本人が探すために打った言葉で、記録の中身ではない。
// State of Mind のときと同じ形で、**主体が誰かを見ている**
// （`CLAUDE.md`「気分について」）。
//
// だから守ることが3つある。
//
// 1. **記録の中身から自動で探さない。** 書いたものを種にしない
// 2. **打つたびに送らない。**押して初めて出る（`AttachRow`）。
//    その場で探しに行くと、消した言葉まで Apple に届く
// 3. **サーバーは残さない**（`modules/applemusic.py`）
//
// ## なぜサーバーを通すのか
//
// MusicKit は開発者トークンを要る。端末に配ると、こちらの開発者名義で
// 叩ける状態になる。**出さずに済むなら出さない**ので、サーバーが
// 代わりに叩く（`GET /api/apple-music/search`）。

// Apple に渡す前に整える。**長すぎるものは切る**——曲名として
// 打たれたとは考えにくく、記録の一節を貼り付けた可能性のほうが高い。
// 切っても探せる。切らずに送ると、送らないと決めたものが混ざる
import { KINDS } from './attachLink'

const MAX_TERM = 80

/** 探す言葉を整える。空白を潰し、長すぎるものは切る */
export function normalizeTerm(input) {
  return String(input == null ? '' : input)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TERM)
}

/** 探しに行く道。**言葉は URL に載るので必ず包む** */
export function searchPath(term) {
  const q = normalizeTerm(term)
  if (!q) return ''
  return `/api/apple-music/search?q=${encodeURIComponent(q)}`
}

/**
 * 返ってきたものを、並べられる形にする。
 *
 * **URL の無いものは捨てる。**添えるのはリンクなので、
 * 押せないものを並べても選べない。
 *
 * 取れなければ空。**探せないことでアプリを止めない。**
 */
export function parseSongs(body) {
  const songs = body && Array.isArray(body.songs) ? body.songs : []
  const out = []
  const seen = new Set()
  for (const s of songs) {
    const url = String((s && s.url) || '').trim()
    if (!url || seen.has(url)) continue
    seen.add(url)
    out.push({
      url,
      title: String((s && s.title) || '').trim(),
      artist: String((s && s.artist) || '').trim(),
    })
  }
  return out
}

/**
 * 選んだ曲を、一覧に出す一行にする。「曲名 — アーティスト」。
 *
 * ## 題名を捨てない（2026-09-05）
 *
 * 添えたあと、一覧の字は URL の道筋から作られる（`lib/attachLink.js`）。
 * Apple の道筋は**小文字に潰され、記号が落ちている**ので、
 * `Creep` を選んだのに `creep` が残る。**押した字と違うものが残る。**
 *
 * ここで渡せば、選んだときに見えていた字がそのまま残る。
 * **これは「取りに行かない」を破っていない**——題名を問い合わせて
 * 得たのではなく、**本人が探して、見て、選んだもの**だから。
 *
 * 繋ぎ方は Swift 側に合わせた（`JournalingSuggestionsModule.swift` の
 * `join`）。**同じものは同じ形で出す。**
 */
export function songLabel(song) {
  const title = String((song && song.title) || '').trim()
  const artist = String((song && song.artist) || '').trim()
  if (title && artist) return `${title} — ${artist}`
  return title || artist
}

/**
 * 前に添えた音のものから、新しい順に拾う（2026-09-06）。
 *
 * ## 「最近聴いた曲」ではない
 *
 * 作者の求めは**最近聴いていた曲。**それには Apple Music の
 * 利用者トークンが要り、ネイティブの MusicKit と本人の許可と、
 * 新しいビルドが要る。**そして聴取の履歴がこちらを通ることになる。**
 *
 * ここで出すのは**前にこの人が添えたもの。**端末の中にしかなく、
 * 外に何も聞きに行かない。打たずに選べる、という用は足りる。
 * **名前で嘘をつかない**——画面にも「前に添えた曲」と出す。
 *
 * ## 新しい順の精度について
 *
 * 添えた時刻を持っていない（`lib/linkStore.js` は URL と字だけ）。
 * **記録ごとの並びを後ろから見る**ので、だいたい新しい順にしかならない。
 * 持っていない精度を、持っているふりで出さない。
 */
/*
 * `skip` は**伏せたものを外す口**（2026-09-11）。渡さなければ今までどおり。
 * 外したぶんは次のものが繰り上がるので、**一覧が歯抜けにならない。**
 */
export function recentFrom(groups, limit = 4, skip) {
  const out = []
  const seen = new Set()
  const all = Array.isArray(groups) ? groups : []
  for (let i = all.length - 1; i >= 0; i -= 1) {
    const items = Array.isArray(all[i]) ? all[i] : []
    for (let j = items.length - 1; j >= 0; j -= 1) {
      const item = items[j]
      if (!item || item.family !== KINDS.sound) continue
      const url = String(item.url || '').trim()
      if (!url || seen.has(url)) continue
      seen.add(url)
      if (typeof skip === 'function' && skip(url)) continue
      out.push({ url, label: String(item.label || '').trim() })
      if (out.length >= limit) return out
    }
  }
  return out
}
