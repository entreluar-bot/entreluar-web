-- Ciclo de vida da base de leitoras. A origem inicial não muda quando a pessoa
-- volta a se cadastrar por outro ponto do site.
alter table public.subscribers
  add column if not exists initial_source text,
  add column if not exists last_source text,
  add column if not exists subscribed_at timestamptz,
  add column if not exists reactivated_at timestamptz,
  add column if not exists welcome_sent_at timestamptz,
  add column if not exists welcome_status text not null default 'pending';

update public.subscribers
set initial_source = coalesce(initial_source, source, 'site'),
    last_source = coalesce(last_source, source, initial_source, 'site'),
    subscribed_at = coalesce(subscribed_at, now()),
    welcome_status = case when welcome_sent_at is not null then 'sent' else coalesce(welcome_status, 'pending') end;

create index if not exists subscribers_initial_source_idx on public.subscribers(initial_source);

create table if not exists public.publication_email_automations (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('journal', 'product')),
  content_id uuid not null,
  subject text not null,
  preheader text not null,
  headline text not null,
  body_html text not null,
  cta_text text not null,
  cta_url text not null,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'partial', 'failed')),
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (content_type, content_id)
);

create table if not exists public.publication_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.publication_email_automations(id) on delete cascade,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  provider_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (automation_id, email)
);

create index if not exists publication_email_automations_created_idx on public.publication_email_automations(created_at desc);
create index if not exists publication_email_deliveries_status_idx on public.publication_email_deliveries(automation_id, status);

alter table public.publication_email_automations enable row level security;
alter table public.publication_email_deliveries enable row level security;

drop policy if exists "Administradores consultam automacoes de email" on public.publication_email_automations;
create policy "Administradores consultam automacoes de email" on public.publication_email_automations
  for select to authenticated using (public.is_admin());

drop policy if exists "Administradores consultam entregas de automacao" on public.publication_email_deliveries;
create policy "Administradores consultam entregas de automacao" on public.publication_email_deliveries
  for select to authenticated using (public.is_admin());
