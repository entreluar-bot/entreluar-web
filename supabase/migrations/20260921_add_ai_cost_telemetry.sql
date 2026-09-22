alter table public.ai_generation_history
  add column if not exists model text not null default '',
  add column if not exists thought_tokens integer not null default 0,
  add column if not exists tool_tokens integer not null default 0,
  add column if not exists total_tokens integer not null default 0,
  add column if not exists duration_ms integer not null default 0,
  add column if not exists estimated_cost_usd numeric(14,8) not null default 0,
  add column if not exists estimated_cost_brl numeric(14,8) not null default 0,
  add column if not exists cache_hit boolean not null default false,
  add column if not exists retry_count integer not null default 0,
  add column if not exists request_id text,
  add column if not exists status text not null default 'success',
  add column if not exists stage_timings jsonb not null default '{}'::jsonb;

create index if not exists ai_generation_history_cost_period_idx
  on public.ai_generation_history(user_id, created_at desc);

create table if not exists public.ai_response_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_hash text not null,
  response jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(user_id, request_hash)
);

alter table public.ai_response_cache enable row level security;
create policy "Luana acessa o próprio cache de respostas" on public.ai_response_cache
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
