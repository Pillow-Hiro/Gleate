-- Gleate の問いに答えた言葉の置き場（2026-09-22・作者の判断）。
--
-- ## なぜ表が要るのか
--
-- 2026-09-04 から、手がかりの問いに答えると `logs.struggles`（困ったこと）に
-- 入れていた（`client/components/HintPanel.jsx`）。
-- 「手がかりを押す人は、いま詰まっている」という前提だった。
--
-- **前提は外れる。** 作者の記録に、旅の記録へ置かれた問いへの答えが
-- 困ったこととして残っていた。困ってはいない。
--
-- 実害が3つある。
--
-- - `modules/facts.py` は困ったことの語だけを数えて繰り返しを探す。
--   **答えがつまずきとして数えられる**
-- - 振り返りと深掘りは記録を「（困ったこと: …）」と項目名付きで読む
-- - ホームの「今週の発見」は、最新の困ったことを拾う
--
-- 問いと答えは、記録の項目ではなく**それ自体として持つ。**
--
-- ## 中身は暗号化して入る
--
-- `question` と `answer` は記録の本文と同じ扱い（`modules/crypto.py`）。
-- 付帯データに `user_id` を使うので、行を移し替えても復号できない。
--
-- ## 表が無い間は
--
-- `modules/answers.py` は、読めなければ空を返し、書けなければ false を返す。
-- サーバーの配備が先に済んでも画面は止まらない。
-- **流し忘れると答えがどこにも残らない**ので、公開前に必ず流すこと。

create table if not exists public.log_answers (
  id         bigint generated always as identity primary key,
  user_id    uuid        not null,
  log_id     uuid        references public.logs(id) on delete cascade,
  date       date        not null,
  kind       text        not null default 'hint',
  question   text        not null default '',
  answer     text        not null default '',
  created_at timestamptz not null default now()
);

-- 読むのは「その人の、この期間ぶん」だけ。**この索引で足りる。**
create index if not exists log_answers_user_date_idx on public.log_answers (user_id, date desc);

-- 他の表と同じく閉じる（`docs/sql/rls.sql` と対）。
-- サーバーは service_role で触るので動きは変わらない。
alter table public.log_answers enable row level security;

-- 確認
--
--   select kind, count(*) from public.log_answers group by kind;
--
-- ## 困ったことに入ってしまった答えを移すとき
--
-- **中身を見て、答えだけを選ぶこと。**本当に困ったことも同じ列に入っている。
-- 自動では移さない（どれが答えかは書いた人にしか分からない）。
