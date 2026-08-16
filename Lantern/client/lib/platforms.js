// つないでいる場所の一覧。**1か所にまとめる。**
//
// ## なぜ要るのか
//
// YouTube と Twitch は、それぞれ 350行ほどのパネルを持っている
// （`components/YouTubePanel.jsx` / `TwitchPanel.jsx`）。
// 中身は連携・数字・グラフ・観察が縦に並んだもので、**作りはほぼ同じ**。
//
// 3つ目（X、Instagram、TikTok…）を足すとき、同じものをもう1枚
// 書き写すことになる。書き写した瞬間から、3枚が少しずつずれていく。
//
// **横断して見る画面**（`components/OverviewPanel.jsx`）は、この表だけを見る。
// 場所を1つ足すのは、**この配列に1つ足すこと**にしたい。
//
// ## ここに書かないもの
//
// - 画面の組み立て（`OverviewPanel.jsx` の仕事）
// - 連携・解除の手順（各パネルが持つ。場所ごとに違いすぎる）
// - AIの観察（有料。横断の画面には出さない）
//
// ここにあるのは**どこを叩くと何が返るか**だけ。だから検査できる。

/** 数字が無いときの見せ方。**0 とは書かない。** 0件と未取得は違う */
export const UNKNOWN = '—'

export const PLATFORMS = [
  {
    id: 'youtube',
    label: 'YouTube',
    // 連携しているかだけを見る軽い経路。横断の画面はまずこれを全部叩く
    statusPath: '/api/youtube/status',
    // 数字。連携していないと 404 を返す場所があるので、status の後で叩く
    summaryPath: '/api/youtube/channel',
    /** 表示名。status と summary のどちらから来ても拾えるようにする */
    nameOf: (d) => d?.channel_name || null,
    /** 並べる数字。**3つまで。** 横に並べたときに読めなくなる */
    statsOf: (d) => [
      { label: '登録者', value: d?.subscriber_count },
      { label: '総再生', value: d?.total_view_count },
      { label: '動画', value: d?.video_count },
    ],
  },
  {
    id: 'twitch',
    label: 'Twitch',
    statusPath: '/api/twitch/status',
    summaryPath: '/api/twitch/channel',
    nameOf: (d) => d?.display_name || null,
    // Twitch はフォロワーしか出せない。**空欄を作らない**ために1つだけ返す。
    // 無理に3つ揃えると「—」が2つ並び、取得に失敗したように見える
    statsOf: (d) => [{ label: 'フォロワー', value: d?.follower_count }],
  },
]

/** id から引く。知らない id は null */
export function platformById(id) {
  return PLATFORMS.find((p) => p.id === id) || null
}

/** 大きい数を読める形にする。**四捨五入しない**（1.9万を2万と書かない） */
export function formatCount(value) {
  if (value === null || value === undefined) return UNKNOWN
  const n = Number(value)
  if (!Number.isFinite(n)) return UNKNOWN
  if (n < 10000) return n.toLocaleString('ja-JP')
  // 万で切る。小数第1位までで、末尾の .0 は落とす
  const man = Math.floor(n / 1000) / 10
  return `${man % 1 === 0 ? man : man.toFixed(1)}万`
}

/** 横断の画面が1つの場所について持つ状態。**取得前と未連携を区別する** */
export function emptyState(platform) {
  return {
    id: platform.id,
    label: platform.label,
    loading: true,
    connected: false,
    name: null,
    stats: [],
    // 取得に失敗した。連携していないのとは別物なので分けて持つ
    failed: false,
  }
}
