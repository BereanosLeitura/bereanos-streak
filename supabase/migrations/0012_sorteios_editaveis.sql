-- 0012: o admin pode apagar registros do histórico de sorteios.
create policy "sorteios_delete_admin" on public.sorteios
  for delete to authenticated using (public.eh_admin(auth.uid()));
