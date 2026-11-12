-- Perfis de acesso ao ateliê. A autenticação continua sendo feita pelo Supabase Auth;
-- esta tabela define quem pode usar o painel administrativo.
create table if not exists public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'admin' check (role in ('admin')),
  force_password_change boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.protect_admin_profile()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id is distinct from old.id or new.email is distinct from old.email or new.role is distinct from old.role then
    raise exception 'Os dados de identificação do administrador não podem ser alterados.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_admin_profile_fields on public.admin_profiles;
create trigger protect_admin_profile_fields
before update on public.admin_profiles
for each row execute function public.protect_admin_profile();

alter table public.admin_profiles enable row level security;

create or replace function public.is_admin(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.admin_profiles where id = user_id);
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to anon, authenticated;

drop policy if exists "Administrador consulta o próprio perfil" on public.admin_profiles;
create policy "Administrador consulta o próprio perfil"
  on public.admin_profiles for select to authenticated
  using (id = auth.uid());

drop policy if exists "Administrador confirma troca de senha" on public.admin_profiles;
create policy "Administrador confirma troca de senha"
  on public.admin_profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- A primeira usuária é criada em Authentication > Users, fora do repositório,
-- para que nenhuma senha seja armazenada no Git. Se ela já existir quando esta
-- migração rodar, seu perfil administrativo é criado automaticamente.
insert into public.admin_profiles (id, email, force_password_change)
select id, email, true
from auth.users
where lower(email) = 'candyfp0306@gmail.com'
on conflict (id) do update set email = excluded.email;
