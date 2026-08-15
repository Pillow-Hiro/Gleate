-- AI を呼んだ回数の1日ぶんの数え。
--
-- **何を書いたかは持たない。** 利用者・日付・件数だけ。
-- 利用ログを集めない方針（CLAUDE.md）から外れないようにしている。
--
-- 表が無い間はサーバーが素通しする（modules/ratelimit.py）。
-- 流す順番を気にしなくてよい。

create table if not exists public.ai_usage (
  user_id uuid not null,
  date date not null,
  count integer not null default 0,
  primary key (user_id, date)
);

-- 古い行は残しても意味がない。手で消すか、cron を持つなら30日で落とす。
create index if not exists ai_usage_date_idx on public.ai_usage (date);

-- service_role で触るので RLS は必須ではないが、有効にしておく。
-- 絞り漏れが起きても、anon 鍵からは読めない。
alter table public.ai_usage enable row level security;
