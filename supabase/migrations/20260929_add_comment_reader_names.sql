alter table public.journal_comments
  add column if not exists reader_name text;

alter table public.journal_comments
  add column if not exists hide_reader_name boolean not null default false;

with ranked_comments as (
  select
    id,
    nullif(initcap(split_part(regexp_replace(split_part(email, '@', 1), '[._+\-]+', ' ', 'g'), ' ', 1)), '') as derived_name,
    ((row_number() over (order by created_at, id) - 1) % 10) as bucket
  from public.journal_comments
  where reader_name is null
)
update public.journal_comments comments
set
  reader_name = case when ranked_comments.bucket < 7 then ranked_comments.derived_name else null end,
  hide_reader_name = ranked_comments.bucket >= 7
from ranked_comments
where comments.id = ranked_comments.id;

drop policy if exists "Leitoras enviam comentarios pendentes" on public.journal_comments;

create policy "Leitoras enviam comentarios pendentes" on public.journal_comments
  for insert to anon, authenticated
  with check (
    status = 'pending'
    and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    and char_length(email) <= 180
    and char_length(body) between 8 and 1200
    and (reader_name is null or char_length(reader_name) <= 80)
  );

comment on column public.journal_comments.reader_name is 'Nome informado ou editorial da leitora; o site exibe apenas o primeiro nome quando hide_reader_name e falso';
comment on column public.journal_comments.hide_reader_name is 'Quando verdadeiro, a assinatura publica do comentario aparece como Anonimo';
