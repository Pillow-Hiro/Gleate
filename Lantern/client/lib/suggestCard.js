// 「日記の候補」で選んだ一行を、カードの形に読み解く（2026-09-06）。
//
// ## なぜ読み解きが要るのか
//
// Swift は取れたものを**改行で繋いだ1本の文字列**にして渡してくる
// （`JournalingSuggestionsModule.swift` の `text(from:)`）。
// 中では種類ごとに分かれているのに、**渡す時点で潰している。**
//
// 作者から Apple の「ジャーナル」の画面をもらった。あちらは
// **曲は絵と題名のカード、問いは本文のプレースホルダ**と分けている。
// 同じようにするには、こちらも種類が要る。
//
// ## いまは形から推し量る
//
// 本当は Swift が種類を付けて渡すべきで、**それは次のビルドの仕事**
// （`HANDOFF.md`）。それまでは、こちらが決めた繋ぎ方から読み取る。
//
// **外から来た文字列を当てずっぽうで解いているのではない。**
// 「曲名 — アーティスト」の形はこちらの Swift が作っている。
// つまり読み解けるのは、**自分で決めた形だから。**
//
// それでも当てにしすぎない。**分からなければ「そのまま」出す**
// ——種類を間違えて言うより、何も言わないほうがいい。

// 種類。**Swift が付けて渡す**（2026-09-07 のビルドから）。
//
// それまでは形から推し量るしかなかった。曲・番組・場所が**どれも
// 同じ形で来る**（「A — B」）ので、**分けられなかった。**
// 音符を出しておいて場所だった、では嘘になるので出さなかった。
//
// いまは Swift が言ってくる（`JournalingSuggestionsModule.swift` の
// `items(from:)`）。**言えるようになったので言う。**
//
// **古いビルドと、古い覚えのために推し量る道も残す。**
// 種類の付かないものが来たら `item` に落とす——嘘を言わない側に倒す。
export const CARD = {
  ask: 'ask',
  song: 'song',
  podcast: 'podcast',
  media: 'media',
  place: 'place',
  mood: 'mood',
  item: 'item',
}

// Swift の言う名前を、こちらの名前に。**知らない名前は `item`**
const KINDS = {
  ask: CARD.ask,
  song: CARD.song,
  podcast: CARD.podcast,
  media: CARD.media,
  place: CARD.place,
  mood: CARD.mood,
}

// Swift の `join` が使う繋ぎ（曲名 — アーティスト）。
// **半角ハイフンではない。**変えるときは両方を一緒に変える
const JOIN = ' — '

// **逆斜線を直に書かない。**この形で3度踏んだ（2026-09-07）
const NEWLINE = String.fromCharCode(10)

/**
 * 一行をカード1枚に。`{ kind, title, sub }` を返す。
 *
 * 繋ぎがあれば「題名 / 添え字」に割る。無ければ題名だけ。
 */
export function readCard(line) {
  const text = String(line == null ? '' : line).trim()
  if (!text) return null

  // Apple の振り返りは問いかけの文。**終わりの記号だけで見る。**
  // 字数で決めようとして一度外した——**閾値はこちらの都合でしかない**
  const asking = /[?？]$/.test(text)

  const at = text.indexOf(JOIN)
  if (at === -1) return { kind: asking ? CARD.ask : CARD.item, title: text, sub: '' }

  const title = text.slice(0, at).trim()
  const sub = text.slice(at + JOIN.length).trim()
  if (!title) return { kind: CARD.item, title: sub, sub: '' }
  return { kind: CARD.item, title, sub }
}

/**
 * 溜めてある文字列を、カードの並びにする。
 *
 * 1件が複数行のことがある（問い・曲・場所が改行で繋がって来る）。
 * **行ごとに1枚。**まとめて1枚にすると、外すときに全部消える。
 */
export function readCards(items) {
  const out = []
  for (const item of items || []) {
    if (!item) continue
    const text = typeof item === 'string' ? item : item.text
    const kind = typeof item === 'string' ? '' : item.kind
    const sub = typeof item === 'string' ? '' : item.sub

    // **Swift が種類を付けてくれたなら、推し量らない**
    if (kind && KINDS[kind]) {
      const title = String(text || '').trim()
      if (title) {
        out.push({
          kind: KINDS[kind],
          title,
          sub: String(sub || '').trim(),
          source: text,
          line: title,
        })
      }
      continue
    }

    // 古いビルド・古い覚え。**形から推し量る**
    for (const line of String(text || '').split(NEWLINE)) {
      const card = readCard(line)
      // **元の一行を覚えておく。**外すときはこれで消す
      if (card) out.push({ ...card, source: text, line: line.trim() })
    }
  }
  return out
}
