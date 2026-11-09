-- 0016: correções da auditoria (avisos do Security Advisor do Supabase e
-- reforços de permissão). Nenhum dado é apagado ou alterado.
-- Pode rodar mais de uma vez sem problema.

-- 1) Função de updated_at com search_path fixo (aviso "Function Search Path Mutable").
alter function public.set_updated_at() set search_path = public;

-- 2) Bucket de capas: as capas continuam públicas pelo link (o bucket é público),
--    mas ninguém mais consegue LISTAR todos os arquivos do bucket.
--    O admin mantém a leitura, necessária para substituir e remover capas.
drop policy if exists "capas_leitura_publica" on storage.objects;
drop policy if exists "capas_select_admin" on storage.objects;
create policy "capas_select_admin"
on storage.objects for select to authenticated
using (bucket_id = 'capas-livros' and public.eh_admin(auth.uid()));

-- 3) eh_admin: quem não está logado não precisa (e não deve) consultar quem é admin.
--    Os membros logados continuam com acesso, porque as políticas RLS usam essa função.
revoke execute on function public.eh_admin(uuid) from public, anon;
grant execute on function public.eh_admin(uuid) to authenticated;

-- 4) rls_auto_enable (criada pelo painel do Supabase): não é chamada pelo app.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'rls_auto_enable') then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

-- 5) Encontro: o anotador do dia edita só o que é dele (roteiro, perguntas
--    discutidas e ata). Data, local, mediador, livro e quem anota continuam
--    sendo do admin. Antes, a política deixava o anotador mudar a linha inteira.
create or replace function public.proteger_encontro()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.eh_admin(auth.uid()) then
    if new.livro_id is distinct from old.livro_id
       or new.data is distinct from old.data
       or new.local is distinct from old.local
       or new.mediador is distinct from old.mediador
       or new.anotador_id is distinct from old.anotador_id
       or new.created_by is distinct from old.created_by then
      raise exception 'Somente o admin pode mudar data, local, mediação e quem anota o encontro';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.proteger_encontro() from public, anon, authenticated;
drop trigger if exists trg_proteger_encontro on public.encontros;
create trigger trg_proteger_encontro before update on public.encontros
  for each row execute function public.proteger_encontro();

-- 6) Índices para as consultas mais frequentes do app (o clube é pequeno hoje,
--    mas assim as telas continuam rápidas quando o histórico crescer).
create index if not exists registros_membro_idx on public.registros_leitura (membro_id, registrado_em desc);
create index if not exists registros_livro_idx on public.registros_leitura (livro_id, registrado_em desc);
create index if not exists pomodoro_membro_idx on public.sessoes_pomodoro (membro_id, inicio desc);
create index if not exists metas_membro_idx on public.metas (membro_id, livro_id);
create index if not exists anotacoes_membro_idx on public.anotacoes (membro_id, livro_id);
create index if not exists anotacoes_mural_idx on public.anotacoes (livro_id, created_at desc) where compartilhada;
create index if not exists membro_conquistas_membro_idx on public.membro_conquistas (membro_id, conquistado_em desc);
create index if not exists presencas_encontro_idx on public.presencas (encontro_id);
create index if not exists leituras_status_membro_idx on public.leituras_status (membro_id);
