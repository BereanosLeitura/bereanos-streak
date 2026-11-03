-- Bucket de capas de livro, enviadas pelo admin ao cadastrar manualmente.
-- Rodar depois de 0001_init.sql.

insert into storage.buckets (id, name, public)
values ('capas-livros', 'capas-livros', true)
on conflict (id) do nothing;

-- Leitura pública (a capa aparece pra todo mundo, inclusive sem login, já que
-- vira parte da imagem de compartilhamento no WhatsApp).
create policy "capas_leitura_publica"
on storage.objects for select
using (bucket_id = 'capas-livros');

-- Só admin envia/substitui capa.
create policy "capas_upload_admin"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'capas-livros'
  and exists (select 1 from public.perfis where id = auth.uid() and role = 'admin')
);

create policy "capas_update_admin"
on storage.objects for update to authenticated
using (
  bucket_id = 'capas-livros'
  and exists (select 1 from public.perfis where id = auth.uid() and role = 'admin')
);
