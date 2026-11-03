-- Bereanos | Streak — schema inicial
-- Rodar com: supabase db push (depois de supabase link --project-ref <ref>)

-- extensão para gen_random_uuid()
create extension if not exists pgcrypto;

-- ========== TABELAS ==========

create table public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome_completo text not null,
  nome_exibicao text not null,
  data_nascimento date,
  avatar_url text,
  role text not null default 'membro' check (role in ('admin','membro')),
  tema_preferido text not null default 'sistema' check (tema_preferido in ('claro','escuro','sistema')),
  ritmo_leitura_min_por_pagina numeric(6,2) not null default 2,
  senha_temporaria boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.perfis is 'Perfil de cada membro. id = auth.users.id. role admin só você.';
comment on column public.perfis.senha_temporaria is 'true até o membro trocar a senha enviada por WhatsApp no primeiro login.';

create table public.livros (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  autor text,
  capa_url text,
  paginas_totais integer not null,
  fonte_capa text not null default 'manual' check (fonte_capa in ('manual','api')),
  ciclo_inicio date,
  ciclo_fim date,
  status text not null default 'ativo' check (status in ('ativo','concluido')),
  created_by uuid references public.perfis(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.registros_leitura (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null references public.perfis(id) on delete cascade,
  livro_id uuid not null references public.livros(id) on delete cascade,
  origem text not null check (origem in ('pomodoro','manual')),
  paginas_lidas integer,
  minutos_lidos integer,
  registrado_em timestamptz not null default now()
);
comment on table public.registros_leitura is 'Todo registro de leitura, manual ou vindo de pomodoro concluído. Base para progresso e conquistas.';

create table public.sessoes_pomodoro (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null references public.perfis(id) on delete cascade,
  livro_id uuid not null references public.livros(id) on delete cascade,
  inicio timestamptz not null,
  fim timestamptz,
  duracao_minutos integer,
  status text not null default 'em_andamento' check (status in ('em_andamento','concluida','cancelada'))
);
comment on column public.sessoes_pomodoro.inicio is 'Timestamp de início. O cliente recalcula o progresso por este valor, nunca por um timer rodando em memória — garante funcionamento com o app fechado.';

create table public.metas (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null references public.perfis(id) on delete cascade,
  livro_id uuid not null references public.livros(id) on delete cascade,
  tipo text not null check (tipo in ('semanal','mensal','livro_total','sessoes_semanais','dias_semanais')),
  valor_paginas integer,
  valor_sessoes integer,
  valor_dias integer,
  periodo_inicio date,
  periodo_fim date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.metas is 'tipo define qual campo de valor é usado: semanal/mensal/livro_total usam valor_paginas, sessoes_semanais usa valor_sessoes, dias_semanais usa valor_dias.';

create table public.conquistas (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  nome text not null,
  descricao text,
  icone text
);

create table public.membro_conquistas (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null references public.perfis(id) on delete cascade,
  conquista_id uuid not null references public.conquistas(id) on delete cascade,
  livro_id uuid references public.livros(id),
  conquistado_em timestamptz not null default now(),
  unique (membro_id, conquista_id, livro_id)
);

-- ========== updated_at automático ==========

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_perfis_updated_at before update on public.perfis
  for each row execute function public.set_updated_at();
create trigger trg_livros_updated_at before update on public.livros
  for each row execute function public.set_updated_at();
create trigger trg_metas_updated_at before update on public.metas
  for each row execute function public.set_updated_at();

-- ========== RLS ==========
-- Progresso é coletivo por design (todo mundo vê o progresso de todos),
-- então SELECT é aberto a qualquer membro autenticado nas tabelas de progresso.
-- Escrita é sempre restrita ao próprio registro, exceto onde só o admin pode.

alter table public.perfis enable row level security;
alter table public.livros enable row level security;
alter table public.registros_leitura enable row level security;
alter table public.sessoes_pomodoro enable row level security;
alter table public.metas enable row level security;
alter table public.conquistas enable row level security;
alter table public.membro_conquistas enable row level security;

-- perfis
create policy "perfis_select_autenticados" on public.perfis
  for select to authenticated using (true);
create policy "perfis_update_proprio" on public.perfis
  for update to authenticated using (auth.uid() = id);

-- livros (leitura livre, escrita só admin)
create policy "livros_select_autenticados" on public.livros
  for select to authenticated using (true);
create policy "livros_insert_admin" on public.livros
  for insert to authenticated
  with check (exists (select 1 from public.perfis where id = auth.uid() and role = 'admin'));
create policy "livros_update_admin" on public.livros
  for update to authenticated
  using (exists (select 1 from public.perfis where id = auth.uid() and role = 'admin'));

-- registros_leitura (progresso coletivo: todos veem, cada um só grava o seu)
create policy "registros_select_autenticados" on public.registros_leitura
  for select to authenticated using (true);
create policy "registros_insert_proprio" on public.registros_leitura
  for insert to authenticated with check (auth.uid() = membro_id);

-- sessoes_pomodoro (privado por membro, não precisa ser público)
create policy "pomodoro_select_proprio" on public.sessoes_pomodoro
  for select to authenticated using (auth.uid() = membro_id);
create policy "pomodoro_insert_proprio" on public.sessoes_pomodoro
  for insert to authenticated with check (auth.uid() = membro_id);
create policy "pomodoro_update_proprio" on public.sessoes_pomodoro
  for update to authenticated using (auth.uid() = membro_id);

-- metas (cada um vê/edita a sua; admin vê todas para sugerir meta)
create policy "metas_select_proprio_ou_admin" on public.metas
  for select to authenticated
  using (auth.uid() = membro_id or exists (select 1 from public.perfis where id = auth.uid() and role = 'admin'));
create policy "metas_insert_proprio" on public.metas
  for insert to authenticated with check (auth.uid() = membro_id);
create policy "metas_update_proprio" on public.metas
  for update to authenticated using (auth.uid() = membro_id);

-- conquistas (catálogo: leitura livre, escrita só admin)
create policy "conquistas_select_autenticados" on public.conquistas
  for select to authenticated using (true);
create policy "conquistas_insert_admin" on public.conquistas
  for insert to authenticated
  with check (exists (select 1 from public.perfis where id = auth.uid() and role = 'admin'));

-- membro_conquistas (visível a todos; concedido só por função de servidor, ver README)
create policy "membro_conquistas_select_autenticados" on public.membro_conquistas
  for select to authenticated using (true);
-- Nenhuma policy de insert aqui de propósito: conquistas são concedidas por uma
-- Netlify Function com a service_role key, checando as regras de cada gatilho,
-- nunca inseridas direto pelo cliente (evita o próprio membro se autoconceder conquista).
