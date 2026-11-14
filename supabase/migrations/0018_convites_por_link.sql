-- 0018: convite por link
--
-- O que faz: cria a tabela de convites. O admin gera um link, manda no privado,
-- e a pessoa usa esse link para criar a própria senha. Substitui o vai e vem da
-- senha temporária por WhatsApp.
--
-- Segurança, ponto a ponto:
--   * A tabela guarda só o HASH (SHA-256) do token, nunca o token. Se o banco
--     vazar, os links que estiverem lá não servem para entrar.
--   * Todo convite tem prazo (expira_em), vale uma vez só (usado_em) e pode ser
--     cancelado pelo admin (revogado_em).
--   * RLS liberada SOMENTE para admin. O app público nunca lê nem escreve aqui:
--     quem valida e consome o convite é a Edge Function "admin-membros", com a
--     service_role key, que não fica no app.
--   * Nenhuma permissão existente é alterada e nenhum dado é apagado.
--
-- Risco: baixo. Só cria tabela, índices e policies novas. Pode rodar com o app
-- no ar; sem ela, o app continua criando acesso por senha temporária.
--
-- Para desfazer:
--   drop table if exists public.convites;

create table if not exists public.convites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  nome text not null,
  email text not null,
  criado_por uuid references public.perfis(id) on delete set null,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  usado_em timestamptz,
  usado_por uuid references public.perfis(id) on delete set null,
  revogado_em timestamptz
);

comment on table public.convites is
  'Convites por link. Guarda apenas o hash SHA-256 do token; o link completo só existe no momento em que o admin o gera.';
comment on column public.convites.token_hash is 'SHA-256 do token, em hexadecimal minúsculo.';
comment on column public.convites.expira_em is 'Depois desta data o link não vale mais, mesmo sem ter sido usado.';

create index if not exists idx_convites_email on public.convites (lower(email));
create index if not exists idx_convites_abertos on public.convites (expira_em) where usado_em is null and revogado_em is null;

alter table public.convites enable row level security;

-- Só o admin enxerga e mexe. A Edge Function usa service_role e passa por fora
-- da RLS, que é justamente o que permite a página pública do convite funcionar
-- sem dar acesso direto à tabela para ninguém.
drop policy if exists "convites_select_admin" on public.convites;
create policy "convites_select_admin" on public.convites
  for select to authenticated using (public.eh_admin(auth.uid()));

drop policy if exists "convites_insert_admin" on public.convites;
create policy "convites_insert_admin" on public.convites
  for insert to authenticated with check (public.eh_admin(auth.uid()));

drop policy if exists "convites_update_admin" on public.convites;
create policy "convites_update_admin" on public.convites
  for update to authenticated using (public.eh_admin(auth.uid()));

drop policy if exists "convites_delete_admin" on public.convites;
create policy "convites_delete_admin" on public.convites
  for delete to authenticated using (public.eh_admin(auth.uid()));

revoke all on public.convites from anon;
