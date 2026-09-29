create table if not exists public.journal_reactions (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.journal(id) on delete cascade,
  voter_id text not null,
  reaction text not null check (reaction in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(journal_id, voter_id)
);

create index if not exists journal_reactions_journal_idx
  on public.journal_reactions(journal_id, reaction);

alter table public.journal_reactions enable row level security;

drop policy if exists "Leitoras veem reacoes" on public.journal_reactions;
drop policy if exists "Leitoras reagem" on public.journal_reactions;
drop policy if exists "Leitoras atualizam a propria reacao" on public.journal_reactions;
drop policy if exists "Leitoras desfazem a propria reacao" on public.journal_reactions;
drop policy if exists "Luana administra reacoes" on public.journal_reactions;

create policy "Leitoras veem reacoes" on public.journal_reactions
  for select to anon, authenticated
  using (true);

create policy "Leitoras reagem" on public.journal_reactions
  for insert to anon, authenticated
  with check (char_length(voter_id) between 10 and 100);

create policy "Leitoras atualizam a propria reacao" on public.journal_reactions
  for update to anon, authenticated
  using (char_length(voter_id) between 10 and 100)
  with check (char_length(voter_id) between 10 and 100);

create policy "Leitoras desfazem a propria reacao" on public.journal_reactions
  for delete to anon, authenticated
  using (char_length(voter_id) between 10 and 100);

create policy "Luana administra reacoes" on public.journal_reactions
  for all to authenticated
  using (true)
  with check (true);

comment on table public.journal_reactions is 'Curti/nao curti anonimo por leitora, um por journal_id+voter_id';
