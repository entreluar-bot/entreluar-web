-- Metadados editoriais para filtros inteligentes e busca: a classificacao
-- estruturada continua em tags/content_tags; palavras livres cobrem sinonimos
-- e formas reais de pesquisa sem poluir os filtros visiveis.

alter table public.tags drop constraint if exists tags_type_check;
alter table public.tags add constraint tags_type_check
  check (type in ('concern', 'ingredient', 'life_topic', 'category', 'routine_phase', 'routine_period', 'skin_type', 'origin', 'body_part'));

insert into public.tags (name, slug, type) values
  ('Pescoço e colo', 'pescoco-e-colo', 'body_part'),
  ('Lábios', 'labios', 'body_part'),
  ('Couro cabeludo', 'couro-cabeludo', 'body_part'),
  ('Braços', 'bracos', 'body_part'),
  ('Barriga', 'barriga', 'body_part')
on conflict (slug) do nothing;

alter table public.products add column if not exists search_keywords text[] not null default '{}';
alter table public.journal add column if not exists search_keywords text[] not null default '{}';

create index if not exists products_search_keywords_idx on public.products using gin (search_keywords);
create index if not exists journal_search_keywords_idx on public.journal using gin (search_keywords);

comment on column public.products.search_keywords is 'Sinônimos e termos livres revisados pela Luana para busca pública.';
comment on column public.journal.search_keywords is 'Sinônimos e termos livres revisados pela Luana para busca pública.';
