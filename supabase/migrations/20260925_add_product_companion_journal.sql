-- Liga um produto da Vitrine ao artigo "Estudei para te explicar" que a
-- IA gerou junto dele na mesma publicacao (Vitrine Magica), para a ficha
-- do produto poder linkar direto no artigo certo em vez da lista geral.

alter table public.products
  add column if not exists companion_journal_id uuid references public.journal(id) on delete set null;

create index if not exists products_companion_journal_idx on public.products (companion_journal_id);
