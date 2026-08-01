# 写真記録（マルチモーダル v1.3）

作成日: 2026-08-01
対象: Web（`frontend/`）と mobile（`mobile/`）の両方
前身: `DESIGN_multimodal_v1.3.md`（2026-07-26）— 本specが置き換える

---

## 目的

**記録のハードルを下げる。**
文章を書く気力がない日でも、写真1枚なら残せる状態を作る。

CLAUDE.md の判断基準「入力負荷を最小化しているか — 1分以内に記録できるか」に直結する。
アーカイブが目的ではないため、**画質より軽さを優先**する。

## スコープ

**含む**: 写真1枚／記録。Web・mobile 両方。

**含まない**（別サイクル）:

- 動画・作品PDF・音楽リンク
- Insights（過去との対話・キーワード）との連携
- AIへの画像入力
- 複数枚の添付

---

## 前身の設計書から変えた点

`DESIGN_multimodal_v1.3.md` は 2026-07-26 時点の構造を前提にしており、以下がずれていた。

| 前身の記述 | 現状と本specの判断 |
|---|---|
| 影響範囲は `frontend/` のみ | mobile が存在する。片方だけに入れると実装差が再発するため**両方に入れる** |
| `goals` テーブルが現行スキーマにある | 存在しない。関連ルートは 2026-07-28 に削除済み |
| 記録フォームは Journal.jsx の textarea 4つ | Journal.jsx は分割済み。記録フォームは**4箇所**ある |
| `log_attachments` 別テーブル | 1枚に限定したため**過剰**。`logs` のカラム2つに変更（後述） |
| 写真10MB × 5枚/日 | 年18GBで無料枠を即超過する。これが保留の理由だった。**圧縮前提に変更** |

---

## 決定事項

| 論点 | 決定 | 理由 |
|---|---|---|
| 目的 | 記録のハードルを下げる | アーカイブではないため強く圧縮できる |
| 写真のみで保存 | **可能にする** | 目的に直結。テキスト必須のままでは意味がない |
| AIに画像を渡すか | **渡さない** | AI憲法「ユーザー自身の言葉を大切にする」「勝手に解釈しない」に忠実 |
| 追加できる場所 | Web・mobile の**4箇所すべて** | 実装差を作らない |
| 枚数 | **1枚のみ** | 「どれを選ぶか」で手が止まると目的と逆行する |
| ストレージ | クライアント圧縮 + Supabase Storage | 無料枠に収まり、既存のRLSがそのまま使える |
| データモデル | `logs` にカラム追加 + 写真は専用API | `/save` 経由の上書き事故を構造的に防ぐ |

---

## 容量の見積もり

長辺1600px・JPEG q0.8 で1枚あたり約250KB、サムネイル約30KB。合計280KB/記録。

| 記録頻度 | 年間 | 無料枠1GBの持ち |
|---|---|---|
| 毎日 | 約102MB | 約10年 |
| 週5日 | 約73MB | 約14年 |

前身の設計（10MB × 5枚/日 = 年18GB）とは2桁違う。**圧縮が保留解除の鍵**である。

帯域は無料枠2GB/月。個人利用かつサムネイル主体の表示なら十分収まる。

---

## データモデル

### logs テーブルへのカラム追加

```sql
ALTER TABLE logs ADD COLUMN photo_path       TEXT;
ALTER TABLE logs ADD COLUMN photo_thumb_path TEXT;
```

**保存するのはStorage上のパスのみ。URLは保存しない。**
署名付きURLには期限があるため、DBに入れると時間経過で壊れる。
URLは読み出しのたびに発行する。

### 別テーブルにしない理由

`logs` は `id` ではなく **(user_id, date)** で管理されており、`id` はフロントに公開されていない
（`_from_db` がマッピングしていない）。
`log_attachments` が `logs.id` を参照する設計にすると、`id` の公開と結合処理が新たに必要になり、
既存の設計と噛み合わない。1枚に限定した今はカラム2つで足りる。

複数枚に広げたくなった時点で `log_attachments` へ移行する。カラム2つの移行は限定的な変更で済む。

### Storage

```
バケット: lantern-photos（非公開）
パス:     {user_id}/{date}.jpg
          {user_id}/{date}_thumb.jpg
RLS:      auth.uid()::text = (storage.foldername(name))[1]
          に対して SELECT / INSERT / UPDATE / DELETE を許可
```

1記録1枚なので日付をキーにでき、撮り直しは同じパスへの上書きで自然に処理される。

---

## `/save` に写真を触らせない

これが本設計の核心である。

`/save` は受け取ったデータから entry を**作り直す**。

```python
entry = { "date": today, "created": data.get("created", ""), ... }
```

`logs` に写真カラムを持たせたうえで `_to_db` が写真も書くようにすると、
**テキストだけを編集した瞬間に写真が消える**（LogDetail の編集は写真フィールドを送らない）。

対策として、責務を分ける。

- `/save` … テキストのみ。写真カラムには一切書き込まない
- `PUT /api/logs/{date}/photo` … 写真のみ。テキストには触らない

「今日の灯り」が前日ログしか受け取らないことで離脱期間への言及を構造的に禁じているのと同じ発想で、
**渡さないことで壊せなくする**。

具体的には `_to_db()` の戻り値に写真カラムを**含めない**。
`_upsert_one` の update は `_to_db` の結果だけを使うため、写真カラムは更新対象から外れる。

---

## API

| メソッド | パス | 役割 |
|---|---|---|
| PUT | `/api/logs/{date}/photo` | 圧縮・アップロード済みのパスを受け取りDBに記録。該当日の記録が無ければ作る |
| DELETE | `/api/logs/{date}/photo` | DBのパスを消し、**Storageの実ファイルも削除する** |
| GET | `/api/logs` | 既存。`photo_url` / `photo_thumb_url` を署名付きで付与して返す |

すべて `@require_auth`。パスは必ず `g.user_id` から組み立て、
**クライアントから渡されたパスをそのまま信用しない**
（他ユーザーのパスを指定される経路を作らない）。

### 署名付きURLの有効期限

1時間とする。`GET /api/logs` のたびに発行し直す。

---

## 画像処理（クライアント側）

Flask を経由せず、フロントから Supabase Storage へ直接アップロードする。
Render 無料枠のリクエストタイムアウト30秒を避けるため。

| 用途 | 長辺 | 品質 | 目安 |
|---|---|---|---|
| 本体 | 1600px | JPEG 0.8 | 約250KB |
| サムネイル | 400px | JPEG 0.7 | 約30KB |

元画像が指定サイズより小さい場合は拡大しない。

### Web

`canvas` で縮小して `toBlob('image/jpeg', quality)`。追加パッケージは不要。

### mobile（SDK 57）

追加が必要なパッケージ:

- `expo-image-picker`
- `expo-image-manipulator`

**SDK 57 でAPIが変わっている点に注意する**（`mobile/AGENTS.md` の指示に従い公式ドキュメントで確認済み）。

- `ImageManipulator.manipulateAsync()` は**非推奨**。
  `useImageManipulator` フック、または `ImageManipulator.manipulate()` を使い、
  `resize()` → `renderAsync()` → `saveAsync({ format: SaveFormat.JPEG, compress })` と繋ぐ
- `ImagePicker.MediaTypeOptions` は**非推奨**。`mediaTypes: ['images']` と配列で指定する
- 権限は `ImagePicker.useMediaLibraryPermissions()` を使う

---

## 既存コードへの影響

| ファイル | 変更 |
|---|---|
| `modules/logs.py` | `_DB_SELECT` に2カラムを追加（**追加しないと読み出せない**）。`_from_db` に変換を追加。**`_to_db` には追加しない**。`delete_log_by_date` でStorageのファイルも削除 |
| `main.py` | 写真の PUT / DELETE を追加。`/api/logs` で署名付きURLを付与 |
| `frontend/src/components/PhotoPicker.jsx` | 新規 |
| `frontend/src/lib/image.js` | 新規。縮小後の寸法計算と圧縮 |
| `frontend/src/pages/Journal.jsx` | 記録モーダルにピッカーを追加。必須条件を変更 |
| `frontend/src/pages/Home.jsx` | 今日の記録フォームにピッカーを追加 |
| `frontend/src/components/LogDetail.jsx` | 写真の表示・差し替え・削除 |
| `frontend/src/components/LogItem.jsx` | 添付ありの記録にサムネイルを表示 |
| `frontend/src/components/LogSnapshot.jsx` | 全項目が空でも崩れないようにする |
| `mobile/components/PhotoPicker.jsx` | 新規（Web版と同じ役割。実装は expo のAPIを使う） |
| `mobile/lib/image.js` | 新規。`frontend/src/lib/image.js` と**寸法計算部分は同一に保つ** |
| `mobile/app/(tabs)/journal.jsx` | 記録モーダルにピッカーを追加。必須条件を変更 |
| `mobile/components/RecordForm.jsx` | 今日の記録フォームにピッカーを追加 |
| `mobile/components/LogDetail.jsx` | 写真の表示・差し替え・削除 |
| `mobile/components/LogItem.jsx` | 添付ありの記録にサムネイルを表示 |
| `mobile/components/LogSnapshot.jsx` | 全項目が空でも崩れないようにする |
| `modules/ai.py` | `_fmt_logs` が中身の無い行をAIに渡さないようにする |

### 必須条件の変更

現状は非対称になっている。

- 今日の記録（Home / RecordForm）… 空でも保存できる
- カレンダーの記録モーダル（Web / mobile）… 「やったこと」が必須

記録モーダルの条件を「**テキストか写真のどちらかがあれば保存可**」に変更する。

### 写真のみの記録に対する既存の挙動

調査済みの結果を記す。

| 箇所 | 挙動 | 対応 |
|---|---|---|
| `get_daily_quote` | 全項目が空ならAIを呼ばず固定文言を返す | **変更不要**（既に安全） |
| `LogItem` の見出し | `'（記録あり）'` にフォールバックする | **変更不要**（サムネイル表示のみ追加） |
| `calcStreak` | 日付の有無で数える。写真のみでも継続に入る | **変更不要**（目的に沿う） |
| `LogSnapshot` | 日付だけのカードになる | **要対応** |
| `_fmt_logs` | `2026-08-01: ` という中身の無い行をAIに渡す | **要対応** |

---

## テスト方針

**Python（pytest）**

- `_to_db` が写真カラムを**含まない**ことを固定する（本設計の核心。ここが崩れると写真が消える）
- `_from_db` が写真カラムを変換すること
- Storageパスの生成が `user_id` と `date` から決まること
- `/save` に写真フィールドを渡してもDBの写真カラムが変わらないこと（回帰テスト）
- 写真の PUT / DELETE が `@require_auth` で守られること（`test_route_auth.py` の許可リストは変更しない）
- `_fmt_logs` が中身の無い記録をスキップすること

**JavaScript（vitest）**

- 縮小後の寸法計算（純粋関数として切り出す）
  - 長辺が上限を超える場合に比率を保って縮むこと
  - 元画像が上限より小さい場合に拡大しないこと
  - 縦長・横長・正方形のそれぞれ
- `frontend/src/lib/image.js` と `mobile/lib/image.js` の寸法計算部分が一致すること
  （`date.js` / `format.js` と同じドリフト検証）

`canvas` と `expo-image-manipulator` の実処理はテスト環境で動かないため、
**寸法計算だけを純粋関数に切り出して検証する**。

**手動確認**

- 写真だけで保存できること
- テキストだけを編集しても写真が消えないこと（最重要）
- 記録を削除するとStorageのファイルも消えること
- 撮り直しで同じ日付のファイルが上書きされること

---

## 理念チェック（CLAUDE.md 作業前チェックリスト 3）

- **AI憲法「ユーザー自身の言葉を大切にする」**: 画像をAIに渡さないため、
  ユーザーが言葉にしていないものをAIが意味づけすることはない
- **「入力負荷を最小化する」**: 写真1枚で記録が成立する
- **「記録そのものを尊重する」**: 写真のみの記録も継続日数に入れ、一覧にも並べる
- **数字で評価しない**: 写真の枚数やサイズを表示・評価しない
- 新規に追加するユーザー向け文言に禁止ワードを含めない

---

## 想定リスク

| リスク | 備え |
|---|---|
| テキスト編集で写真が消える | `_to_db` に写真を含めない設計＋回帰テストで固定 |
| 記録削除でStorageに孤児ファイルが残る | `delete_log_by_date` でStorageも削除。CASCADEでは消えない |
| SDK 57 のAPI変更を踏む | 公式ドキュメントで確認済み（非推奨APIを使わない） |
| 他ユーザーのパスを指定される | パスは必ずサーバー側で `g.user_id` から組み立てる |
| 署名付きURLの期限切れ | URLをDBに保存せず、読み出しのたびに発行する |
| frontend と mobile の圧縮結果がずれる | 寸法計算を純粋関数にして一致検証テストを置く |

---

## ユーザー側で必要な作業

1. Supabase ダッシュボードで `logs` に2カラムを追加する
2. `lantern-photos` バケットを非公開で作成する
3. バケットのRLSポリシーを設定する

いずれもコードからは実施できない。
