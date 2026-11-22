-- 0021: sobre o livro, foto de perfil e reações no mural.
--
-- 1) Sobre o livro: sinopse, descrição e texto sobre o autor, mostrados no
--    botão (i) do Início. O admin escreve ou preenche a partir do Google
--    Books (pelo ISBN tirado do link da Amazon, ou pelo título) e da
--    Wikipédia; a coluna fonte_info guarda de onde veio cada texto.
--
-- 2) Foto de perfil: bucket "avatares", público pelo link (a foto aparece no
--    grupo e no mural). Cada pessoa só envia, troca ou apaga arquivos dentro
--    da própria pasta (avatares/<id do usuário>/...). Ninguém lista o bucket.
--
-- 3) Reações no mural: "Me ajudou" e "Levar ao encontro". Quem vê a anotação
--    vê as reações; cada um só marca e desmarca as próprias; só dá para
--    reagir a anotação que está no mural. Sem ranking.
--
-- Risco: baixo. Só cria colunas, bucket, tabela e políticas novas. Nada é
-- apagado. Pode rodar com o app no ar e mais de uma vez.
--
-- Para desfazer:
--   alter table public.livros drop column if exists sinopse, drop column if exists sobre_autor, drop column if exists fonte_info;
--   drop table if exists public.reacoes_mural;
--   (o bucket "avatares" pode ser apagado no painel Storage)

-- 1) sobre o livro
alter table public.livros add column if not exists sinopse text check (sinopse is null or char_length(sinopse) <= 6000);
alter table public.livros add column if not exists sobre_autor text check (sobre_autor is null or char_length(sobre_autor) <= 6000);
alter table public.livros add column if not exists fonte_info text check (fonte_info is null or char_length(fonte_info) <= 500);

-- 2) fotos de perfil
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "avatares_envio_proprio" on storage.objects;
create policy "avatares_envio_proprio" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatares_troca_propria" on storage.objects;
create policy "avatares_troca_propria" on storage.objects for update to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatares_apaga_propria" on storage.objects;
create policy "avatares_apaga_propria" on storage.objects for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
-- leitura de cada arquivo é pelo link público; sem policy de select ninguém lista o bucket

-- 3) reações no mural
create table if not exists public.reacoes_mural (
  anotacao_id uuid not null references public.anotacoes(id) on delete cascade,
  membro_id uuid not null references public.perfis(id) on delete cascade,
  tipo text not null check (tipo in ('ajudou', 'encontro')),
  created_at timestamptz not null default now(),
  primary key (anotacao_id, membro_id, tipo)
);
create index if not exists reacoes_mural_anotacao_idx on public.reacoes_mural (anotacao_id);
alter table public.reacoes_mural enable row level security;

drop policy if exists "reacoes_select" on public.reacoes_mural;
create policy "reacoes_select" on public.reacoes_mural for select to authenticated
  using (exists (select 1 from public.anotacoes a where a.id = anotacao_id and (a.compartilhada or a.membro_id = auth.uid())));
drop policy if exists "reacoes_insert" on public.reacoes_mural;
create policy "reacoes_insert" on public.reacoes_mural for insert to authenticated
  with check (membro_id = auth.uid() and exists (select 1 from public.anotacoes a where a.id = anotacao_id and a.compartilhada));
drop policy if exists "reacoes_delete" on public.reacoes_mural;
create policy "reacoes_delete" on public.reacoes_mural for delete to authenticated
  using (membro_id = auth.uid());

-- reações ao vivo, como o mural (0020)
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reacoes_mural') then
    alter publication supabase_realtime add table public.reacoes_mural;
  end if;
end $$;
