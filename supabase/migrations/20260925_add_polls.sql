-- Enquetes curtas dentro dos artigos (Papo de Mulher e Estudei para te
-- explicar). Um artigo tem no maximo uma enquete. Voto anonimo, uma vez por
-- navegador via um id local (nao e PII, so um uuid gerado no cliente).

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.journal(id) on delete cascade,
  question text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (journal_id)
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null,
  position int not null default 0
);

create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  voter_id text not null,
  created_at timestamptz not null default now(),
  unique (poll_id, voter_id)
);

create index if not exists poll_options_poll_idx on public.poll_options (poll_id);
create index if not exists poll_votes_poll_idx on public.poll_votes (poll_id);
create index if not exists poll_votes_option_idx on public.poll_votes (option_id);

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

drop policy if exists "Enquetes sao publicas para leitura" on public.polls;
drop policy if exists "Luana administra enquetes" on public.polls;
drop policy if exists "Opcoes de enquete sao publicas para leitura" on public.poll_options;
drop policy if exists "Luana administra opcoes de enquete" on public.poll_options;
drop policy if exists "Votos sao publicos para leitura" on public.poll_votes;
drop policy if exists "Leitoras votam" on public.poll_votes;
drop policy if exists "Luana administra votos" on public.poll_votes;

create policy "Enquetes sao publicas para leitura" on public.polls
  for select to anon, authenticated
  using (true);

create policy "Luana administra enquetes" on public.polls
  for all to authenticated
  using (true)
  with check (true);

create policy "Opcoes de enquete sao publicas para leitura" on public.poll_options
  for select to anon, authenticated
  using (true);

create policy "Luana administra opcoes de enquete" on public.poll_options
  for all to authenticated
  using (true)
  with check (true);

create policy "Votos sao publicos para leitura" on public.poll_votes
  for select to anon, authenticated
  using (true);

create policy "Leitoras votam" on public.poll_votes
  for insert to anon, authenticated
  with check (char_length(voter_id) between 10 and 100);

create policy "Luana administra votos" on public.poll_votes
  for all to authenticated
  using (true)
  with check (true);

comment on table public.polls is 'Enquete curta opcional por artigo (no maximo uma por journal_id)';
comment on table public.poll_votes is 'voter_id e um uuid gerado no navegador da leitora, sem nenhum dado pessoal';
