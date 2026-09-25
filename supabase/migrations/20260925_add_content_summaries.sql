-- "Em 30 segundos": resumo rapido para produtos da Vitrine e artigos de
-- "Estudei para te explicar". Tabela lateral (mesmo padrao de content_tags),
-- gerada por IA a partir do texto ja publicado ou preenchida manualmente.

create table if not exists public.content_summaries (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('journal', 'product')),
  content_id uuid not null,
  what_is text,
  used_for text,
  noticed text,
  pro text,
  caution text,
  repurchase text,
  duration text,
  generated_by text not null default 'manual' check (generated_by in ('manual', 'ai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_type, content_id)
);

create index if not exists content_summaries_content_idx on public.content_summaries (content_type, content_id);

alter table public.content_summaries enable row level security;

drop policy if exists "Resumos sao publicos para leitura" on public.content_summaries;
drop policy if exists "Luana administra resumos" on public.content_summaries;

create policy "Resumos sao publicos para leitura" on public.content_summaries
  for select to anon, authenticated
  using (true);

create policy "Luana administra resumos" on public.content_summaries
  for all to authenticated
  using (true)
  with check (true);

comment on table public.content_summaries is '"Em 30 segundos": resumo rapido por produto/artigo, gerado por IA ou manual';
