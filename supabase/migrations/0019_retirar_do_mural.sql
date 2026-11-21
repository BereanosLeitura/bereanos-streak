-- 0019: "Retirar do mural" passa a só tirar do mural.
--
-- O que muda: até aqui, quando o admin tocava em "Retirar do mural" numa
-- anotação de outro membro, o app APAGAVA a anotação (política da 0010).
-- O membro perdia o texto do próprio caderno, embora o botão prometesse só
-- tirar do mural. Com esta função, a anotação volta a ser privada do autor
-- (compartilhada = false) e continua no caderno dele.
--
-- Segurança: a função confere se quem chama é admin e só mexe na coluna
-- compartilhada, de uma anotação que esteja no mural. Não dá ao admin acesso
-- a anotações privadas nem permissão para editar o texto de ninguém.
--
-- Risco: baixo. Só cria uma função. Pode rodar com o app no ar. Rode ANTES de
-- publicar o app novo: sem ela, "Retirar do mural" mostra "Não foi possível".
--
-- Para desfazer:
--   drop function if exists public.retirar_do_mural(uuid);

create or replace function public.retirar_do_mural(anotacao uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_admin(auth.uid()) then
    raise exception 'Somente o admin pode retirar anotações do mural';
  end if;
  update public.anotacoes set compartilhada = false
   where id = anotacao and compartilhada = true;
end;
$$;

revoke all on function public.retirar_do_mural(uuid) from public, anon;
grant execute on function public.retirar_do_mural(uuid) to authenticated;
