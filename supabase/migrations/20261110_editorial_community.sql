-- Entreluar deixa de classificar tudo pela origem comercial: os pilares
-- editoriais coexistem com as categorias legadas para preservar URLs e filtros.
alter table public.journal
  add column if not exists editorial_pillar text,
  add column if not exists editorial_topic text,
  add column if not exists last_reviewed_at timestamptz;

update public.journal
set editorial_pillar = case
  when category = 'Estudei para te explicar' then 'te-explico'
  else 'papo'
end
where editorial_pillar is null;

alter table public.journal
  drop constraint if exists journal_editorial_pillar_check;
alter table public.journal
  add constraint journal_editorial_pillar_check
  check (editorial_pillar is null or editorial_pillar in ('papo', 'te-explico', 'achado'));

create table if not exists public.journal_sources (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.journal(id) on delete cascade,
  title text not null,
  url text not null,
  source_type text,
  accessed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists journal_sources_journal_idx on public.journal_sources(journal_id);
alter table public.journal_sources enable row level security;

drop policy if exists "Fontes sao publicas para leitura" on public.journal_sources;
drop policy if exists "Luana administra fontes" on public.journal_sources;
create policy "Fontes sao publicas para leitura" on public.journal_sources for select to anon, authenticated using (true);
create policy "Luana administra fontes" on public.journal_sources for all to authenticated using (true) with check (true);

comment on table public.journal_sources is 'Referências revisadas pela Luana para artigos do pilar Te Explico.';
