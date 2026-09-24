create table if not exists public.site_visits (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  path text not null,
  title text,
  referrer text,
  user_agent text,
  device_type text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  created_at timestamptz not null default now()
);

create index if not exists site_visits_campaign_created_idx
  on public.site_visits(utm_campaign, created_at desc);

create index if not exists site_visits_path_created_idx
  on public.site_visits(path, created_at desc);

create table if not exists public.newsletter_conversions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  session_id text,
  path text,
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  created_at timestamptz not null default now()
);

create index if not exists newsletter_conversions_campaign_created_idx
  on public.newsletter_conversions(utm_campaign, created_at desc);

alter table public.subscribers
  add column if not exists source text,
  add column if not exists signup_path text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text;

alter table public.site_visits enable row level security;
alter table public.newsletter_conversions enable row level security;

drop policy if exists "Visitantes anonimos registram visitas" on public.site_visits;
drop policy if exists "Visitantes autenticados registram visitas" on public.site_visits;
drop policy if exists "Luana consulta visitas da campanha" on public.site_visits;
drop policy if exists "Visitantes anonimos registram conversoes" on public.newsletter_conversions;
drop policy if exists "Visitantes autenticados registram conversoes" on public.newsletter_conversions;
drop policy if exists "Luana consulta conversoes da campanha" on public.newsletter_conversions;

create policy "Visitantes anonimos registram visitas" on public.site_visits
  for insert to anon with check (true);

create policy "Visitantes autenticados registram visitas" on public.site_visits
  for insert to authenticated with check (true);

create policy "Luana consulta visitas da campanha" on public.site_visits
  for select to authenticated using (true);

create policy "Visitantes anonimos registram conversoes" on public.newsletter_conversions
  for insert to anon with check (true);

create policy "Visitantes autenticados registram conversoes" on public.newsletter_conversions
  for insert to authenticated with check (true);

create policy "Luana consulta conversoes da campanha" on public.newsletter_conversions
  for select to authenticated using (true);

comment on table public.site_visits is 'Eventos anonimos de visita para medir campanhas internas';
comment on table public.newsletter_conversions is 'Conversoes de cadastro atribuidas a campanha, pagina e origem';
