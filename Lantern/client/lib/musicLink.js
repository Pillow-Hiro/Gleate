// 記録に添える音楽のリンクを読み解く（2026-09-05・作者の指示
// 「音楽も追加できるようにしたい。spotify、Apple music どっちも」）。
//
// `react-native` を読み込まない。検査のために分けている
// （`lib/photoPath.js` と `lib/photoStore.js` の関係と同じ）。
//
// ## 貼るだけ。**取りに行かない**
//
// 曲名を出すには、Spotify なら oEmbed に問い合わせる必要がある。
// **やらない。**このアプリは記録の中身を外へ出さない設計で、
// 「いま何を聴いていたか」を外部へ知らせる通信を、黙って足さない。
//
// 読めるのは URL に書いてあることだけ。Apple Music は道筋に
// 題名が入っているので出せる。Spotify は id だけなので種類しか出ない。
// **足りないぶんは正直に「Spotify のトラック」と出す。**
// 押せば本物のアプリが開く——題名はそこで読める。
//
// ## 何を受けるか
//
//   https://open.spotify.com/track/xxxx
//   https://open.spotify.com/intl-ja/album/xxxx
//   spotify:track:xxxx
//   https://music.apple.com/jp/album/album-name/123?i=456
//
// 共有シートから貼ると、後ろに `?si=...` や説明の文が付くことがある。
// **文の中から URL を拾う。**貼り方を人に合わせさせない。

const KIND_LABELS = {
  track: '曲',
  song: '曲',
  album: 'アルバム',
  playlist: 'プレイリスト',
  artist: 'アーティスト',
  episode: 'エピソード',
  show: '番組',
  'music-video': 'ミュージックビデオ',
}

const SERVICES = {
  spotify: 'Spotify',
  apple: 'Apple Music',
}

/** 貼られた文から最初の URL（か Spotify の URI）を拾う */
export function firstLink(input) {
  const text = String(input || '').trim()
  if (!text) return ''
  const m = text.match(/(https?:\/\/[^\s<>"']+|spotify:[a-z]+:[A-Za-z0-9]+)/)
  return m ? m[0] : ''
}

function titleFromSlug(slug) {
  const decoded = decodeURIComponent(slug || '').replace(/-/g, ' ').trim()
  // 数字だけの段は id なので題名にしない
  return /^[0-9]+$/.test(decoded) ? '' : decoded
}

/**
 * 読み解く。**分からなければ null。**
 *
 * 戻すのは `{ url, service, serviceLabel, kind, title, label }`。
 * `label` は画面にそのまま出せる一行。
 */
export function parseMusicLink(input) {
  const raw = firstLink(input)
  if (!raw) return null

  // `spotify:track:xxxx`。共有シートが URI を渡してくることがある
  const uri = raw.match(/^spotify:([a-z]+):([A-Za-z0-9]+)$/)
  if (uri) {
    const kind = uri[1]
    return build('spotify', kind, '', `https://open.spotify.com/${kind}/${uri[2]}`)
  }

  let url
  try {
    url = new URL(raw)
  } catch (e) {
    return null
  }

  const host = url.hostname.replace(/^www\./, '')
  // `intl-ja` のような言語の段は読み飛ばす
  const parts = url.pathname.split('/').filter((p) => p && !/^intl-[a-z-]+$/.test(p))

  if (host === 'open.spotify.com' || host === 'play.spotify.com') {
    return build('spotify', parts[0] || '', '', url.toString())
  }

  if (host === 'music.apple.com' || host === 'embed.music.apple.com') {
    // `/jp/album/album-name/123` … 先頭は国。種類、題名、id と続く
    const at = parts.findIndex((p) => KIND_LABELS[p])
    const kind = at >= 0 ? parts[at] : ''
    const title = at >= 0 ? titleFromSlug(parts[at + 1]) : ''
    return build('apple', kind, title, url.toString())
  }

  return null
}

function build(service, kind, title, url) {
  const serviceLabel = SERVICES[service]
  const kindLabel = KIND_LABELS[kind] || ''
  // 題名が読めればそれ。読めなければ「Spotify の曲」のように出す
  const label = title || `${serviceLabel}の${kindLabel || 'リンク'}`
  return { url, service, serviceLabel, kind, title, label }
}

/** 同じものを二度足さないための鍵。`?si=` のような付き物は無視する */
export function musicKey(url) {
  try {
    const u = new URL(url)
    return `${u.hostname.replace(/^www\./, '')}${u.pathname}`
  } catch (e) {
    return String(url || '')
  }
}
