alter table public.journal_comments
  alter column journal_id drop not null;

alter table public.journal_comments
  add column if not exists product_id uuid references public.products(id) on delete cascade;

alter table public.journal_comments
  drop constraint if exists journal_comments_one_target_check;

alter table public.journal_comments
  add constraint journal_comments_one_target_check
  check (
    (journal_id is not null and product_id is null)
    or (journal_id is null and product_id is not null)
  );

create index if not exists journal_comments_product_status_created_idx
  on public.journal_comments(product_id, status, created_at desc);

comment on table public.journal_comments is 'Roda de conversa moderada dos posts Papo/Estudei e dos produtos da Vitrine';
comment on column public.journal_comments.product_id is 'Preenchido quando o comentario e sobre um produto da Vitrine (journal_id fica nulo nesse caso)';
