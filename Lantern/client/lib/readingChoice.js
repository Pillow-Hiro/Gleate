// 選んだ見立て（2026-09-22・作者の判断「振り返りの見立てをユーザーに選択肢で選ばせる」）。
//
// ## なぜ選ばせるか
//
// `CLAUDE.md` の深掘りの例外は、見立てを**候補として出す。断定しない。
// 1つに決めない。選ぶのは書いた人**と決めている。画面をそのまま選べる形にする。
//
// 外れた見立てを1つだけ置くと、外れたときに「見当違い」になる。
// 候補から選べれば、合わない方は選ばれないだけで済む。
//
// ## 選んだあとは何も起きない
//
// 作者の判断で「選んだことを残すだけ」。選び直しても料金はかからないし、
// 読み直しもしない。**まず、選ぶこと自体が効くかを見る。**
//
// **ここは純粋な計算だけ**（`readingChoice.test.js`）。残す方は
// `readingChoiceStore.js`——`react-native` を読むものを混ぜると vitest が読めない。

/** 控えに選んだ番号を書き足す。**元の控えは書き換えない** */
export function withChoice(stored, index) {
  const first = stored?.patterns?.[0]
  if (!first?.deepen) return stored
  const patterns = [...stored.patterns]
  patterns[0] = { ...first, deepen: { ...first.deepen, chosen: index } }
  return { ...stored, patterns }
}
