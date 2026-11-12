-- Pausa administrativa: conserva o cadastro e o histórico, mas exclui a leitora
-- de todos os disparos até que o painel a reative.
alter table public.subscribers
  add column if not exists email_paused_at timestamptz;

create index if not exists subscribers_email_paused_idx
  on public.subscribers(email_paused_at)
  where email_paused_at is not null;
