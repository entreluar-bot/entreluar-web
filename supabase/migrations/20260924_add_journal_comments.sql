create table if not exists public.journal_comments (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.journal(id) on delete cascade,
  email text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  source_path text,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  moderated_at timestamptz
);

create index if not exists journal_comments_post_status_created_idx
  on public.journal_comments(journal_id, status, created_at desc);

create index if not exists journal_comments_status_created_idx
  on public.journal_comments(status, created_at desc);

alter table public.journal_comments enable row level security;

drop policy if exists "Leitoras enviam comentarios pendentes" on public.journal_comments;
drop policy if exists "Leitoras veem comentarios aprovados" on public.journal_comments;
drop policy if exists "Luana administra comentarios" on public.journal_comments;

create policy "Leitoras enviam comentarios pendentes" on public.journal_comments
  for insert to anon, authenticated
  with check (
    status = 'pending'
    and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    and char_length(email) <= 180
    and char_length(body) between 8 and 1200
  );

create policy "Leitoras veem comentarios aprovados" on public.journal_comments
  for select to anon, authenticated
  using (status = 'approved');

create policy "Luana administra comentarios" on public.journal_comments
  for all to authenticated
  using (true)
  with check (true);

comment on table public.journal_comments is 'Roda de conversa moderada dos posts Papo de Mulher';
