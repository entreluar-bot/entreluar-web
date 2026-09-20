alter table public.products
  add column if not exists is_featured boolean not null default false,
  add column if not exists is_most_purchased boolean not null default false,
  add column if not exists is_most_viewed boolean not null default false;

comment on column public.products.is_featured is 'Classificação editorial manual: produto em destaque';
comment on column public.products.is_most_purchased is 'Classificação editorial manual: produto mais comprado';
comment on column public.products.is_most_viewed is 'Classificação editorial manual: produto mais visto';
