create table if not exists public.luana_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('identidade', 'rotina', 'experiencia', 'opiniao', 'linguagem', 'limite')),
  content text not null check (char_length(content) between 3 and 1200),
  tags text[] not null default '{}',
  privacy text not null default 'editorial' check (privacy in ('publica', 'editorial', 'privada')),
  status text not null default 'aprovada' check (status in ('sugerida', 'aprovada', 'arquivada')),
  allow_in_content boolean not null default false,
  valid_until timestamptz,
  use_count integer not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists luana_memories_user_status_idx on public.luana_memories(user_id, status);
create index if not exists luana_memories_tags_idx on public.luana_memories using gin(tags);

create table if not exists public.ai_generation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null,
  topic text,
  opening_style text,
  structure_style text,
  closing_style text,
  title text,
  notable_phrases text[] not null default '{}',
  memory_ids uuid[] not null default '{}',
  source_count integer not null default 0,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  search_queries integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ai_generation_history_recent_idx on public.ai_generation_history(user_id, content_type, created_at desc);

create table if not exists public.ai_research_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cache_key text not null,
  subject text not null,
  summary text not null,
  sources jsonb not null default '[]'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, cache_key)
);

alter table public.luana_memories enable row level security;
alter table public.ai_generation_history enable row level security;
alter table public.ai_research_cache enable row level security;

create policy "Luana administra as próprias memórias" on public.luana_memories
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Luana acessa o próprio histórico editorial" on public.ai_generation_history
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Luana acessa o próprio cache de pesquisa" on public.ai_research_cache
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

comment on table public.luana_memories is 'Memórias aprovadas ou sugeridas que formam a identidade editorial da Luana';
comment on table public.ai_generation_history is 'Metadados compactos para reduzir repetição sem reenviar textos inteiros';
comment on table public.ai_research_cache is 'Resumos temporários de pesquisas para evitar buscas e tokens repetidos';
