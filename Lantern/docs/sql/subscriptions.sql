-- 有料プランの状態。
--
-- **アプリからは書かない。** 書くのは RevenueCat の webhook を受ける
-- サーバーだけ（modules/plan.py は読むだけ）。
-- 端末側のフラグを信じると、書き換えるだけで有料になってしまう。
--
-- **公開前に必ず流すこと。** 表が無い間、サーバーは全員を有料として扱う
-- （modules/plan.py の「表が無いときは通す」）。
-- 逆にすると、表の作成が遅れただけでお金を払った人が締め出される。

create table if not exists public.subscriptions (
  user_id uuid primary key,

  -- RevenueCat から来る状態。plan.py が通すのは
  -- active / trialing / in_grace_period の3つ。
  status text not null,

  -- 買った商品（lantern_plus_monthly / lantern_plus_yearly）。
  -- 名前の決まりは docs/REVENUECAT.md。
  -- どちらで入ったかは price を出すときに要る。
  product_id text,

  -- この時刻を過ぎたら無料に戻る。**空なら切れていない扱い。**
  -- 解約待ちの行に期限が入らない経路があるため。
  expires_at timestamptz,

  -- 誰が買ったかを RevenueCat 側の ID でも持つ。
  -- 問い合わせのとき、向こうの管理画面と突き合わせるのに要る。
  revenuecat_id text,

  updated_at timestamptz not null default now()
);

-- 期限切れをまとめて調べるとき用。
create index if not exists subscriptions_expires_idx
  on public.subscriptions (expires_at);

-- service_role で触るので RLS は必須ではないが、有効にしておく。
-- **絞り漏れが起きても anon 鍵からは読めない。**
-- 方針は docs/sql/rls.sql と同じで、policy は作らない。
alter table public.subscriptions enable row level security;
