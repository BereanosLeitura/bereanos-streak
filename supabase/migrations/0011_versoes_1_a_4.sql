-- 0011: base de dados das versões 1 a 4.

-- ---------------------------------------------------------------------------
-- Segurança: um membro não pode se promover a admin editando o próprio perfil.
-- (A policy perfis_update_proprio libera a linha inteira; este gatilho protege
-- a coluna role.)
-- ---------------------------------------------------------------------------
create or replace function public.eh_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = uid and role = 'admin')
$$;

create or replace function public.proteger_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.eh_admin(auth.uid()) then
    raise exception 'Somente o admin pode mudar o papel de um membro';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_proteger_role on public.perfis;
create trigger trg_proteger_role before update on public.perfis
  for each row execute function public.proteger_role();

-- ---------------------------------------------------------------------------
-- V1: leitura sem contagem. Padrão do clube (definido pelo admin) e escolha
-- pessoal (null = seguir o padrão do clube).
-- ---------------------------------------------------------------------------
create table if not exists public.config_clube (
  id integer primary key default 1 check (id = 1),
  contagem_padrao boolean not null default false,
  atualizado_em timestamptz not null default now()
);
insert into public.config_clube (id) values (1) on conflict (id) do nothing;
alter table public.config_clube enable row level security;
create policy "config_select" on public.config_clube for select to authenticated using (true);
create policy "config_update_admin" on public.config_clube for update to authenticated using (public.eh_admin(auth.uid()));

alter table public.perfis add column if not exists mostrar_contagem boolean;

-- ---------------------------------------------------------------------------
-- V2: Aplicar e referência bíblica nas anotações.
-- ---------------------------------------------------------------------------
alter table public.anotacoes drop constraint if exists anotacoes_tipo_check;
alter table public.anotacoes add constraint anotacoes_tipo_check
  check (tipo in ('trecho', 'reflexao', 'pergunta', 'aplicacao'));
alter table public.anotacoes add column if not exists referencia text
  check (referencia is null or char_length(referencia) <= 80);

-- V2: respostas no mural.
create table if not exists public.respostas_mural (
  id uuid primary key default gen_random_uuid(),
  anotacao_id uuid not null references public.anotacoes(id) on delete cascade,
  membro_id uuid not null references public.perfis(id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists respostas_anotacao_idx on public.respostas_mural (anotacao_id, created_at);
alter table public.respostas_mural enable row level security;
create policy "respostas_select" on public.respostas_mural for select to authenticated
  using (exists (select 1 from public.anotacoes a where a.id = anotacao_id and (a.compartilhada or a.membro_id = auth.uid())));
create policy "respostas_insert" on public.respostas_mural for insert to authenticated
  with check (membro_id = auth.uid() and exists (select 1 from public.anotacoes a where a.id = anotacao_id and a.compartilhada));
create policy "respostas_delete" on public.respostas_mural for delete to authenticated
  using (membro_id = auth.uid() or public.eh_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- V3: encontros (roteiro, ata, presença).
-- ---------------------------------------------------------------------------
create table if not exists public.encontros (
  id uuid primary key default gen_random_uuid(),
  livro_id uuid not null references public.livros(id) on delete cascade,
  data timestamptz not null,
  local text check (local is null or char_length(local) <= 120),
  mediador text check (mediador is null or char_length(mediador) <= 80),
  anotador_id uuid references public.perfis(id) on delete set null,
  roteiro jsonb not null default '[]'::jsonb,
  perguntas_discutidas jsonb not null default '[]'::jsonb,
  ata text check (ata is null or char_length(ata) <= 10000),
  created_by uuid references public.perfis(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists encontros_livro_idx on public.encontros (livro_id, data desc);
alter table public.encontros enable row level security;
create policy "encontros_select" on public.encontros for select to authenticated using (true);
create policy "encontros_insert_admin" on public.encontros for insert to authenticated with check (public.eh_admin(auth.uid()));
create policy "encontros_update" on public.encontros for update to authenticated
  using (public.eh_admin(auth.uid()) or anotador_id = auth.uid());
create policy "encontros_delete_admin" on public.encontros for delete to authenticated using (public.eh_admin(auth.uid()));

create table if not exists public.presencas (
  encontro_id uuid not null references public.encontros(id) on delete cascade,
  membro_id uuid not null references public.perfis(id) on delete cascade,
  primary key (encontro_id, membro_id)
);
alter table public.presencas enable row level security;
create policy "presencas_select" on public.presencas for select to authenticated using (true);
create policy "presencas_insert" on public.presencas for insert to authenticated
  with check (public.eh_admin(auth.uid()) or exists (select 1 from public.encontros e where e.id = encontro_id and e.anotador_id = auth.uid()));
create policy "presencas_delete" on public.presencas for delete to authenticated
  using (public.eh_admin(auth.uid()) or exists (select 1 from public.encontros e where e.id = encontro_id and e.anotador_id = auth.uid()));

-- V3: indicações de livros e sorteio registrado.
create table if not exists public.indicacoes (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null references public.perfis(id) on delete cascade,
  titulo text not null check (char_length(titulo) between 1 and 200),
  autor text check (autor is null or char_length(autor) <= 120),
  motivo text check (motivo is null or char_length(motivo) <= 500),
  status text not null default 'aberta' check (status in ('aberta', 'sorteada', 'lida')),
  created_at timestamptz not null default now()
);
alter table public.indicacoes enable row level security;
create policy "indicacoes_select" on public.indicacoes for select to authenticated using (true);
create policy "indicacoes_insert" on public.indicacoes for insert to authenticated with check (membro_id = auth.uid());
create policy "indicacoes_update_admin" on public.indicacoes for update to authenticated using (public.eh_admin(auth.uid()));
create policy "indicacoes_delete" on public.indicacoes for delete to authenticated
  using (membro_id = auth.uid() or public.eh_admin(auth.uid()));

create table if not exists public.sorteios (
  id uuid primary key default gen_random_uuid(),
  indicacao_id uuid references public.indicacoes(id) on delete set null,
  titulo text not null,
  participantes integer not null,
  realizado_por uuid references public.perfis(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.sorteios enable row level security;
create policy "sorteios_select" on public.sorteios for select to authenticated using (true);

-- O sorteio acontece no servidor e fica registrado para todos verem.
create or replace function public.sortear_indicacao()
returns public.sorteios language plpgsql security definer set search_path = public as $$
declare
  v_ind public.indicacoes;
  v_total integer;
  v_res public.sorteios;
begin
  if not public.eh_admin(auth.uid()) then
    raise exception 'Somente o admin pode realizar o sorteio';
  end if;
  select count(*) into v_total from public.indicacoes where status = 'aberta';
  if v_total = 0 then
    raise exception 'Não há indicações abertas para sortear';
  end if;
  select * into v_ind from public.indicacoes where status = 'aberta' order by random() limit 1;
  update public.indicacoes set status = 'sorteada' where id = v_ind.id;
  insert into public.sorteios (indicacao_id, titulo, participantes, realizado_por)
  values (v_ind.id, v_ind.titulo || coalesce(', ' || v_ind.autor, ''), v_total, auth.uid())
  returning * into v_res;
  return v_res;
end;
$$;
revoke all on function public.sortear_indicacao() from public, anon;
grant execute on function public.sortear_indicacao() to authenticated;

-- ---------------------------------------------------------------------------
-- V4: destaques do clube (trechos do mural escolhidos pelo admin).
-- ---------------------------------------------------------------------------
create table if not exists public.destaques (
  anotacao_id uuid primary key references public.anotacoes(id) on delete cascade,
  created_by uuid references public.perfis(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.destaques enable row level security;
create policy "destaques_select" on public.destaques for select to authenticated using (true);
create policy "destaques_insert_admin" on public.destaques for insert to authenticated
  with check (public.eh_admin(auth.uid()) and exists (select 1 from public.anotacoes a where a.id = anotacao_id and a.compartilhada));
create policy "destaques_delete_admin" on public.destaques for delete to authenticated using (public.eh_admin(auth.uid()));
