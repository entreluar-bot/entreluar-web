-- Sistema de tags para navegacao por tema/necessidade, busca e "Estudei para
-- te explicar" por ativo/queixa. Camada aditiva: nao altera journal/products.

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  type text not null check (type in ('concern', 'ingredient', 'life_topic', 'category')),
  created_at timestamptz not null default now()
);

create table if not exists public.content_tags (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references public.tags(id) on delete cascade,
  content_type text not null check (content_type in ('journal', 'product')),
  content_id uuid not null,
  created_at timestamptz not null default now(),
  unique (tag_id, content_type, content_id)
);

create index if not exists content_tags_content_idx on public.content_tags (content_type, content_id);
create index if not exists content_tags_tag_idx on public.content_tags (tag_id);

alter table public.tags enable row level security;
alter table public.content_tags enable row level security;

drop policy if exists "Tags sao publicas para leitura" on public.tags;
drop policy if exists "Luana administra tags" on public.tags;
drop policy if exists "Vinculos de tag sao publicos para leitura" on public.content_tags;
drop policy if exists "Luana administra vinculos de tag" on public.content_tags;

create policy "Tags sao publicas para leitura" on public.tags
  for select to anon, authenticated
  using (true);

create policy "Luana administra tags" on public.tags
  for all to authenticated
  using (true)
  with check (true);

create policy "Vinculos de tag sao publicos para leitura" on public.content_tags
  for select to anon, authenticated
  using (true);

create policy "Luana administra vinculos de tag" on public.content_tags
  for all to authenticated
  using (true)
  with check (true);

comment on table public.tags is 'Vocabulario de tags (queixa/ativo/vida 50+/categoria) para navegacao por tema e busca';
comment on table public.content_tags is 'Vinculo muitos-para-muitos entre tags e conteudo existente (journal/products)';

-- Seed inicial do vocabulario descrito pela Luana, para o admin ja ter
-- opcoes prontas no dia 1. Vinculo a conteudo existente e trabalho editorial
-- manual feito depois, pelo painel.
insert into public.tags (name, slug, type) values
  ('Firmeza', 'firmeza', 'concern'),
  ('Hidratação', 'hidratacao', 'concern'),
  ('Manchas', 'manchas', 'concern'),
  ('Linhas e rugas', 'linhas-e-rugas', 'concern'),
  ('Olheiras', 'olheiras', 'concern'),
  ('Sensibilidade', 'sensibilidade', 'concern'),
  ('Textura', 'textura', 'concern'),
  ('Proteção solar', 'protecao-solar', 'concern'),
  ('Queda', 'queda', 'concern'),
  ('Afinamento', 'afinamento', 'concern'),
  ('Ressecamento', 'ressecamento', 'concern'),
  ('Fios brancos', 'fios-brancos', 'concern'),
  ('Crescimento', 'crescimento', 'concern'),
  ('Couro cabeludo', 'couro-cabeludo', 'concern'),
  ('Sono', 'sono', 'life_topic'),
  ('Fogachos', 'fogachos', 'life_topic'),
  ('Libido', 'libido', 'life_topic'),
  ('Humor', 'humor', 'life_topic'),
  ('Energia', 'energia', 'life_topic'),
  ('Corpo', 'corpo', 'life_topic'),
  ('Relacionamentos', 'relacionamentos', 'life_topic'),
  ('Autocuidado', 'autocuidado', 'life_topic'),
  ('Recomeços', 'recomecos', 'life_topic'),
  ('Trabalho', 'trabalho', 'life_topic'),
  ('Comportamento', 'comportamento', 'life_topic'),
  ('Vida real', 'vida-real', 'life_topic'),
  ('Retinal', 'retinal', 'ingredient'),
  ('Retinol', 'retinol', 'ingredient'),
  ('Peptídeos', 'peptideos', 'ingredient'),
  ('Ceramidas', 'ceramidas', 'ingredient'),
  ('Vitamina C', 'vitamina-c', 'ingredient'),
  ('Niacinamida', 'niacinamida', 'ingredient'),
  ('Ácido hialurônico', 'acido-hialuronico', 'ingredient'),
  ('NAD+', 'nad-plus', 'ingredient')
on conflict (slug) do nothing;
