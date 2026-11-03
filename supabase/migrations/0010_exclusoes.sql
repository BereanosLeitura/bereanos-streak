-- 0010: exclusões controladas.
-- 1) O admin pode excluir um ciclo (livro) lançado por engano. Registros,
--    sessões, metas e anotações do livro já saem junto (on delete cascade);
--    as conquistas ligadas ao livro passam a sair junto também.
-- 2) O admin pode tirar do mural uma anotação compartilhada (moderação).
--    Anotações privadas continuam invisíveis e intocáveis para o admin.
-- 3) O admin pode apagar a capa do Storage ao excluir o livro.

create policy "livros_delete_admin" on public.livros
  for delete to authenticated
  using (exists (select 1 from public.perfis where id = auth.uid() and role = 'admin'));

alter table public.membro_conquistas
  drop constraint if exists membro_conquistas_livro_id_fkey;
alter table public.membro_conquistas
  add constraint membro_conquistas_livro_id_fkey
  foreign key (livro_id) references public.livros(id) on delete cascade;

create policy "anotacoes_delete_admin_mural" on public.anotacoes
  for delete to authenticated
  using (
    compartilhada = true
    and exists (select 1 from public.perfis where id = auth.uid() and role = 'admin')
  );

create policy "capas_delete_admin"
on storage.objects for delete to authenticated
using (
  bucket_id = 'capas-livros'
  and exists (select 1 from public.perfis where id = auth.uid() and role = 'admin')
);
