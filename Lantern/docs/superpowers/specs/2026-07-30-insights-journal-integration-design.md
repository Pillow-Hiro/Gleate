# Insights を Journal の振り返りタブへ統合する

作成日: 2026-07-30
対象: Web（`frontend/`）と mobile（`mobile/`）の両方

---

## 背景

「振り返り」という名前の場所が2つある。

- ナビの「振り返り」= `Insights.jsx`（独立ページ）
- 「記録」ページの中のタブ「振り返り」= `Journal.jsx` の `activeTab === 'review'`

さらに中身も重複している。

| 重複 | Journal 側 | Insights 側 |
|---|---|---|
| カレンダー | 記録タブの `ActivityCalendar`（日付タップで記録を開く） | 「記録密度」の `ActivityCalendar`（`onDateSelect` が空の読み取り専用） |
| 過去比較 | 「過去との対話」= 週の全記録 + AIの観察と問い | 「過去との比較」= 最近傍1件を今日と左右に並置（AIなし） |

重複していないのは Insights の「キーワード」と Journal の「今週／今月の振り返り」だけ。

## 目的

1. 重複（カレンダー・過去比較）を一本化する
2. ナビを5→4に減らし、記録に関するものを1箇所へ集約する
3. Insights を独立ページではなく、記録を見た流れで辿り着く場所に置く

副次的に「振り返り」の名前の衝突が解消される。

---

## 保留（2026-07-30 時点）

以下2点は判断を保留し、今回の実装には含めない。

| 保留項目 | 内容 | 保留時の影響 |
|---|---|---|
| `frontend/src/lib/format.js` の抽出 | `Journal.jsx` 5-50行の表示用フォーマッタ7関数を `mobile/lib/format.js` と同じ形に寄せ、一致検証テストを置く | `Journal.jsx` は約400行ではなく約440行になる。mobile との二重保守は残る |
| AIカードへの出典行 | `PatternCard` の上に「{past_date}を含む週の記録から」を添える | AIの観察が画面に出ていない記録に言及しうる点が未解決のまま残る |

下記の「決定事項」および A〜E は、この2点を除いて実装する。

---

## 決定事項

| 論点 | 決定 |
|---|---|
| 過去比較が2種類ある件 | 1つに統合する |
| 統合後の過去側の見せ方 | 今日 vs 過去1件の左右対比を基本とし、「振り返る」を押すとAIの観察が加わる |
| カレンダーの重複 | 「記録密度」を削除し、記録タブのカレンダーに一本化 |
| 1年前（12ヶ月） | 残す。APIの上限を6→12に広げる |
| 対象範囲 | Web と mobile の両方 |

---

## 変更内容

### A. ナビゲーション

**Web**

- `Sidebar.jsx` の `navItems` から「振り返り」（`/insights`）を削除 → 今日 / 記録 / ダッシュボード / 設定 の4項目
- `App.jsx` の `<Route path="/insights">` は削除せず `<Navigate to="/journal" replace />` に変更する
  （既存のブックマークや履歴からの遷移を `*` の catch-all で `/` に飛ばすより、意図した行き先へ送る）

**mobile**

- `app/(tabs)/_layout.jsx` の `<Tabs.Screen name="insights" ... />` を削除 → 4タブ
- `app/(tabs)/insights.jsx` も削除する

SDK 57 のドキュメントによると、`(tabs)` にファイルを置いただけではタブに出ず
`<Tabs.Screen>` の明示宣言が必要（タブバーから隠すだけなら `options={{ href: null }}`）。
つまり宣言を消せばタブバーからは消えるが、**ファイルが残る限りルートとしては到達可能**なため、
ファイルも削除して両方を落とす。

`lantern://` のディープリンクは `dashboard` にしか向いていないため、mobile 側にリダイレクト対応は不要。

### B. 振り返りタブの構成

| 順 | セクション | 出自 |
|---|---|---|
| 1 | 今週の振り返り | 既存（Journal）。変更なし |
| 2 | 今月の振り返り | 既存（Journal）。変更なし |
| 3 | 過去との対話 | 「過去との対話」と「過去との比較」を統合 |
| 4 | キーワード | Insights から移設。変更なし |

「記録密度」は削除する。

### C. 統合版「過去との対話」の仕様

**props**: `logs`（全記録）。現在の `TimelineSection` は `logs` を持たずAPIから取り直しているが、
`Journal` が既に保持しているため props で渡す。取得の重複がなくなる。

**期間タブ**

```js
const PERIODS = [
  { label: '1ヶ月前', months: 1 },
  { label: '3ヶ月前', months: 3 },
  { label: '半年前',  months: 6 },
  { label: '1年前',   months: 12 },
]
```

**常時表示部（AIを呼ばない）**

- `target = monthsAgoStr(months)` で対象日を求める
- `pastLog = findNearestLog(logs, target)` で ±3日の最近傍1件
- `todayLog = logs.find(l => l.date === localDateStr())`
- `LogSnapshot` を左に過去、右に今日で並置する（現 Insights の見た目を踏襲）
- 記録がない場合の文言は現行のまま
  - 過去側「この時期の記録はありません。」
  - 今日側「今日の記録はまだありません。」

**AI観察部（ボタンで発火）**

- 「振り返る」ボタンで `GET /api/timeline-reflection?months_ago={months}`
- `data.reflection` があれば `PatternCard`（observation + question）を表示
- `data.past_logs.length === 0` のときは「{months}ヶ月前の記録はありません。」
- `months` を切り替えたら `data` を `null` に戻す（現行挙動を踏襲）
- 失敗時は `data = null` にしたうえで `console.warn` を残す
  （2026-07-29 に決めた「例外を握り潰さない」方針を継続する）

**表示と根拠のズレへの対処**

サーバーは `past_date` を含む週の全記録を根拠にAIの観察を生成する。
一方、画面に出る過去記録は最近傍1件だけになる。
そのままだと観察が画面にない記録に言及しうるため、
`PatternCard` の上に出典を1行添える。

> {past_date}を含む週の記録から

これは事実の提示であり、評価や意味づけを含まない。

### D. ファイル構成

`Journal.jsx` は現在715行あり、統合するとさらに増える。
mobile は既に `components/` へ分割済みのため、**Web を mobile の構造に揃える**。

**新設（`frontend/src/components/`）**

| ファイル | 抽出元 |
|---|---|
| `PatternCard.jsx` | `Journal.jsx` 196-204 |
| `ReviewSection.jsx` | `Journal.jsx` 205-298 |
| `TimelineSection.jsx` | `Journal.jsx` 300-410 を統合版に改修 |
| `LogSnapshot.jsx` | `Insights.jsx` 6-38 |
| `KeywordSection.jsx` | `Insights.jsx` 52-122 |

**新設（`frontend/src/lib/`）**

| ファイル | 内容 |
|---|---|
| `format.js` | `Journal.jsx` 5-50 の表示用フォーマッタ7関数（`WEEKDAYS_JA` / `parseDate` / `monthLabel` / `dayLabel` / `dateDisplayJa` / `formatAge` / `truncateTitle` / `groupByMonth`） |

これらは `mobile/lib/format.js` と同一の関数群であり、`lib/date.js` と同じ二重保守になっている。
`date.js` と同様、**2ファイルを同一内容に保ち、一致を検証するテストを置く**。

**削除**

- `frontend/src/pages/Insights.jsx`
- `mobile/app/(tabs)/insights.jsx`

**mobile 側**

mobile は既に分割済みのため、新設は1つだけ。

| 対象 | 変更 |
|---|---|
| `components/LogSnapshot.jsx` | 新設。`insights.jsx` の `LogSnapshot` / `SNAPSHOT_FIELDS` / `PERIODS` を移す |
| `components/TimelineSection.jsx` | 統合版に改修（`MONTHS_OPTIONS = [1,3,6]` → 4期間、`logs` を props で受ける） |
| `components/KeywordSection.jsx` | **変更なし**。既にコンポーネント化済みで、import 元が `insights.jsx` から `journal.jsx` へ移るだけ |
| `app/(tabs)/journal.jsx` | 振り返りタブに `<KeywordSection />` を追加し、`<TimelineSection logs={logs} />` に変更 |

結果として `Journal.jsx` は約400行になる見込み。

### E. API変更

`main.py` の `timeline_reflection`：

```python
months_ago = max(1, min(months_ago, 6))   # 変更前
months_ago = _clamp_months_ago(request.args.get("months_ago"))  # 変更後
```

`_clamp_months_ago(raw)` をモジュールレベルの純粋関数として切り出す。

- 上限を 6 → 12 に広げる
- 数値化できない値・未指定は 1
- 1未満は 1、12超は 12

既存の 1/3/6 は挙動が変わらないため後方互換。ルートの増減はないため
`tests/test_route_auth.py` の許可リストは変更不要。

---

## 影響範囲

| ファイル | 変更 |
|---|---|
| `main.py` | `timeline_reflection` のクランプ、`_clamp_months_ago` 追加 |
| `frontend/src/App.jsx` | `/insights` をリダイレクトに変更 |
| `frontend/src/components/Sidebar.jsx` | navItems から「振り返り」削除 |
| `frontend/src/pages/Journal.jsx` | 分割・振り返りタブの構成変更 |
| `frontend/src/pages/Insights.jsx` | 削除 |
| `frontend/src/components/*.jsx` | 5ファイル新設 |
| `frontend/src/lib/format.js` | 新設 |
| `mobile/app/(tabs)/_layout.jsx` | Tabs.Screen 削除 |
| `mobile/app/(tabs)/insights.jsx` | 削除 |
| `mobile/app/(tabs)/journal.jsx` | 振り返りタブの構成変更 |
| `mobile/components/TimelineSection.jsx` | 統合版に改修 |
| `mobile/components/LogSnapshot.jsx` | 新設 |
| `mobile/lib/format.js` | 変更なし（`frontend/src/lib/format.js` の抽出元として参照するのみ） |

**Supabase スキーマ**: 変更なし
**環境変数**: 変更なし
**Render / Vercel のルーティング**: `serve_react` はAPIルートの増減がないため影響なし

---

## テスト方針

**Python（pytest）**

- `_clamp_months_ago` の新規テスト
  - `"1"` → 1、`"12"` → 12、`"13"` → 12、`"0"` → 1、`"-5"` → 1
  - `"abc"` → 1、`None` → 1、`""` → 1
- 既存の `tests/test_route_auth.py` はルート増減がないため無変更で通ること

**JavaScript（vitest）**

- `monthsAgoStr` / `findNearestLog` は既存テストで担保済み（12ヶ月ケースを含む）
- `frontend/src/lib/format.js` の新規テスト（7関数）
- `frontend/src/lib/format.js` と `mobile/lib/format.js` の一致を検証するテスト
  （`date.test.js` と同じ方式）

**手動確認**

- 記録タブと振り返りタブを往復してカレンダーが二重に出ないこと
- 4つの期間すべてで左右対比が出ること（記録がない期間は文言が出ること）
- 「振り返る」でAIの観察が出ること、期間を切り替えるとリセットされること
- `/insights` にアクセスすると `/journal` へ飛ぶこと
- mobile が4タブになり、insights タブが消えていること

---

## 理念チェック（CLAUDE.md 作業前チェックリスト 3）

- **Insights AI憲法「AIは比較までしかしない」**: 左右並置は①事実の提示・②差分の提示のままで、③意味づけはしない
- **「記録密度」の削除**: 「記録が多い＝良い」という価値観を作らない方針にむしろ沿う
- **離脱期間への言及**: 期間ラベルは「1ヶ月前」等の固定表記で、記録の空白に言及する文言は追加しない
- **禁止ワード**: 新規に追加する文言は「{past_date}を含む週の記録から」のみで、評価語を含まない

---

## スコープ外

- Dashboard（YouTube連携）には触れない
- 「今週の振り返り」「今月の振り返り」のロジックは変更しない
- `ActivityCalendar` 自体の見た目・挙動は変更しない
- `/api/timeline-reflection` が返す `past_logs` の粒度（週単位）は変更しない

---

## リスクと備え

| リスク | 備え |
|---|---|
| Expo Router のタブ削除方法がSDK 57で変わっている可能性 | `mobile/AGENTS.md` の指示に従い、実装前に v57 のドキュメントを確認する |
| Journal.jsx の分割で既存挙動が壊れる | 分割は純粋な移動に留め、統合版 TimelineSection の改修と別コミットに分ける |
| 1年前の記録が存在せず空表示になる | 仕様どおり。「この時期の記録はありません。」を出す |
| format.js の抽出で frontend と mobile がずれる | 一致検証テストを同時に入れる |
