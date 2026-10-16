-- Origem dos comentarios (leitora real vs prova social) e trava contra prova social na Vitrine
alter table public.journal_comments
  add column if not exists origin text not null default 'reader'
  check (origin in ('reader', 'social_proof'));

-- Marca retroativamente os comentarios gerados pela prova social (aprovados no exato instante da criacao)
update public.journal_comments
set origin = 'social_proof'
where journal_id is not null
  and product_id is null
  and status = 'approved'
  and approved_at is not null
  and abs(extract(epoch from (approved_at - created_at))) < 2;

-- Garante no banco que a Vitrine (product_id) nunca receba prova social
alter table public.journal_comments
  drop constraint if exists journal_comments_no_product_social_proof_check;

alter table public.journal_comments
  add constraint journal_comments_no_product_social_proof_check
  check (origin <> 'social_proof' or product_id is null);

comment on column public.journal_comments.origin is 'Origem do comentario: reader (leitora real) ou social_proof (gerado para o Diario)';
