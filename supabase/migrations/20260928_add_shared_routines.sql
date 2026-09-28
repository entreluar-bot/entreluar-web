-- Link publico e clonavel da "Monte sua Rotina" (ver src/lib/routine.ts).
-- Sem login de usuaria final: qualquer visitante pode gerar um snapshot da
-- rotina que montou (client-side) para compartilhar, e qualquer visitante
-- pode ler esse snapshot pelo codigo para "usar essa rotina tambem" -- o
-- mesmo espirito de escrita/leitura anonima ja usado em journal_comments e
-- poll_votes.
--
-- view_count/clone_count ficam com default 0 e sao incrementados so pelo
-- admin por enquanto (nao ha policy de update para anon nesta migration) --
-- o contador social e uma melhoria de Fase 2, nao bloqueia o lancamento.

create table if not exists public.shared_routines (
  id uuid primary key default gen_random_uuid(),
  share_code text not null unique,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  view_count integer not null default 0,
  clone_count integer not null default 0
);

create index if not exists shared_routines_share_code_idx on public.shared_routines (share_code);

alter table public.shared_routines enable row level security;

drop policy if exists "Leitoras publicam sua rotina" on public.shared_routines;
drop policy if exists "Rotinas compartilhadas sao publicas para leitura" on public.shared_routines;
drop policy if exists "Luana administra rotinas compartilhadas" on public.shared_routines;

create policy "Leitoras publicam sua rotina" on public.shared_routines
  for insert to anon, authenticated
  with check (
    share_code ~ '^[a-z0-9-]{6,40}$'
    and pg_column_size(snapshot) < 20000
  );

create policy "Rotinas compartilhadas sao publicas para leitura" on public.shared_routines
  for select to anon, authenticated
  using (true);

create policy "Luana administra rotinas compartilhadas" on public.shared_routines
  for all to authenticated
  using (true)
  with check (true);

comment on table public.shared_routines is 'Snapshot publico e clonavel de uma rotina montada em /minha-rotina, sem exigir conta';
comment on column public.shared_routines.snapshot is 'Routine completa (manha/noite, order, produtos, notas, meta dos criterios usados na geracao automatica)';
