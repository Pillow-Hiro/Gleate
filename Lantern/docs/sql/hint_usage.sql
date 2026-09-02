-- 手がかりを使った回数（2026-09-02）。
--
-- ## なぜ表が要るのか
--
-- 手がかりは**最初の5回だけ無料**にする（`modules/plan.py` の
-- `FREE_HINTS`）。1日あたりではなく**通算**なので、
-- `ai_usage`（日ごと）では数えられない。
--
-- ## 表が無い間は通す
--
-- `modules/hintusage.py` は、読めなければ**無料の範囲として扱う**。
-- サーバーの配備が先に済んでも、機能が丸ごと死なない。
-- `modules/ratelimit.py` と同じ考え方。
--
-- **公開前に必ず流すこと。** 流し忘れると全員が無制限になる。

create table if not exists public.hint_usage (
  id         bigint generated always as identity primary key,
  user_id    uuid not null,
  used_at    timestamptz not null default now()
);

-- 数えるのは「その人が何回使ったか」だけ。**この索引で足りる。**
create index if not exists hint_usage_user_idx on public.hint_usage (user_id);

-- 他の表と同じく閉じる（`docs/sql/rls.sql` と対）。
-- サーバーは service_role で触るので動きは変わらない。
alter table public.hint_usage enable row level security;

-- 確認
--
--   select user_id, count(*) from public.hint_usage group by user_id;
