-- 行レベルセキュリティ（RLS）を有効にする。
--
-- ## なぜ要るのか
--
-- サーバーは service_role 鍵で Supabase を触っている（`modules/logs.py`）。
-- **service_role は RLS を通らない。** つまり今の安全性は
-- 「全部のクエリが `.eq("user_id", ...)` で絞れているか」だけに依存している。
--
-- 1か所でも絞り忘れれば、他人の記録が出る。
-- 2026-08-15 の精査では絞り漏れは見つからなかったが、
-- **見つからなかったことと、これから起きないことは別。**
--
-- RLS を有効にしておくと、
--
-- - 絞り漏れがあっても、anon 鍵からは読めない
-- - 万一 anon 鍵が漏れても、他人の行に手が届かない
--
-- ## アプリは壊れない
--
-- クライアントは Supabase の表を直接触っていない（認証だけに使っている）。
-- データは全部 Flask を経由し、Flask は service_role で触る。
-- **service_role は RLS を無視するので、サーバーの動きは変わらない。**
--
-- 方針として、ここでは**方針だけを有効にして、許可は出さない。**
-- 誰にも許可を出さない ＝ anon / authenticated からは何も見えない、
-- という状態がいまの設計に合っている。
--
-- ## 流す順番
--
-- いつ流してもよい。サーバーの動きが変わらないため。

alter table public.logs           enable row level security;
alter table public.ideas          enable row level security;
alter table public.daily_quotes   enable row level security;
alter table public.youtube_tokens enable row level security;
alter table public.twitch_tokens  enable row level security;
alter table public.twitch_streams enable row level security;

-- 確認。`rowsecurity` が全部 true になっていればよい。
--
--   select tablename, rowsecurity
--   from pg_tables
--   where schemaname = 'public'
--   order by tablename;
--
-- ## もし将来クライアントから直接触るようになったら
--
-- そのときは方針を足す。形はどの表も同じ。
--
--   create policy "本人だけ" on public.logs
--     for all
--     to authenticated
--     using (auth.uid() = user_id)
--     with check (auth.uid() = user_id);
--
-- **いまは足さない。** 使わない許可を先に出しておく理由がない。
