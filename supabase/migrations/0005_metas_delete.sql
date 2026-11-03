-- A migração 0001 criou select/insert/update em "metas", mas não delete.
-- A tela de Metas tem um botão "remover" que precisa disso.
create policy "metas_delete_proprio" on public.metas
  for delete to authenticated using (auth.uid() = membro_id);
