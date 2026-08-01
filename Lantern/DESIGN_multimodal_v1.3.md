# マルチモーダル記録 設計書 v1.3

作成日: 2026-07-26
対象バージョン: v1.3〜v1.5（段階実装）
ステータス: **写真部分は下記specに置き換え済み。以降は動画・作品・音楽リンクの参考資料**

> **2026-08-01 追記**
>
> 写真については `docs/superpowers/specs/2026-08-01-photo-record-design.md` が正。
> 本書の以下の記述は現状と異なるため、そのまま参照しないこと。
>
> - 影響範囲が `frontend/` のみ（現在は mobile も存在する）
> - `goals` テーブルが現行スキーマにある（存在しない。2026-07-28 に関連ルートを削除済み）
> - 記録フォームは Journal.jsx の textarea 4つ（分割済み。フォームは4箇所ある）
> - `log_attachments` 別テーブル（1枚に限定したため `logs` のカラム2つに変更）
> - 写真10MB × 5枚/日（年18GBで無料枠を超過する。圧縮前提に変更）
>
> 動画・作品・音楽リンクの検討内容（容量・著作権・サムネイル生成の論点）は
> 引き続き有効なため本書を残す。

---

## 現状確認

### Supabase PostgreSQL 現在スキーマ

**logs テーブル**
| カラム | 型 | 備考 |
|---|---|---|
| id | UUID | PK |
| date | DATE | 記録日 |
| content | TEXT | やったこと |
| next_action | TEXT | 次にやること |
| good_things | TEXT | よかったこと |
| struggles | TEXT | 困ったこと |
| lantern_message | TEXT | AIの観察 |
| updated_at | TIMESTAMPTZ | 保存日時 |
| user_id | UUID | FK（Supabase Auth） |

**goals テーブル**
| カラム | 型 | 備考 |
|---|---|---|
| id | INT | PK（固定値 1） |
| vision | TEXT | ビジョン |
| monthly_goals | JSONB | 月次目標配列 |
| weekly_goals | JSONB | 週次目標配列 |
| updated_at | TIMESTAMPTZ | |

### Supabase Storage の現状

コードベース全体に Storage 参照なし。未使用。

### フロントエンド入力フォームの現状

Journal.jsx の記録フォームは textarea 4フィールドのみ。
ファイルアップロード UI は存在しない。

---

## スキーマ変更案

### 新テーブル: log_attachments

```sql
CREATE TABLE log_attachments (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  log_id        UUID        REFERENCES logs(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL,
  type          TEXT        NOT NULL,
  -- 'photo' | 'video' | 'artwork' | 'music_link'
  url           TEXT        NOT NULL,
  -- Storage URL（写真/動画/作品）または外部リンク（音楽）
  thumbnail_url TEXT,
  -- 動画・PDF のサムネイル用（任意）
  filename      TEXT,
  -- アップロード時の元ファイル名
  size_bytes    INT,
  -- ファイルサイズ（外部リンクは NULL）
  mime_type     TEXT,
  -- 'image/jpeg' / 'application/pdf' 等
  caption       TEXT,
  -- ユーザー入力の補足テキスト（任意）
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### logs テーブルへの変更: なし

attachment の有無は log_attachments の外部キーで管理するため、
logs テーブルの変更は不要。

### Supabase Storage バケット

```
バケット名: lantern-media
パス形式:   {user_id}/{YYYY-MM}/{log_date}/{uuid}.{ext}
アクセス:   非公開（RLS + 署名付きURL）
RLS:        SELECT/INSERT/DELETE は auth.uid() = user_id のみ許可
```

---

## ファイルアップロード制約案

| 種別 | 対応形式 | 上限/ファイル | 上限/記録 |
|---|---|---|---|
| 写真 | JPEG / PNG / WebP | 10 MB | 5枚 |
| 動画 | MP4 / MOV | 100 MB | 1本 |
| 作品 | JPEG / PNG / PDF | 20 MB | 3点 |
| 音楽リンク | URL のみ（ファイル不可） | — | 3件 |

音楽をファイル保存しない理由:
著作権リスクに加え、100MB 超の音声ファイルは Supabase Storage 無料枠（1GB）を
圧迫する。外部リンク（SoundCloud / Bandcamp 等）で代替する。

---

## 影響範囲

| ファイル | 変更内容 |
|---|---|
| modules/logs.py | load_attachments() / save_attachment() / delete_attachment() を追加 |
| main.py | POST /api/logs/{date}/attachments（アップロード）、DELETE /api/attachments/{id} を追加 |
| frontend/src/lib/supabase.js | Supabase Storage への直接アップロードヘルパーを追加 |
| frontend/src/pages/Journal.jsx | ファイルピッカー UI / メディア表示を記録フォーム・詳細に追加 |
| frontend/src/components/MediaUploader.jsx | 新規コンポーネント（ファイル選択・プレビュー・アップロード） |
| Supabase（手動対応） | log_attachments テーブル作成・RLS 設定・バケット作成 |

---

## 既存機能への影響

### Journal 一覧
添付あり記録にアイコン表示を追加する程度（軽微）。

### Insights 比較機能
テキスト比較ロジックには影響しない。
写真・作品の「時系列変化を並べる」表示は将来機能として分離可能。
現時点では log_attachments を AI プロンプトに渡さない（プライバシー・コスト観点）。

### AI 生成（timeline / milestone）
_fmt_logs() はテキストフィールドのみを使用しているため影響なし。

---

## 想定リスク

### Supabase Storage 容量（要確認事項）
無料枠: 1GB / 帯域 2GB / 月。
写真5枚 × 10MB × 毎日記録 = 月 1.5GB 超の可能性あり。
対策: 有料プラン（Pro: 100GB）への移行を想定して設計する。

### Render アップロードタイムアウト
Render 無料枠はリクエストタイムアウト 30 秒。
100MB 動画は超過する可能性がある。
対策: フロントから Supabase Storage に直接アップロード（Flask を経由しない）する
設計で回避する。

### 動画の複雑性
サムネイル生成・ストリーミングが必要。Supabase は Transcoding 非対応。
対策: 動画は後回し（v1.5 以降）。まず写真のみ実装推奨。

### 音楽リンクの恒久性
SoundCloud / YouTube 等の外部リンクは将来削除される可能性あり。
対策: 仕様として許容（ユーザー責任）。UI に注意書きを添える。

### Insights AI への誤送信
画像 URL が AI プロンプトに混入すると想定外の出力になる可能性。
対策: _fmt_logs() と AI 関連関数が log_attachments を参照しない設計を
明示的に維持する。

---

## 実装フェーズの推奨順序

| フェーズ | 内容 | 理由 |
|---|---|---|
| v1.3 | 写真のみ | 需要が最も高く実装コストが低い |
| v1.4 | 作品（PDF/画像）+ 音楽リンク | ファイル系の拡張・リンク系は容量負荷なし |
| v1.5 | 動画 | サムネイル・容量・UX を含む別設計が必要 |

---

## 次のステップ（承認後）

1. Supabase Storage 容量プランを確認する（無料 / Pro）
2. Supabase ダッシュボードで log_attachments テーブルを手動作成する
3. lantern-media バケットを作成し RLS を設定する
4. v1.3 写真実装フェーズへ進む
