-- 0006: anotações de leitura + permissão para apagar o próprio registro.

-- 1) Cada membro pode apagar um registro de leitura seu (corrigir um lançamento errado).
create policy "registros_delete_proprio" on public.registros_leitura
  for delete to authenticated using (auth.uid() = membro_id);

-- 2) Anotações: trecho marcado, reflexão ou pergunta, ligada a uma página.
--    Privada por padrão; o membro decide se compartilha com o grupo (mural).
create table if not exists public.anotacoes (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null references public.perfis(id) on delete cascade,
  livro_id uuid not null references public.livros(id) on delete cascade,
  pagina integer check (pagina is null or pagina > 0),
  tipo text not null default 'reflexao' check (tipo in ('trecho', 'reflexao', 'pergunta')),
  texto text not null check (char_length(texto) between 1 and 2000),
  compartilhada boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists anotacoes_livro_idx on public.anotacoes (livro_id, created_at desc);

alter table public.anotacoes enable row level security;

create policy "anotacoes_select_proprias_ou_compartilhadas" on public.anotacoes
  for select to authenticated using (auth.uid() = membro_id or compartilhada = true);
create policy "anotacoes_insert_propria" on public.anotacoes
  for insert to authenticated with check (auth.uid() = membro_id);
create policy "anotacoes_update_propria" on public.anotacoes
  for update to authenticated using (auth.uid() = membro_id) with check (auth.uid() = membro_id);
create policy "anotacoes_delete_propria" on public.anotacoes
  for delete to authenticated using (auth.uid() = membro_id);
