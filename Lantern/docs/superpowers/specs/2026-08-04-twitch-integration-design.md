# Twitch 連携

作成日: 2026-08-04
対象: `main.py` / `modules/` / `client/app/(tabs)/dashboard.jsx`

---

## 目的

YouTube と同じ。**「外の世界に届いた形跡」を記録と並べる。**

Journal の記録が「内側から見た自分」なら、Dashboard は「外の世界に届いた形跡」。
どちらもユーザーが自分で意味を見つけるための材料であり、
AI は①記録を並べる ②差分を提示する までしか行わない。
数字を根拠に評価・判定・助言はしない。

## スコープ

**含む**: Twitch の認可、過去配信の取得と保存、フォロワー数、
Dashboard のタブ切り替え（YouTube / Twitch）。

**含まない**: 配信の予約・通知、チャットログ、クリップの詳細分析、
リアルタイムの「配信中」表示。

---

## 中核：消えるものを残す

**Twitch の過去配信（VOD）は一定期間で削除される。** YouTube の動画が永続するのと違う。

そのため API から取得した時点で Supabase に保存し、
**VOD が消えても Lantern には残る**ようにする。

これは単なる回避策ではない。
「あなたの活動の形跡が、プラットフォームの都合で消える。
でも Lantern には残っている」という状態は、
記録アプリとしての Lantern の前提と噛み合っている。

### 取得タイミング

**Dashboard を開いたときに取得して upsert する。** 追加のインフラは持たない。

Lantern は毎日開かれる前提のアプリで、North Star Metric も
「活動を継続できた日数」である。VOD の保持期間のあいだに
普通に使っていれば取り逃さない。

Render の無料枠はスリープするため cron は外部スケジューラが必要になる。
個人利用のために常時稼働の仕組みを足すのは釣り合わない。

### 取り逃しは責めない

長く開かなければ、その間の配信は残らない。これは受け入れる。

**取り逃した事実を画面に出さない。**
「〇件取得できませんでした」「前回から〇日空いています」等は表示しない。
離脱期間を評価しないという原則（CLAUDE.md「習慣化」の定義）に従う。

---

## 認可

`modules/youtube.py` の構造をなぞる。state に `platform` を埋めて
web / native の戻り先を分ける仕組みもそのまま使う。

| | |
|---|---|
| 認可 | `https://id.twitch.tv/oauth2/authorize` |
| トークン | `https://id.twitch.tv/oauth2/token` |
| client_secret | **必須**。サーバー側で保持する |
| リフレッシュ | アクセストークンに期限あり。リフレッシュトークンで更新 |
| スコープ | `moderator:read:followers` |

**PKCE は使わない。** 公式ドキュメントに Authorization Code Grant での
記載が見つからなかったため、client_secret 方式で実装する。
YouTube 側の PKCE 実装はそのまま残す。

### 環境変数

```
TWITCH_CLIENT_ID
TWITCH_CLIENT_SECRET
TWITCH_REDIRECT_URI   # 未設定時は http://localhost:5000/api/twitch/callback
```

`YOUTUBE_REDIRECT_URI` と同じく、既定値が実在する Flask ルートと
一致することをテストで固定する（`tests/test_youtube_redirect.py` と同じ形）。

---

## データモデル

```sql
create table public.twitch_tokens (
  user_id        uuid        primary key,
  access_token   text        not null,
  refresh_token  text,
  token_expiry   timestamptz,
  broadcaster_id text,
  display_name   text,
  updated_at     timestamptz not null default now()
);
alter table public.twitch_tokens enable row level security;

create table public.twitch_streams (
  user_id          uuid        not null,
  video_id         text        not null,
  title            text,
  started_at       timestamptz,
  duration_seconds int,
  view_count       int,
  url              text,
  fetched_at       timestamptz not null default now(),
  primary key (user_id, video_id)
);
create index twitch_streams_user_started_idx
  on public.twitch_streams (user_id, started_at desc);
alter table public.twitch_streams enable row level security;
```

`started_at` が記録との照合の鍵になる。
配信は開始時刻と長さを持つため、YouTube の「投稿日」より
Journal の記録と時間軸で噛み合う。

### サムネイルを保存しない

Twitch のサムネイルURLは VOD と一緒に死ぬ。
URLだけ保存しても壊れたリンクが残る。
画像そのものを持つとストレージ費用の話になり、
写真記録で 1MB まで詰めた判断と釣り合わない。

### view_count は取得時点の値

保存後は更新されない。VOD が消えれば増えようがない。
**「取得した時点の数字」であることを画面で断らない**
（注釈を足すと数字への注意を強めるため）。

---

## API

| メソッド | パス | 役割 |
|---|---|---|
| GET | `/api/twitch/auth-url` | 認可URLを返す。`platform=app` でネイティブの戻り先 |
| GET | `/api/twitch/callback` | 認可コードを受ける。**公開ルート**（stateで本人性を確認） |
| GET | `/api/twitch/status` | 連携状態と表示名 |
| GET | `/api/twitch/streams` | 保存済みの配信を返す。**同時に Twitch から取得して upsert する** |
| GET | `/api/twitch/channel` | フォロワー数など |
| DELETE | `/api/twitch/disconnect` | 連携解除。トークンを削除する |

`/api/twitch/callback` 以外はすべて `@require_auth`。
`tests/test_route_auth.py` の許可リストに `twitch_callback` を追加する
（理由も併記する。YouTube と同じ扱い）。

### 保存済みの配信は消さない

`disconnect` はトークンだけ削除し、`twitch_streams` は残す。
連携を解除しても記録は残る。これは意図した挙動で、
「Lantern には残っている」という設計の核心にあたる。

---

## 画面

Dashboard 直下にタブを置く。

```
YouTube | Twitch
```

Journal の記録／振り返りタブと同じ指定（`border-b-2` + `text-accent`）を使い、
アプリ内で操作感を揃える。新しいパターンは持ち込まない。

**現在の Dashboard の中身は変更せず、そのまま YouTube タブへ入れる。**
移行のついでに手を入れると、動いているものを壊すリスクが増える。

**タブの状態は保持しない。** 画面を離れたら YouTube から始まる。
永続化は保存先が増えるうえ、この画面で覚える価値が薄い。

**未連携でもタブは出す。** 中身が「Twitchと繋ぐと、配信の記録がここに並びます。」
という誘いになる。タブを隠すと機能の存在に気づけない。

---

## AI の扱い

`generate_channel_insight` / `generate_video_insight` と同じ制約をかける。
プロンプトに以下を明記する。CLAUDE.md の Dashboard 節にも追記する。

> 視聴数・フォロワー数で配信の価値を評価しない。事実として伝えることはよい。

配信の**時間帯や長さ**は観察の材料になる。
「夜に配信した日が多い」は事実の提示であり、
「もっと長く配信すべき」は助言なので禁止。

---

## 未確認事項

**VOD の保持期間の具体的な日数**は確認できていない。
公式ヘルプページがエラーで読めなかった。実装中に確認する。
設計はこの日数に依存しない（保持期間が何日であれ、
開いたときに取得して保存する構造は変わらない）ため、
確認できなくても実装は進められる。

**Analytics API は CSV のダウンロードURLを返す方式**で、
YouTube Analytics と同じ粒度の指標は出せない。
視聴数は VOD の `view_count` に留まる。推移グラフは作らない。

---

## 想定リスク

| リスク | 備え |
|---|---|
| Twitch アプリの登録が要る | ユーザー操作。Client ID / Secret を `.env` と Render に設定 |
| リダイレクトURIの不一致 | YouTube で同じ失敗をしている。既定値をテストで固定する |
| 取得前に VOD が消える | 設計上避けられない。責めない文言にする |
| 数字が増えて評価に寄る | フォロワー数は表示するが増減に感想を添えない |
| Dashboard が長くなる | タブで分ける。YouTube 側は現状維持 |

## 撤退条件

保存（B案）がうまくいかない場合、A案（保存せず映すだけ）に落とす。
`twitch_streams` への書き込みをやめ、API の応答を直接返すだけでよい。
捨てるのはテーブル1つで、認可も画面もそのまま使える。

---

## 理念チェック（CLAUDE.md 作業前チェックリスト 3）

- **数字で評価しない**: フォロワー数と視聴数を表示するが、増減に感想を添えない。
  プロンプトにも明記する
- **離脱期間に言及しない**: 取り逃した配信の件数や、前回取得からの日数を出さない
- **記録そのものを尊重する**: 連携を解除しても保存済みの配信は消さない
- **主体性を尊重する**: 配信頻度や時間帯について助言しない。観察に留める

### 残る論点

フォロワー数は最も外部評価に近い指標である。
CLAUDE.md の Dashboard 節にも未確定の論点として同じ懸念が記されている。
表示する判断をしたが、UIの比重（数字を上に置くか、配信の一覧を上に置くか）は
今後の検証対象とする。**配信の一覧を主、数字を従とする配置から始める。**
