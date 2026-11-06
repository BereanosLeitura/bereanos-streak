-- 0015: quem terminou cada livro e quem deixou de lado.
-- Permite encerrar o ciclo marcando quem terminou (inclusive fora do app)
-- e deixar o livro como "leitura pendente" para quem ainda está lendo.

create table if not exists public.leituras_status (
  livro_id uuid not null references public.livros(id) on delete cascade,
  membro_id uuid not null references public.perfis(id) on delete cascade,
  status text not null check (status in ('terminou', 'deixou')),
  marcado_por uuid references public.perfis(id) on delete set null,
  atualizado_em timestamptz not null default now(),
  primary key (livro_id, membro_id)
);

alter table public.leituras_status enable row level security;

-- todos do clube veem (para o "terminaram" do grupo)
drop policy if exists "leituras_status_select" on public.leituras_status;
create policy "leituras_status_select" on public.leituras_status
  for select to authenticated using (true);

-- cada membro marca o próprio; o admin marca qualquer um
drop policy if exists "leituras_status_insert" on public.leituras_status;
create policy "leituras_status_insert" on public.leituras_status
  for insert to authenticated
  with check (membro_id = auth.uid() or public.eh_admin(auth.uid()));

drop policy if exists "leituras_status_update" on public.leituras_status;
create policy "leituras_status_update" on public.leituras_status
  for update to authenticated
  using (membro_id = auth.uid() or public.eh_admin(auth.uid()))
  with check (membro_id = auth.uid() or public.eh_admin(auth.uid()));

drop policy if exists "leituras_status_delete" on public.leituras_status;
create policy "leituras_status_delete" on public.leituras_status
  for delete to authenticated
  using (membro_id = auth.uid() or public.eh_admin(auth.uid()));
