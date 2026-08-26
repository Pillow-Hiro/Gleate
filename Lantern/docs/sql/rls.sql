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
-- **何度流してもよい。**すでに有効な表は、そのまま有効なだけ。
--
-- ## 表の一覧をここで持たない
--
-- 2026-08-24 に書き直した。それまで6表を直接並べていたが、
-- **その後に増えた `subscriptions` と `ai_usage` が抜けていた。**
-- 課金状態と利用回数が、方針の外に置かれたままになっていた。
--
-- 手で並べる限り、表が増えるたびに同じ抜けが起きる。
-- **サーバーが実際に触っている表**を書き出し、
-- 存在するものにだけ掛ける形にした。
--
--   grep -rho 'table("[a-z_]*")' modules/ main.py | sort -u
--
-- `goals` は**実在しない表**（`load_goals()` が毎回失敗を握り潰している。
-- 目標設定機能は REQUIREMENTS.md の「やらないこと」）。
-- 一覧には残す。作られた日に自動で掛かる方が、また忘れるより良い。
-- 存在しない表は黙って飛ばす——**1つ無いだけで全体が止まると、
-- 流すのが怖くなって、いつまでも流されない。**

do $$
declare
  t text;
begin
  foreach t in array array[
    'logs',
    'ideas',
    'daily_quotes',
    'goals',
    'subscriptions',
    'ai_usage',
    'youtube_tokens',
    'twitch_tokens',
    'twitch_streams'
  ]
  loop
    if to_regclass('public.' || t) is null then
      raise notice '飛ばした（表が無い）: %', t;
      continue;
    end if;
    execute format('alter table public.%I enable row level security', t);
    raise notice '有効にした: %', t;
  end loop;
end $$;

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
