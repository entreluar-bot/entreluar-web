-- Permite que a Luana (usuária autenticada do painel) exclua cadastros da newsletter.
alter table public.subscribers enable row level security;

drop policy if exists "Luana exclui assinantes" on public.subscribers;
create policy "Luana exclui assinantes" on public.subscribers
  for delete to authenticated using (true);
