alter table public.journal
  add column if not exists is_featured boolean not null default false,
  add column if not exists is_most_viewed boolean not null default false,
  add column if not exists is_new boolean not null default true;

alter table public.products
  add column if not exists is_new boolean not null default true;

comment on column public.journal.is_featured is 'Classificação editorial manual: artigo em destaque';
comment on column public.journal.is_most_viewed is 'Classificação editorial manual: artigo mais lido/visto';
comment on column public.journal.is_new is 'Classificação editorial automática/manual: artigo novo';

comment on column public.products.is_new is 'Classificação editorial automática/manual: produto novo';
