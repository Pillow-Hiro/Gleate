# React Native移行 設計書 v2.0

作成日: 2026-07-27
対象: CLAUDE.md 将来ロードマップ「フェーズA（React Native化）」
ステータス: A1 実装中

---

## 決定事項

| 項目 | 決定 | 理由 |
|---|---|---|
| フレームワーク | Expo | 開発環境がWindows 11のため、iOSビルドにmacOS実機が不要なEAS Buildが必須要件になる |
| ルーティング | Expo Router（ファイルベース） | 現行の `react-router-dom` に最も近く、移植時の思考コストが低い |
| スタイリング | NativeWind v4 | 現行の20個のカラートークンとライト/ダーク切替をTailwind設定として持ち込める。`className` の大半が再利用できる |
| ストレージ | AsyncStorage | `localStorage`（節目バナー既読・レビューキャッシュ）の置き換え |
| Web版の扱い | 最終的にExpo Web出力へ統一 | 現行 `frontend/` はA7完了まで維持し、その後廃止する |
| リポジトリ | 同一リポジトリに `mobile/` を追加 | API変更とアプリ側の変更を同じコミットで扱える |
| チャート | 未定（A6で決定） | Dashboardを最後に回すため |

### NativeWindを選ぶ理由

現行フロントエンドは2,769行。StyleSheet方式ではUI記述をすべて書き換えることになるが、
NativeWindなら `className="bg-sage-light/60 border border-sage/20 rounded-xl"` のような
既存の記述が概ねそのまま通る。移行コストへの影響が最も大きい選択。

---

## 実装時に判明した既存ドキュメントの誤り

### 認証方式（重要）

CLAUDE.md と PROGRESS.md は「Supabase Auth（メールOTP認証）」と記載しているが、
実装（`frontend/src/pages/Login.jsx`）は `signInWithPassword` / `signUp` を使った
**メールアドレス＋パスワード認証**である。OTPは使っていない。

mobile側はパスワード認証に合わせて実装する。

### goals テーブル

DESIGN_multimodal_v1.3.md は `goals` テーブルが存在する前提で記載しているが、
本番Supabaseに `goals` テーブルは存在しない（2026-07-27 確認）。
`/goals/save` `/goals/suggest` `/goals/interview` `/api/vision` は
参照先が無いまま例外を握り潰しており、実質動作していない。本移行の対象外とする。

---

## ディレクトリ構成

```
Lantern/
├── main.py, modules/     ← Flask API（無改修。CORS設定のみA1で追加）
├── frontend/             ← 現行Web版（A7完了まで維持し、その後Expo Webに置換）
└── mobile/               ← 新規
    ├── app/              ← Expo Router
    │   ├── _layout.jsx           ← 認証ガード・テーマ
    │   ├── login.jsx
    │   └── (tabs)/
    │       ├── _layout.jsx       ← タブ定義
    │       ├── index.jsx         ← Home（今日）
    │       ├── journal.jsx       ← 記録
    │       ├── insights.jsx      ← 振り返り
    │       ├── dashboard.jsx     ← ダッシュボード
    │       └── settings.jsx      ← 設定
    ├── components/
    ├── lib/
    │   ├── supabase.js   ← AsyncStorage対応クライアント + authFetch
    │   └── date.js       ← frontend/src/lib/date.js から移植
    ├── global.css        ← NativeWind のテーマ定義
    ├── tailwind.config.js
    ├── app.json
    └── package.json
```

`lib/date.js` は当面 `frontend/` と重複する。この規模でmonorepoのworkspace化は過剰なため
行わず、`frontend/` 廃止時に重複を解消する。

---

## UIで変わる点

現行はPC想定のサイドバー（md以上常時表示）＋モバイル用ハンバーガードロワーだが、
React Nativeではボトムタブが標準。ナビゲーションの見た目と操作感は変わる。
項目は現行と同じ5つ（今日／記録／振り返り／ダッシュボード／設定）を維持する。

---

## 移植で置き換えが必要なもの

| 現行 | 移行後 |
|---|---|
| `react-router-dom` | Expo Router |
| `tailwindcss` v4 + `@tailwindcss/vite` | NativeWind v4 |
| `recharts`（Dashboard） | 別ライブラリ（A6で選定） |
| `<div>` `<p>` `<button>` 等のDOM要素 | `<View>` `<Text>` `<Pressable>` |
| `localStorage` | AsyncStorage |
| `import.meta.env.VITE_*` | `process.env.EXPO_PUBLIC_*` |
| `window.location.reload()`（authFetchの401処理） | サインアウトのみ行い、認証ガードに画面遷移を任せる |
| CSS変数によるテーマ（index.css） | NativeWindのテーマ設定 |

無改修で使えるもの：Flask API、Supabase、`lib/date.js` 等の純ロジック、データ取得・集計ロジック。
APIサーバーを分離済みであることが効いている。

---

## 段階計画

| # | 内容 | 完了条件 |
|---|---|---|
| **A1** | 土台：Expo作成・Supabase認証・タブ・テーマ | ログインでき、5タブが空画面で切り替わる |
| A2 | Home | 今日の灯り表示・記録の保存が通る |
| A3 | Journal | 一覧／詳細／編集／削除／カレンダー／検索／振り返り |
| A4 | Insights | 密度マップ・過去比較・キーワード |
| A5 | Settings・SplashScreen | |
| A6 | Dashboard（YouTube OAuth） | リダイレクト処理の設計が別途必要 |
| A7 | Expo Webへの統一・EASビルド・配布 | Vercelの配信元を切替 |

---

## リスク

### CORS（A1で対応）

`main.py` のCORS許可originは現在 Vercel と `http://localhost:5173` のみ。
React Nativeのネイティブfetchはブラウザではないため影響を受けないが、
Expo Web（`http://localhost:8081`）はCORSに阻まれる。A1でoriginを追加する。

### YouTube OAuth（A6）

リダイレクトURIがWeb前提の設計。ディープリンク対応が必要で、ここだけ設計が重くなる。
アプリ版ではDashboardを非搭載とする判断もあり得る。

### 二重保守

A7完了まで `frontend/` と `mobile/` の両方を保守することになる。

### 配布コスト

Apple Developer Program（$99/年）、Google Play Console（$25/買い切り）の登録が必要。
EAS Buildには無料枠があるが、ビルド待ち時間が発生する。

---

## AI憲法との関係

本移行はUI層の載せ替えであり、AI応答の生成ロジック（`modules/ai.py`）には手を入れない。
プロンプト・文言・禁止ワードの扱いは現行のまま維持される。
画面上の文言を移植する際も、既存の文言をそのまま持ち込むこととし、
移植を機に書き換えない。
