# HANDOFF.md — 引き継ぎ

**役割：「今どこにいるか」。** 別のセッション・別の人が、
これだけ読めば続きから始められる状態にしておく。

最終更新: 2026-08-06

## このファイルの決まり

**1つだけ。日付つきの引き継ぎ資料を増やさない。**

以前は `SESSION_HANDOFF_2026-07-28.md` のように日付で作っていた。
2つ問題があった。

1. どれが最新か分からなくなる
2. **feature ブランチに置いたまま main にマージされず、
   新しいセッションから見えなくなった**（実際に起きた）

だから main に1つ置き、上書きし続ける。過去分は `docs/archive/` にある。

**作業のたびに更新する。** 更新していない状態でセッションが切れると、
次の人は git log から現状を推測することになる。

---

## 1. 現在地

| | |
|---|---|
| バージョン | v2.0（Expo + Flask API + Supabase） |
| ブランチ | `main` |
| Web | Vercel（`client/` から `npx expo export --platform web`） |
| API | Render |
| ネイティブ | **未配布。** EASの器（`eas.json`・projectId）はある |
| 実データ | 記録18件・アイデア0件・利用者は作者1人 |
| 検査 | pytest 588件 / vitest 62件 |

## 2. 直近にやったこと（2026-08-06）

1日で入れたものが多い。**どれもまだ日常で使われていない。**

- 問いの資産50問（`modules/questions/`）— AIを使わない
- アイデアの溜め場（`modules/ideas.py` + Journal のタブ）
- スプラッシュの文字が出ない不具合を修正
- パスワード自動入力と Enter ログインを修正（`FormShell.web.jsx`）
- 401で即サインアウトするのをやめた
- 記録フォームの既定表示を1欄に畳んだ
- 計測（`scripts/report_metrics.py`）
- ドキュメントの棚卸（このファイルを含む）

## 3. 次にやること

**優先度1: 使う。**

問いとアイデアは 2026-08-06 に入れたばかりで、効くか分かっていない。
新しい入口を足す前に、これらが効くかを見る。
見る手段は用意した。

```
python scripts/report_metrics.py --user <user_id>
```

**優先度2: ネイティブ配布（フェーズA7）**

要ユーザー操作。Apple Developer Program（年$99）の加入から。
これが終わるまで Journaling Suggestions API には進めない。

**優先度3: TikTok連携**

優先度1の結果を見てから判断する。
`REVIEW_v2.0.md` は「外部連携は中心ではない」と結論している。

**やらないと決めたもの**: 目標設定機能（v0.5構想）、利用ログの収集。

## 4. 今ある未解決のもの

| 内容 | 状態 |
|---|---|
| `.claude/worktrees/sad-hawking-5afb30/` | 孤児ディレクトリ648K。gitの管理から外れている。中身は履歴にあるもののみ。**削除してよい** |
| `client/app.json` の `version` | `1.0.0` のまま。`constants.js` は `v2.0`。ストア配布時に決める |
| North Star Metric | 器はできたが母数が足りない |

## 5. 引き継ぐときに読む順番

1. `CLAUDE.md` — 判断基準。**これを読まずにコードを書かない**
2. このファイル — 現在地
3. `REQUIREMENTS.md` — 何を満たすか
4. `PROJECT_MAP.md` — どこにあるか
5. `PROGRESS.md` — 経緯（長い。必要な日付だけ）

`REVIEW_v2.0.md` は 2026-08-06 時点の機能精査。優先順位の根拠。

## 6. 環境

`.env`（ローカル）と Render の環境変数に入っている。**値は文書に書かない。**

| 変数 | 用途 |
|---|---|
| `SUPABASE_URL` / `SUPABASE_KEY` | DB・Storage |
| `ANTHROPIC_API_KEY` | AI |
| `YOUTUBE_*` / `TWITCH_*` | 各OAuth。`*_REDIRECT_URI` は本番で明示設定が要る |
| `FRONTEND_ORIGIN` | OAuth後の戻り先 |
| `UNSPLASH_ACCESS_KEY` | 起動画面の背景（無くても動く） |

`GET /api/debug/version` が、どのリダイレクトURIで動いているかを返す。
値そのものは出さない。設定ミスの検出用。
