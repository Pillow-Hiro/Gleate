// 記録に添えるリンクを読み解く（2026-09-05・作者の指示）。
//
// はじめは音楽だけだった（Spotify / Apple Music）。作者から
// 「YouTube や他のリンクも添えられるよね？」——**できる。**
// 音楽に限る理由が無かったので広げ、名前も `musicLink` から改めた。
// **添えられるものが増えたのに「音楽」と呼び続けると、名前が嘘になる。**
//
// `react-native` を読み込まない。検査のために分けている
// （`lib/photoPath.js` と `lib/photoStore.js` の関係と同じ）。
//
// ## 貼るだけ。**取りに行かない**
//
// 題名を出すには、その場所に問い合わせる必要がある。**やらない。**
// このアプリは記録の中身を外へ出さない設計で、
// **「何を見て、何を聴いていたか」を外部へ知らせる通信を、黙って足さない。**
//
// 読めるのは URL に書いてあることだけ。Apple Music は道筋に題名が
// 入っているので出せる。Spotify と YouTube は id だけなので種類しか出ない。
// **足りないぶんは正直に「YouTubeの動画」と出す。**
// 押せば本物のアプリが開く——題名はそこで読める。
//
// ## 知らない場所も受ける
//
// 見分けられなければ**出どころ（ホスト名）だけ**を出す。
// 記事も、資料も、配信の予定表も添えられる。
// **知っている場所しか受けないと、書いている人の世界の方が狭くなる。**

const KIND_LABELS = {
  track: '曲',
  song: '曲',
  album: 'アルバム',
  playlist: 'プレイリスト',
  artist: 'アーティスト',
  episode: 'エピソード',
  show: '番組',
  'music-video': 'ミュージックビデオ',
  video: '動画',
  shorts: 'ショート',
  live: 'ライブ',
  channel: 'チャンネル',
}

const SERVICES = {
  spotify: 'Spotify',
  apple: 'Apple Music',
  youtube: 'YouTube',
  ytmusic: 'YouTube Music',
}

// 見た目を分けるための区分。音か、映像か、それ以外か
export const KINDS = { sound: 'sound', video: 'video', link: 'link' }

const FAMILY = {
  spotify: KINDS.sound,
  apple: KINDS.sound,
  ytmusic: KINDS.sound,
  youtube: KINDS.video,
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

function build(service, kind, title, url, host = '') {
  const serviceLabel = SERVICES[service] || host
  const kindLabel = KIND_LABELS[kind] || ''
  // 題名が読めればそれ。読めなければ「YouTubeの動画」のように出す。
  // どちらも無ければ出どころだけ（知らない場所）
  const label = title || (kindLabel ? `${serviceLabel}の${kindLabel}` : serviceLabel)
  return {
    url,
    service: service || 'other',
    serviceLabel,
    kind,
    family: FAMILY[service] || KINDS.link,
    title,
    label,
  }
}

function youtubeKind(head) {
  if (head === 'watch') return 'video'
  if (head === 'live' || head === 'shorts') return head
  if (head === 'channel' || head.startsWith('@')) return 'channel'
  return 'video'
}

/**
 * 読み解く。**URL でなければ null。**
 *
 * 戻すのは `{ url, service, serviceLabel, kind, family, title, label }`。
 * `label` は画面にそのまま出せる一行。
 */
export function parseAttachLink(input) {
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
  if (!/^https?:$/.test(url.protocol)) return null
  if (!url.hostname) return null

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

  if (host === 'music.youtube.com') {
    return build('ytmusic', parts[0] === 'playlist' ? 'playlist' : 'track', '', url.toString())
  }

  // `youtu.be/xxxx` は短い形。`/watch?v=` と同じ動画を指す
  if (host === 'youtu.be') {
    return build('youtube', 'video', '', url.toString())
  }

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    return build('youtube', youtubeKind(parts[0] || ''), '', url.toString())
  }

  // **知らない場所。** 出どころだけを出す
  return build('', '', '', url.toString(), host)
}

/** 同じものを二度足さないための鍵。`?si=` のような付き物は無視する */
export function linkKey(url) {
  try {
    const u = new URL(url)
    // YouTube は `?v=` が本体なので、そこだけは残す
    const v = u.searchParams.get('v')
    return `${u.hostname.replace(/^www\./, '')}${u.pathname}${v ? `?v=${v}` : ''}`
  } catch (e) {
    return String(url || '')
  }
}
