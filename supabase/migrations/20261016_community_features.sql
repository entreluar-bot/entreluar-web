-- Resposta da Luana nos comentários
alter table public.journal_comments
  add column if not exists author_reply text,
  add column if not exists author_reply_at timestamptz;

-- Pergunta-gatilho própria de cada post
alter table public.journal
  add column if not exists reader_question text;

-- Curtidas nos comentários ("Me identifiquei")
create table if not exists public.comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.journal_comments(id) on delete cascade,
  voter_id text not null,
  created_at timestamptz not null default now(),
  unique(comment_id, voter_id)
);

create index if not exists comment_likes_comment_idx on public.comment_likes(comment_id);

alter table public.comment_likes enable row level security;

drop policy if exists "Leitoras veem curtidas de comentarios" on public.comment_likes;
drop policy if exists "Leitoras curtem comentarios" on public.comment_likes;
drop policy if exists "Leitoras desfazem curtida de comentario" on public.comment_likes;
drop policy if exists "Luana administra curtidas de comentarios" on public.comment_likes;

create policy "Leitoras veem curtidas de comentarios" on public.comment_likes
  for select to anon, authenticated using (true);

create policy "Leitoras curtem comentarios" on public.comment_likes
  for insert to anon, authenticated
  with check (char_length(voter_id) between 10 and 100);

create policy "Leitoras desfazem curtida de comentario" on public.comment_likes
  for delete to anon, authenticated
  using (char_length(voter_id) between 10 and 100);

create policy "Luana administra curtidas de comentarios" on public.comment_likes
  for all to authenticated using (true) with check (true);
